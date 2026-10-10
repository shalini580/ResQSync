#ifndef RESQSYNC_DEADLOCK_H
#define RESQSYNC_DEADLOCK_H

#include <stddef.h>
#include <stdbool.h>

#define MAX_NODES 16

typedef struct {
    int num_nodes;
    int adj[MAX_NODES][MAX_NODES];
    char node_names[MAX_NODES][64];
    int priorities[MAX_NODES];
} WaitForGraph;

/* Deadlock Detection and Recovery Prototypes */
int detect_deadlock_cycle(char cycle_processes[][64], int *cycle_len, char coffman_conditions[][128], int *cond_len);
int recover_deadlock(int *victim_pid, char *victim_name, size_t name_size, char *reason, size_t r_size);

#endif /* RESQSYNC_DEADLOCK_H */
