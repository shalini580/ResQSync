#ifndef RESQSYNC_BANKERS_ALGORITHM_H
#define RESQSYNC_BANKERS_ALGORITHM_H

#include <stddef.h>
#include <stdbool.h>

#define MAX_PROCESSES 16
#define MAX_RESOURCES 4

typedef struct {
    int num_processes;
    int num_resources;
    char resource_names[MAX_RESOURCES][32];
    int available[MAX_RESOURCES];
    int max[MAX_PROCESSES][MAX_RESOURCES];
    int allocation[MAX_PROCESSES][MAX_RESOURCES];
    int need[MAX_PROCESSES][MAX_RESOURCES];
    char process_names[MAX_PROCESSES][64];
} BankerData;

/* Dijkstra's Banker's Algorithm Prototypes */
void init_default_banker(BankerData *b);
int check_banker_safety(BankerData *b, char safe_seq[][64], int *seq_len, char *reason, size_t r_size);
int banker_resource_request(BankerData *b, int proc_idx, int request[], char *reason, size_t r_size);

#endif /* RESQSYNC_BANKERS_ALGORITHM_H */
