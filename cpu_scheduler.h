#ifndef RESQSYNC_CPU_SCHEDULER_H
#define RESQSYNC_CPU_SCHEDULER_H

#include "pcb.h"

#define MAX_TIMELINE 256

typedef struct {
    int pid;
    char entity[64];
    int start_time;
    int end_time;
    int duration;
} TimelineSlot;

/* 5 Standard CPU Scheduling Algorithms */
void schedule_priority_preemptive(PCB *procs, int n, TimelineSlot *timeline, int *timeline_count, int *total_context_switches);
void schedule_fcfs(PCB *procs, int n, TimelineSlot *timeline, int *timeline_count, int *total_context_switches);
void schedule_sjf(PCB *procs, int n, TimelineSlot *timeline, int *timeline_count, int *total_context_switches);
void schedule_srtf(PCB *procs, int n, TimelineSlot *timeline, int *timeline_count, int *total_context_switches);
void schedule_round_robin(PCB *procs, int n, int quantum, TimelineSlot *timeline, int *timeline_count, int *total_context_switches);

#endif /* RESQSYNC_CPU_SCHEDULER_H */
