#include "cpu_scheduler.h"
#include <stdio.h>
#include <stdbool.h>
#include <string.h>

/* 1. Preemptive Priority Scheduling */
void schedule_priority_preemptive(PCB *procs, int n, TimelineSlot *timeline, int *timeline_count, int *total_context_switches) {
    int time = 0, completed = 0, t_count = 0, cs_count = 0;
    int current_pid = -1, slot_start = 0;

    for (int i = 0; i < n; i++) {
        procs[i].remaining_time = procs[i].burst_time;
        procs[i].start_time = -1;
        procs[i].completion_time = 0;
        procs[i].waiting_time = 0;
        procs[i].turnaround_time = 0;
        procs[i].response_time = -1;
        procs[i].context_switches = 0;
        procs[i].state = STATE_READY;
    }

    while (completed < n && time < 150) {
        int highest_idx = -1;
        int highest_pri = 9999;

        for (int i = 0; i < n; i++) {
            if (procs[i].arrival_time <= time && procs[i].remaining_time > 0) {
                if (procs[i].priority < highest_pri) {
                    highest_pri = procs[i].priority;
                    highest_idx = i;
                }
            }
        }

        if (highest_idx == -1) {
            if (current_pid != -1 && t_count < MAX_TIMELINE) {
                timeline[t_count].pid = current_pid;
                timeline[t_count].start_time = slot_start;
                timeline[t_count].end_time = time;
                timeline[t_count].duration = time - slot_start;
                t_count++;
                current_pid = -1;
            }
            time++;
            continue;
        }

        if (procs[highest_idx].pid != current_pid) {
            if (current_pid != -1 && t_count < MAX_TIMELINE) {
                timeline[t_count].pid = current_pid;
                for (int k = 0; k < n; k++) {
                    if (procs[k].pid == current_pid) {
                        snprintf(timeline[t_count].entity, sizeof(timeline[t_count].entity), "%s", procs[k].name);
                        break;
                    }
                }
                timeline[t_count].start_time = slot_start;
                timeline[t_count].end_time = time;
                timeline[t_count].duration = time - slot_start;
                t_count++;
                cs_count++;
                for (int k = 0; k < n; k++) {
                    if (procs[k].pid == current_pid && procs[k].remaining_time > 0) {
                        procs[k].context_switches++;
                        procs[k].state = STATE_READY;
                        procs[k].cpu_registers.reg_pc += (time - slot_start) * 0x10;
                        break;
                    }
                }
            }
            current_pid = procs[highest_idx].pid;
            slot_start = time;
            if (procs[highest_idx].start_time == -1) {
                procs[highest_idx].start_time = time;
                procs[highest_idx].response_time = time - procs[highest_idx].arrival_time;
            }
            procs[highest_idx].state = STATE_RUNNING;
        }

        procs[highest_idx].remaining_time--;
        time++;

        if (procs[highest_idx].remaining_time == 0) {
            procs[highest_idx].completion_time = time;
            procs[highest_idx].turnaround_time = procs[highest_idx].completion_time - procs[highest_idx].arrival_time;
            procs[highest_idx].waiting_time = procs[highest_idx].turnaround_time - procs[highest_idx].burst_time;
            procs[highest_idx].state = STATE_TERMINATED;
            completed++;

            timeline[t_count].pid = current_pid;
            snprintf(timeline[t_count].entity, sizeof(timeline[t_count].entity), "%s", procs[highest_idx].name);
            timeline[t_count].start_time = slot_start;
            timeline[t_count].end_time = time;
            timeline[t_count].duration = time - slot_start;
            t_count++;
            current_pid = -1;
            slot_start = time;
        }
    }
    *timeline_count = t_count;
    *total_context_switches = cs_count;
}

