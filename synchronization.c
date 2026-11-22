/*
 * synchronization.c - mutex and semaphore demos with real pthreads.
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sched.h>
#include <time.h>
#include "synchronization.h"
#include "pcb.h"

/* ---------------------------------------------------------------- semaphore */

void resSemInit(resSemaphore *resSem, int resValue) {
    resSem->resValue = resValue;
    pthread_mutex_init(&resSem->resLock, NULL);
    pthread_cond_init(&resSem->resCond, NULL);
}

void resSemWait(resSemaphore *resSem) {
    pthread_mutex_lock(&resSem->resLock);
    while (resSem->resValue == 0) {
        pthread_cond_wait(&resSem->resCond, &resSem->resLock);  /* sleeps, no busy waiting */
    }
    resSem->resValue--;
    pthread_mutex_unlock(&resSem->resLock);
}

void resSemSignal(resSemaphore *resSem) {
    pthread_mutex_lock(&resSem->resLock);
    resSem->resValue++;
    pthread_cond_signal(&resSem->resCond);
    pthread_mutex_unlock(&resSem->resLock);
}

void resSemDestroy(resSemaphore *resSem) {
    pthread_mutex_destroy(&resSem->resLock);
    pthread_cond_destroy(&resSem->resCond);
}

static void resTinySleep(long resNanos) {
    struct timespec resTs = {0, resNanos};
    nanosleep(&resTs, NULL);
}

static double resNowMs(void) {
    struct timespec resTs;
    clock_gettime(CLOCK_MONOTONIC, &resTs);
    return resTs.tv_sec * 1000.0 + resTs.tv_nsec / 1e6;
}

/* ---------------------------------------------------------------- mutex demo */

static volatile int resStockUnsafe;
static int resStockSafe;
static pthread_mutex_t resStockLock = PTHREAD_MUTEX_INITIALIZER;
static int resIterationsPerThread;

/* read - think - write, with no lock. Two threads can read the same value. */
static void *resUnsafeWorker(void *resArg) {
    (void)resArg;
    for (int resI = 0; resI < resIterationsPerThread; resI++) {
        int resSeen = resStockUnsafe;
        if ((resI & 63) == 0) sched_yield();   /* give the other threads a chance to sneak in */
        resStockUnsafe = resSeen - 1;
    }
    return NULL;
}

/* same work, but the read-modify-write is a critical section */
static void *resSafeWorker(void *resArg) {
    (void)resArg;
    for (int resI = 0; resI < resIterationsPerThread; resI++) {
        pthread_mutex_lock(&resStockLock);
        int resSeen = resStockSafe;
        if ((resI & 63) == 0) sched_yield();
        resStockSafe = resSeen - 1;
        pthread_mutex_unlock(&resStockLock);
    }
    return NULL;
}

void resRunMutexDemo(int resThreads, int resIterations) {
    if (resThreads < 2) resThreads = 2;
    if (resThreads > 32) resThreads = 32;
    if (resIterations < 100) resIterations = 100;
    resIterationsPerThread = resIterations;

    int resStart = resThreads * resIterations;
    pthread_t resIds[32];

    resStockUnsafe = resStart;
    double resT0 = resNowMs();
    for (int resI = 0; resI < resThreads; resI++) pthread_create(&resIds[resI], NULL, resUnsafeWorker, NULL);
    for (int resI = 0; resI < resThreads; resI++) pthread_join(resIds[resI], NULL);
    double resUnsafeMs = resNowMs() - resT0;

    resStockSafe = resStart;
    resT0 = resNowMs();
    for (int resI = 0; resI < resThreads; resI++) pthread_create(&resIds[resI], NULL, resSafeWorker, NULL);
    for (int resI = 0; resI < resThreads; resI++) pthread_join(resIds[resI], NULL);
    double resSafeMs = resNowMs() - resT0;

    printf("{\"ok\":true,\"threads\":%d,\"iterations\":%d,\"startStock\":%d,\"expected\":0,"
           "\"withoutMutex\":{\"finalStock\":%d,\"lostUpdates\":%d,\"ms\":%.2f},"
           "\"withMutex\":{\"finalStock\":%d,\"lostUpdates\":%d,\"ms\":%.2f}}\n",
           resThreads, resIterations, resStart,
           resStockUnsafe, resStockUnsafe, resUnsafeMs,
           resStockSafe, resStockSafe, resSafeMs);
}

/* ---------------------------------------------------------------- producer / consumer */

#define RES_MAX_LOG 60

static int *resBuffer;
static int resBufSize, resIn, resOut, resCount, resMaxSeen;
static int resProduced, resConsumed, resItemsEach, resProducerCount;
static resSemaphore resEmpty, resFull;
static pthread_mutex_t resBufLock = PTHREAD_MUTEX_INITIALIZER;
static char resLog[RES_MAX_LOG][80];
static int resLogLen;

