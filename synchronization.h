#ifndef RES_SYNCHRONIZATION_H
#define RES_SYNCHRONIZATION_H

#include <pthread.h>

/*
 * Counting semaphore built from a mutex + condition variable.
 * (macOS doesn't support unnamed POSIX semaphores, so we make our own -
 *  it also shows exactly how wait()/signal() work.)
 */
typedef struct {
    int resValue;
    pthread_mutex_t resLock;
    pthread_cond_t resCond;
} resSemaphore;

void resSemInit(resSemaphore *resSem, int resValue);
void resSemWait(resSemaphore *resSem);    /* P / down */
void resSemSignal(resSemaphore *resSem);  /* V / up   */
void resSemDestroy(resSemaphore *resSem);

/* race condition demo: many threads take stock with and without a mutex */
void resRunMutexDemo(int resThreads, int resIterations);

/* bounded buffer producer-consumer with two semaphores + a mutex */
void resRunProducerConsumer(int resProducers, int resConsumers, int resItems, int resBufferSize);

#endif