/* 2. First-Come First-Served (FCFS) */
void schedule_fcfs(PCB *procs, int n, TimelineSlot *timeline, int *timeline_count, int *total_context_switches) {
    int time = 0, t_count = 0, cs_count = 0;

    for (int i = 0; i < n; i++) {
        procs[i].remaining_time = procs[i].burst_time;
    }

    // Sort by arrival time
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (procs[j].arrival_time > procs[j+1].arrival_time) {
                PCB temp = procs[j];
                procs[j] = procs[j+1];
                procs[j+1] = temp;
            }
        }
    }

    for (int i = 0; i < n; i++) {
        if (time < procs[i].arrival_time) {
            time = procs[i].arrival_time;
        }
        procs[i].start_time = time;
        procs[i].response_time = time - procs[i].arrival_time;
        procs[i].state = STATE_RUNNING;

        timeline[t_count].pid = procs[i].pid;
        snprintf(timeline[t_count].entity, sizeof(timeline[t_count].entity), "%s", procs[i].name);
        timeline[t_count].start_time = time;
        timeline[t_count].duration = procs[i].burst_time;
        timeline[t_count].end_time = time + procs[i].burst_time;
        t_count++;

        time += procs[i].burst_time;
        procs[i].remaining_time = 0;
        procs[i].completion_time = time;
        procs[i].turnaround_time = procs[i].completion_time - procs[i].arrival_time;
        procs[i].waiting_time = procs[i].turnaround_time - procs[i].burst_time;
        procs[i].state = STATE_TERMINATED;
        if (i > 0) cs_count++;
    }
    *timeline_count = t_count;
    *total_context_switches = cs_count;
}

/* 3. Shortest Job First (SJF Non-preemptive) */
void schedule_sjf(PCB *procs, int n, TimelineSlot *timeline, int *timeline_count, int *total_context_switches) {
    int time = 0, completed = 0, t_count = 0, cs_count = 0;
    bool is_completed[MAX_PROCESSES] = {false};

    for (int i = 0; i < n; i++) {
        procs[i].remaining_time = procs[i].burst_time;
    }

    while (completed < n) {
        int shortest_idx = -1;
        int min_burst = 99999;

        for (int i = 0; i < n; i++) {
            if (procs[i].arrival_time <= time && !is_completed[i]) {
                if (procs[i].burst_time < min_burst) {
                    min_burst = procs[i].burst_time;
                    shortest_idx = i;
                }
            }
        }

        if (shortest_idx == -1) {
            time++;
            continue;
        }

        procs[shortest_idx].start_time = time;
        procs[shortest_idx].response_time = time - procs[shortest_idx].arrival_time;
        procs[shortest_idx].state = STATE_RUNNING;

        timeline[t_count].pid = procs[shortest_idx].pid;
        snprintf(timeline[t_count].entity, sizeof(timeline[t_count].entity), "%s", procs[shortest_idx].name);
        timeline[t_count].start_time = time;
        timeline[t_count].duration = procs[shortest_idx].burst_time;
        timeline[t_count].end_time = time + procs[shortest_idx].burst_time;
        t_count++;

        time += procs[shortest_idx].burst_time;
        procs[shortest_idx].remaining_time = 0;
        procs[shortest_idx].completion_time = time;
        procs[shortest_idx].turnaround_time = procs[shortest_idx].completion_time - procs[shortest_idx].arrival_time;
        procs[shortest_idx].waiting_time = procs[shortest_idx].turnaround_time - procs[shortest_idx].burst_time;
        procs[shortest_idx].state = STATE_TERMINATED;
        is_completed[shortest_idx] = true;
        completed++;
        if (completed > 1) cs_count++;
    }
    *timeline_count = t_count;
    *total_context_switches = cs_count;
}

