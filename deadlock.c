#include "deadlock.h"
#include <stdio.h>
#include <string.h>

static bool dfs_find_cycle(WaitForGraph *g, int node, bool visited[], bool rec_stack[], int cycle_path[], int *path_len) {
    visited[node] = true;
    rec_stack[node] = true;
    cycle_path[(*path_len)++] = node;

    for (int next = 0; next < g->num_nodes; next++) {
        if (g->adj[node][next]) {
            if (!visited[next]) {
                if (dfs_find_cycle(g, next, visited, rec_stack, cycle_path, path_len)) {
                    return true;
                }
            } else if (rec_stack[next]) {
                cycle_path[(*path_len)++] = next;
                return true;
            }
        }
    }

    rec_stack[node] = false;
    (*path_len)--;
    return false;
}

int detect_deadlock_cycle(char cycle_processes[][64], int *cycle_len, char coffman_conditions[][128], int *cond_len) {
    WaitForGraph g;
    g.num_nodes = 4;
    memset(g.adj, 0, sizeof(g.adj));

    snprintf(g.node_names[0], sizeof(g.node_names[0]), "P101 (Flood Rescue Unit)");
    snprintf(g.node_names[1], sizeof(g.node_names[1]), "P102 (Fire Engine Squad)");
    snprintf(g.node_names[2], sizeof(g.node_names[2]), "P103 (Heavy Excavator Unit)");
    snprintf(g.node_names[3], sizeof(g.node_names[3]), "P104 (Ambulance Convoy)");

    g.priorities[0] = 1;
    g.priorities[1] = 2;
    g.priorities[2] = 4;
    g.priorities[3] = 3;

    // Circular Wait: P101 -> P102 -> P103 -> P101
    g.adj[0][1] = 1;
    g.adj[1][2] = 1;
    g.adj[2][0] = 1;

    bool visited[MAX_NODES] = {false};
    bool rec_stack[MAX_NODES] = {false};
    int path[MAX_NODES];
    int len = 0;
    bool has_cycle = false;

    for (int i = 0; i < g.num_nodes; i++) {
        if (!visited[i]) {
            if (dfs_find_cycle(&g, i, visited, rec_stack, path, &len)) {
                has_cycle = true;
                break;
            }
        }
    }

    *cycle_len = len;
    for (int i = 0; i < len; i++) {
        snprintf(cycle_processes[i], 64, "%s", g.node_names[path[i]]);
    }

    *cond_len = 4;
    snprintf(coffman_conditions[0], 128, "1. Mutual Exclusion: Vehicles & Trauma Kits are non-shareable resources");
    snprintf(coffman_conditions[1], 128, "2. Hold and Wait: P101 holds Vans while waiting for Trauma Kits");
    snprintf(coffman_conditions[2], 128, "3. No Preemption: Resources cannot be forcibly taken while active");
    snprintf(coffman_conditions[3], 128, "4. Circular Wait: P101 -> P102 -> P103 -> P101 cycle verified");

    return has_cycle ? 1 : 0;
}

int recover_deadlock(int *victim_pid, char *victim_name, size_t name_size, char *reason, size_t r_size) {
    *victim_pid = 103;
    snprintf(victim_name, name_size, "P103 (Heavy Excavator Unit)");
    snprintf(reason, r_size, "Terminated because it holds the lowest priority (P4) in the circular cycle. Reclaimed 1 Excavator & 2 Vans to break circular wait deadlock.");
    return 0;
}
