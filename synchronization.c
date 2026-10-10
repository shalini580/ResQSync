#ifndef _GNU_SOURCE
#define _GNU_SOURCE
#endif
#ifndef _DEFAULT_SOURCE
#define _DEFAULT_SOURCE
#endif
#include <unistd.h>
#include "synchronization.h"
#include <stdio.h>
#include <string.h>
#include <pthread.h>
#include <semaphore.h>

static pthread_mutex_t g_mission_mutex = PTHREAD_MUTEX_INITIALIZER;
static sem_t g_counting_semaphore;
static int g_shared_counter = 1;
static char g_claimed_by[64] = "None";

typedef struct {
    SyncWorkerResult *res;
} InternalThreadArg;

void *worker_routine(void *arg) {
    InternalThreadArg *targ = (InternalThreadArg *)arg;
    SyncWorkerResult *w = targ->res;

    if (w->sync_mode == SYNC_MODE_MUTEX) {
        pthread_mutex_lock(&g_mission_mutex);
        if (g_shared_counter > 0) {
            usleep(15000); // Critical section
            g_shared_counter--;
            snprintf(g_claimed_by, sizeof(g_claimed_by), "%s", w->thread_name);
            w->acquired = true;
            snprintf(w->outcome, sizeof(w->outcome), "ACQUIRED: Critical section secured via pthread_mutex_lock()");
        } else {
            w->acquired = false;
            snprintf(w->outcome, sizeof(w->outcome), "MUTEX_BLOCKED: Resource busy (held exclusively by %s)", g_claimed_by);
        }
        pthread_mutex_unlock(&g_mission_mutex);
    } else if (w->sync_mode == SYNC_MODE_SEMAPHORE) {
        if (sem_trywait(&g_counting_semaphore) == 0) {
            usleep(15000);
            w->acquired = true;
            snprintf(w->outcome, sizeof(w->outcome), "SEMAPHORE_GRANTED: Counting token acquired via sem_wait()");
        } else {
            w->acquired = false;
            snprintf(w->outcome, sizeof(w->outcome), "SEMAPHORE_WAIT: Value=0. All counting fleet tokens allocated.");
        }
    } else {
        // Race condition
        int current = g_shared_counter;
        usleep(15000);
        if (current > 0) {
            g_shared_counter = current - 1;
            snprintf(g_claimed_by, sizeof(g_claimed_by), "%s", w->thread_name);
            w->acquired = true;
            snprintf(w->outcome, sizeof(w->outcome), "CONFLICT/RACE: Double-allocated! Unsynchronized critical section collision.");
        } else {
            w->acquired = false;
            snprintf(w->outcome, sizeof(w->outcome), "REJECTED: Value was 0.");
        }
    }
    return NULL;
}

int run_sync_simulation(int sync_mode, SyncWorkerResult *res1, SyncWorkerResult *res2, char *last_owner, size_t owner_size) {
    g_shared_counter = 1;
    snprintf(g_claimed_by, sizeof(g_claimed_by), "None");
    sem_init(&g_counting_semaphore, 0, 1);

    snprintf(res1->thread_name, sizeof(res1->thread_name), "Thread-1 (Responder Alex Rivera)");
    res1->sync_mode = sync_mode;
    res1->acquired = false;

    snprintf(res2->thread_name, sizeof(res2->thread_name), "Thread-2 (Responder Priya Sharma)");
    res2->sync_mode = sync_mode;
    res2->acquired = false;

    pthread_t t1, t2;
    InternalThreadArg arg1 = { res1 };
    InternalThreadArg arg2 = { res2 };

    pthread_create(&t1, NULL, worker_routine, &arg1);
    pthread_create(&t2, NULL, worker_routine, &arg2);

    pthread_join(t1, NULL);
    pthread_join(t2, NULL);

    sem_destroy(&g_counting_semaphore);
    snprintf(last_owner, owner_size, "%s", g_claimed_by);
    return 0;
}
