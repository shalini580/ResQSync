#include "bankers_algorithm.h"
#include <stdio.h>
#include <string.h>

void init_default_banker(BankerData *b) {
    b->num_processes = 5;
    b->num_resources = 4;

    snprintf(b->resource_names[0], sizeof(b->resource_names[0]), "Food (Rations)");
    snprintf(b->resource_names[1], sizeof(b->resource_names[1]), "Water (Crates)");
    snprintf(b->resource_names[2], sizeof(b->resource_names[2]), "Medicine (Kits)");
    snprintf(b->resource_names[3], sizeof(b->resource_names[3]), "Vehicles (Vans)");

    b->available[0] = 320;
    b->available[1] = 450;
    b->available[2] = 140;
    b->available[3] = 18;

    snprintf(b->process_names[0], sizeof(b->process_names[0]), "P101 (Sector 4 Flood)");
    b->allocation[0][0] = 60; b->allocation[0][1] = 80; b->allocation[0][2] = 25; b->allocation[0][3] = 4;
    b->max[0][0] = 120;       b->max[0][1] = 150;       b->max[0][2] = 40;        b->max[0][3] = 6;

    snprintf(b->process_names[1], sizeof(b->process_names[1]), "P102 (Chemical Fire Block)");
    b->allocation[1][0] = 20; b->allocation[1][1] = 40; b->allocation[1][2] = 30; b->allocation[1][3] = 3;
    b->max[1][0] = 50;        b->max[1][1] = 80;        b->max[1][2] = 60;        b->max[1][3] = 5;

    snprintf(b->process_names[2], sizeof(b->process_names[2]), "P103 (Tremor Collapse)");
    b->allocation[2][0] = 50; b->allocation[2][1] = 60; b->allocation[2][2] = 20; b->allocation[2][3] = 2;
    b->max[2][0] = 100;       b->max[2][1] = 120;       b->max[2][2] = 45;        b->max[2][3] = 4;

    snprintf(b->process_names[3], sizeof(b->process_names[3]), "P104 (Heatstroke Clinic)");
    b->allocation[3][0] = 30; b->allocation[3][1] = 70; b->allocation[3][2] = 40; b->allocation[3][3] = 2;
    b->max[3][0] = 70;        b->max[3][1] = 110;       b->max[3][2] = 50;        b->max[3][3] = 3;

    snprintf(b->process_names[4], sizeof(b->process_names[4]), "P105 (East Relief Camp)");
    b->allocation[4][0] = 40; b->allocation[4][1] = 50; b->allocation[4][2] = 10; b->allocation[4][3] = 1;
    b->max[4][0] = 80;        b->max[4][1] = 90;        b->max[4][2] = 25;        b->max[4][3] = 3;

    for (int i = 0; i < b->num_processes; i++) {
        for (int j = 0; j < b->num_resources; j++) {
            b->need[i][j] = b->max[i][j] - b->allocation[i][j];
            if (b->need[i][j] < 0) b->need[i][j] = 0;
        }
    }
}

int check_banker_safety(BankerData *b, char safe_seq[][64], int *seq_len, char *reason, size_t r_size) {
    int work[MAX_RESOURCES];
    bool finish[MAX_PROCESSES] = {false};
    int p = b->num_processes;
    int m = b->num_resources;

    for (int j = 0; j < m; j++) {
        work[j] = b->available[j];
    }

    int count = 0;
    while (count < p) {
        bool found = false;
        for (int i = 0; i < p; i++) {
            if (!finish[i]) {
                bool can_allocate = true;
                for (int j = 0; j < m; j++) {
                    if (b->need[i][j] > work[j]) {
                        can_allocate = false;
                        break;
                    }
                }
                if (can_allocate) {
                    for (int j = 0; j < m; j++) {
                        work[j] += b->allocation[i][j];
                    }
                    snprintf(safe_seq[count], sizeof(safe_seq[count]), "%s", b->process_names[i]);
                    count++;
                    finish[i] = true;
                    found = true;
                }
            }
        }
        if (!found) break;
    }

    *seq_len = count;
    if (count == p) {
        snprintf(reason, r_size, "SAFE STATE VERIFIED: System found a valid total execution sequence <%s>. All requests can be satisfied without circular wait.", safe_seq[0]);
        return 1;
    } else {
        snprintf(reason, r_size, "DEADLOCK RISK / UNSAFE STATE: Available resources [%d, %d, %d, %d] cannot satisfy the pending Need matrix of unfinished processes.",
                 b->available[0], b->available[1], b->available[2], b->available[3]);
        return 0;
    }
}

int banker_resource_request(BankerData *b, int proc_idx, int request[], char *reason, size_t r_size) {
    for (int j = 0; j < b->num_resources; j++) {
        if (request[j] > b->need[proc_idx][j]) {
            snprintf(reason, r_size, "ERROR: Process P%d exceeded its maximum declared claim (Request %d > Need %d for resource %s).",
                     proc_idx, request[j], b->need[proc_idx][j], b->resource_names[j]);
            return -1;
        }
    }

    for (int j = 0; j < b->num_resources; j++) {
        if (request[j] > b->available[j]) {
            snprintf(reason, r_size, "PROCESS BLOCKED (STATE_WAITING): Insufficient available units (Requested %d > Available %d for %s). Process must wait.",
                     request[j], b->available[j], b->resource_names[j]);
            return 0;
        }
    }

    // Pretend allocation
    for (int j = 0; j < b->num_resources; j++) {
        b->available[j] -= request[j];
        b->allocation[proc_idx][j] += request[j];
        b->need[proc_idx][j] -= request[j];
    }

    char safe_seq[MAX_PROCESSES][64];
    int seq_len = 0;
    char safety_reason[256];
    int is_safe = check_banker_safety(b, safe_seq, &seq_len, safety_reason, sizeof(safety_reason));

    if (is_safe) {
        snprintf(reason, r_size, "REQUEST GRANTED ATOMICALLY: Safe state maintained. Resources allocated to P%d.", proc_idx);
        return 1;
    } else {
        // Rollback
        for (int j = 0; j < b->num_resources; j++) {
            b->available[j] += request[j];
            b->allocation[proc_idx][j] -= request[j];
            b->need[proc_idx][j] += request[j];
        }
        snprintf(reason, r_size, "REQUEST DENIED: Allocating would leave system in unsafe state (deadlock vulnerable). Rollback executed.");
        return 0;
    }
}
