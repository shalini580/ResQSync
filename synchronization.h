#ifndef RESQSYNC_SYNCHRONIZATION_H
#define RESQSYNC_SYNCHRONIZATION_H

#include <stddef.h>
#include <stdbool.h>

#define SYNC_MODE_RACE      0
#define SYNC_MODE_MUTEX     1
#define SYNC_MODE_SEMAPHORE 2

typedef struct {
    char thread_name[48];
    int sync_mode;
    bool acquired;
    char outcome[128];
} SyncWorkerResult;

/* Simulates two competing worker threads with Mutex, Semaphore, or Race interleaving */
int run_sync_simulation(int sync_mode, SyncWorkerResult *res1, SyncWorkerResult *res2, char *last_owner, size_t owner_size);

#endif /* RESQSYNC_SYNCHRONIZATION_H */