static void resLogLine(const char *resWho, const char *resWhat, int resItem) {
    if (resLogLen >= RES_MAX_LOG) return;
    snprintf(resLog[resLogLen++], 80, "%s %s item %d (buffer %d/%d)", resWho, resWhat, resItem, resCount, resBufSize);
}

static void *resProducer(void *resArg) {
    int resMe = *(int *)resArg;
    char resName[16];
    snprintf(resName, sizeof resName, "Producer-%d", resMe);
    for (int resI = 0; resI < resItemsEach; resI++) {
        int resItem = resMe * 1000 + resI;
        resSemWait(&resEmpty);                 /* wait for a free slot */
        pthread_mutex_lock(&resBufLock);
        resBuffer[resIn] = resItem;
        resIn = (resIn + 1) % resBufSize;
        resCount++;
        resProduced++;
        if (resCount > resMaxSeen) resMaxSeen = resCount;
        resLogLine(resName, "put", resItem);
        pthread_mutex_unlock(&resBufLock);
        resSemSignal(&resFull);                /* one more item ready */
        resTinySleep(200000);
    }
    return NULL;
}

static void *resConsumer(void *resArg) {
    int resMe = *(int *)resArg;
    char resName[16];
    snprintf(resName, sizeof resName, "Consumer-%d", resMe);
    for (;;) {
        resSemWait(&resFull);
        pthread_mutex_lock(&resBufLock);
        int resItem = resBuffer[resOut];
        if (resItem < 0) {                     /* poison pill = time to stop */
            pthread_mutex_unlock(&resBufLock);
            break;
        }
        resOut = (resOut + 1) % resBufSize;
        resCount--;
        resConsumed++;
        resLogLine(resName, "took", resItem);
        pthread_mutex_unlock(&resBufLock);
        resSemSignal(&resEmpty);
        resTinySleep(350000);
    }
    return NULL;
}

void resRunProducerConsumer(int resProducers, int resConsumers, int resItems, int resBufferSize) {
    if (resProducers < 1) resProducers = 1;
    if (resConsumers < 1) resConsumers = 1;
    if (resProducers > 8) resProducers = 8;
    if (resConsumers > 8) resConsumers = 8;
    if (resItems < 1) resItems = 5;
    if (resBufferSize < 1) resBufferSize = 4;

    resBufSize = resBufferSize;
    resBuffer = calloc((size_t)resBufSize, sizeof(int));
    resIn = resOut = resCount = resMaxSeen = resProduced = resConsumed = resLogLen = 0;
    resItemsEach = resItems;
    resProducerCount = resProducers;
    resSemInit(&resEmpty, resBufSize);
    resSemInit(&resFull, 0);

    pthread_t resP[8], resC[8];
    int resPId[8], resCId[8];
    for (int resI = 0; resI < resProducers; resI++) { resPId[resI] = resI + 1; pthread_create(&resP[resI], NULL, resProducer, &resPId[resI]); }
    for (int resI = 0; resI < resConsumers; resI++) { resCId[resI] = resI + 1; pthread_create(&resC[resI], NULL, resConsumer, &resCId[resI]); }
    for (int resI = 0; resI < resProducers; resI++) pthread_join(resP[resI], NULL);

    /* all items are made - wait till the buffer is drained, then send one stop signal per consumer */
    for (;;) {
        pthread_mutex_lock(&resBufLock);
        int resLeft = resCount;
        pthread_mutex_unlock(&resBufLock);
        if (resLeft == 0) break;
        resTinySleep(1000000);
    }
    for (int resI = 0; resI < resConsumers; resI++) {
        pthread_mutex_lock(&resBufLock);
        resBuffer[resIn] = -1;
        pthread_mutex_unlock(&resBufLock);
        resSemSignal(&resFull);
        /* the pill is read in place (resOut is not moved), so the next pill reuses the slot */
    }
    for (int resI = 0; resI < resConsumers; resI++) pthread_join(resC[resI], NULL);

    printf("{\"ok\":true,\"producers\":%d,\"consumers\":%d,\"bufferSize\":%d,\"produced\":%d,\"consumed\":%d,"
           "\"maxInBuffer\":%d,\"neverOverflowed\":%s,\"log\":[",
           resProducers, resConsumers, resBufSize, resProduced, resConsumed, resMaxSeen,
           resMaxSeen <= resBufSize ? "true" : "false");
    for (int resI = 0; resI < resLogLen; resI++) {
        if (resI) putchar(',');
        resJsonString(resLog[resI]);
    }
    printf("]}\n");

    resSemDestroy(&resEmpty);
    resSemDestroy(&resFull);
    free(resBuffer);
}