/* 4. Shortest Remaining Time First (SRTF Preemptive SJF) */
void schedule_srtf(PCB *procs, int n, TimelineSlot *timeline, int *timeline_count, int *total_context_switches) {
    int time = 0, completed = 0, t_count = 0, cs_count = 0;
    int current_pid = -1, slot_start = 0;

    for (int i = 0; i < n; i++) {
        procs[i].remaining_time = procs[i].burst_time;
        procs[i].start_time = -1;
    }

    while (completed < n && time < 150) {
        int shortest_idx = -1;
        int min_rem = 99999;

        for (int i = 0; i < n; i++) {
            if (procs[i].arrival_time <= time && procs[i].remaining_time > 0) {
                if (procs[i].remaining_time < min_rem) {
                    min_rem = procs[i].remaining_time;
                    shortest_idx = i;
                }
            }
        }

        if (shortest_idx == -1) {
            time++;
            continue;
        }

        if (procs[shortest_idx].pid != current_pid) {
            if (current_pid != -1 && t_count < MAX_TIMELINE) {
                timeline[t_count].pid = current_pid;
                for (int k = 0; k < n; k++) {
                    if (procs[k].pid == current_pid) {
                        snprintf(timeline[t_count].entity, sizeof(timeline[t_count].entity), "%s", procs[k].name);
                        break;
                    }
                }
                timeline[t_count].start_time = slot_start;
                timeline[t_count].end_time = time;
                timeline[t_count].duration = time - slot_start;
                t_count++;
                cs_count++;
            }
            current_pid = procs[shortest_idx].pid;
            slot_start = time;
            if (procs[shortest_idx].start_time == -1) {
                procs[shortest_idx].start_time = time;
                procs[shortest_idx].response_time = time - procs[shortest_idx].arrival_time;
            }
            procs[shortest_idx].state = STATE_RUNNING;
        }

        procs[shortest_idx].remaining_time--;
        time++;

        if (procs[shortest_idx].remaining_time == 0) {
            procs[shortest_idx].completion_time = time;
            procs[shortest_idx].turnaround_time = procs[shortest_idx].completion_time - procs[shortest_idx].arrival_time;
            procs[shortest_idx].waiting_time = procs[shortest_idx].turnaround_time - procs[shortest_idx].burst_time;
            procs[shortest_idx].state = STATE_TERMINATED;
            completed++;

            timeline[t_count].pid = current_pid;
            snprintf(timeline[t_count].entity, sizeof(timeline[t_count].entity), "%s", procs[shortest_idx].name);
            timeline[t_count].start_time = slot_start;
            timeline[t_count].end_time = time;
            timeline[t_count].duration = time - slot_start;
            t_count++;
            current_pid = -1;
            slot_start = time;
        }
    }
    *timeline_count = t_count;
    *total_context_switches = cs_count;
}

/* 5. Round Robin Scheduling */
void schedule_round_robin(PCB *procs, int n, int quantum, TimelineSlot *timeline, int *timeline_count, int *total_context_switches) {
    int time = 0, completed = 0, t_count = 0, cs_count = 0;
    int queue[MAX_PROCESSES * 16];
    int front = 0, rear = 0;
    bool in_queue[MAX_PROCESSES] = {false};

    for (int i = 0; i < n; i++) {
        procs[i].remaining_time = procs[i].burst_time;
        procs[i].start_time = -1;
    }

    for (int i = 0; i < n; i++) {
        if (procs[i].arrival_time == 0) {
            queue[rear++] = i;
            in_queue[i] = true;
        }
    }

    while (completed < n && time < 150) {
        if (front == rear) {
            time++;
            for (int i = 0; i < n; i++) {
                if (procs[i].arrival_time <= time && procs[i].remaining_time > 0 && !in_queue[i]) {
                    queue[rear++] = i;
                    in_queue[i] = true;
                }
            }
            continue;
        }

        int idx = queue[front++];
        in_queue[idx] = false;

        if (procs[idx].start_time == -1) {
            procs[idx].start_time = time;
            procs[idx].response_time = time - procs[idx].arrival_time;
        }
        procs[idx].state = STATE_RUNNING;

        int exec = (procs[idx].remaining_time < quantum) ? procs[idx].remaining_time : quantum;
        timeline[t_count].pid = procs[idx].pid;
        snprintf(timeline[t_count].entity, sizeof(timeline[t_count].entity), "%s", procs[idx].name);
        timeline[t_count].start_time = time;
        timeline[t_count].duration = exec;
        timeline[t_count].end_time = time + exec;
        t_count++;
        cs_count++;

        time += exec;
        procs[idx].remaining_time -= exec;

        for (int i = 0; i < n; i++) {
            if (procs[i].arrival_time <= time && procs[i].remaining_time > 0 && !in_queue[i] && i != idx) {
                queue[rear++] = i;
                in_queue[i] = true;
            }
        }

        if (procs[idx].remaining_time > 0) {
            procs[idx].state = STATE_READY;
            queue[rear++] = idx;
            in_queue[idx] = true;
        } else {
            procs[idx].completion_time = time;
            procs[idx].turnaround_time = procs[idx].completion_time - procs[idx].arrival_time;
            procs[idx].waiting_time = procs[idx].turnaround_time - procs[idx].burst_time;
            procs[idx].state = STATE_TERMINATED;
            completed++;
        }
    }
    *timeline_count = t_count;
    *total_context_switches = cs_count;
}
