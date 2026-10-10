#ifndef _GNU_SOURCE
#define _GNU_SOURCE
#endif
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>

#include "pcb.h"
#include "cpu_scheduler.h"
#include "synchronization.h"
#include "ipc_pipe.h"
#include "bankers_algorithm.h"
#include "deadlock.h"

static long long get_time_us(void) {
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (long long)ts.tv_sec * 1000000LL + (ts.tv_nsec / 1000LL);
}

int main(int argc, char **argv) {
    long long start_t = get_time_us();

    if (argc < 2) {
        printf("{\"error\":\"Usage: ./os_kernel --action [status|schedule|process-ops|sync|ipc|banker|banker-request|deadlock-detect|deadlock-recover]\"}\n");
        return 1;
    }

    const char *action = argv[1];

    /* --- Status --- */
    if (strcmp(action, "--status") == 0) {
        printf("{\n");
        printf("  \"engine\": \"ResQSync Native Operating System & DBMS Architecture Kernel\",\n");
        printf("  \"compiler\": \"GCC %s ELF 64-bit\",\n", __VERSION__);
        printf("  \"posixVersion\": \"POSIX.1-2008 / C11 Standard\",\n");
        printf("  \"architecture\": \"Modular Multi-File C Engine (pcb.c, cpu_scheduler.c, synchronization.c, ipc_pipe.c, bankers_algorithm.c, deadlock.c, main.c)\",\n");
        printf("  \"status\": \"READY\",\n");
        printf("  \"subsystems\": [\n");
        printf("    \"Process Management (pcb.h, pcb.c)\",\n");
        printf("    \"CPU Scheduling (cpu_scheduler.h, cpu_scheduler.c)\",\n");
        printf("    \"Synchronization (synchronization.h, synchronization.c)\",\n");
        printf("    \"IPC Pipes (ipc_pipe.h, ipc_pipe.c)\",\n");
        printf("    \"Banker's Deadlock Avoidance (bankers_algorithm.h, bankers_algorithm.c)\",\n");
        printf("    \"Deadlock Cycle Detection & Recovery (deadlock.h, deadlock.c)\"\n");
        printf("  ]\n");
        printf("}\n");
        return 0;
    }

    /* --- CPU Scheduling --- */
    if (strcmp(action, "--schedule") == 0) {
        const char *algo = (argc > 2) ? argv[2] : "Priority";
        int quantum = (argc > 3) ? atoi(argv[3]) : 2;

        PCB procs[MAX_PROCESSES];
        int count = 0;
        init_default_pcbs(procs, &count);

        TimelineSlot timeline[MAX_TIMELINE];
        int timeline_count = 0;
        int context_switches = 0;

        if (strcmp(algo, "FCFS") == 0) {
            schedule_fcfs(procs, count, timeline, &timeline_count, &context_switches);
        } else if (strcmp(algo, "SJF") == 0) {
            schedule_sjf(procs, count, timeline, &timeline_count, &context_switches);
        } else if (strcmp(algo, "SRTF") == 0) {
            schedule_srtf(procs, count, timeline, &timeline_count, &context_switches);
        } else if (strcmp(algo, "Round Robin") == 0) {
            schedule_round_robin(procs, count, quantum, timeline, &timeline_count, &context_switches);
        } else {
            schedule_priority_preemptive(procs, count, timeline, &timeline_count, &context_switches);
        }

        double total_wt = 0, total_tat = 0, total_rt = 0;
        for (int i = 0; i < count; i++) {
            total_wt += procs[i].waiting_time;
            total_tat += procs[i].turnaround_time;
            total_rt += procs[i].response_time;
        }

        long long end_t = get_time_us();

        printf("{\n");
        printf("  \"engine\": \"Native C Executable (modular cpu_scheduler.c)\",\n");
        printf("  \"algorithm\": \"%s\",\n", algo);
        printf("  \"quantum\": %d,\n", quantum);
        printf("  \"executionTimeUs\": %lld,\n", end_t - start_t);
        printf("  \"totalContextSwitches\": %d,\n", context_switches);
        printf("  \"averageWaitingTime\": %.2f,\n", total_wt / count);
        printf("  \"averageTurnaroundTime\": %.2f,\n", total_tat / count);
        printf("  \"averageResponseTime\": %.2f,\n", total_rt / count);
        printf("  \"timeline\": [\n");
        for (int i = 0; i < timeline_count; i++) {
            printf("    {\"pid\": %d, \"entity\": \"%s\", \"startTime\": %d, \"endTime\": %d, \"duration\": %d}%s\n",
                   timeline[i].pid, timeline[i].entity, timeline[i].start_time, timeline[i].end_time, timeline[i].duration,
                   (i == timeline_count - 1) ? "" : ",");
        }
        printf("  ],\n");
        printf("  \"processes\": [\n");
        for (int i = 0; i < count; i++) {
            printf("    {\n");
            printf("      \"pid\": %d,\n", procs[i].pid);
            printf("      \"name\": \"%s\",\n", procs[i].name);
            printf("      \"arrivalTime\": %d,\n", procs[i].arrival_time);
            printf("      \"burstTime\": %d,\n", procs[i].burst_time);
            printf("      \"priority\": %d,\n", procs[i].priority);
            printf("      \"completionTime\": %d,\n", procs[i].completion_time);
            printf("      \"waitingTime\": %d,\n", procs[i].waiting_time);
            printf("      \"turnaroundTime\": %d,\n", procs[i].turnaround_time);
            printf("      \"responseTime\": %d,\n", procs[i].response_time);
            printf("      \"contextSwitches\": %d,\n", procs[i].context_switches);
            printf("      \"state\": \"%s\",\n", state_to_string(procs[i].state));
            printf("      \"pcbRegisters\": {\"pc\": \"0x%lx\", \"sp\": \"0x%lx\", \"rax\": %lu}\n",
                   procs[i].cpu_registers.reg_pc, procs[i].cpu_registers.reg_sp, procs[i].cpu_registers.reg_rax);
            printf("    }%s\n", (i == count - 1) ? "" : ",");
        }
        printf("  ]\n");
        printf("}\n");
        return 0;
    }

    /* --- Process Management & Context Switching --- */
    if (strcmp(action, "--process-ops") == 0) {
        PCB procs[MAX_PROCESSES];
        int count = 0;
        init_default_pcbs(procs, &count);

        const char *op = (argc > 2) ? argv[2] : "context-switch";
        int target_pid = (argc > 3) ? atoi(argv[3]) : 101;
        char status_msg[512] = {0};

        if (strcmp(op, "terminate") == 0) {
            terminate_process(procs, count, target_pid, status_msg, sizeof(status_msg));
        } else {
            simulate_context_switch(&procs[0], &procs[1], status_msg, sizeof(status_msg));
        }

        long long end_t = get_time_us();

        printf("{\n");
        printf("  \"engine\": \"Modular C Process Management (pcb.c)\",\n");
        printf("  \"operation\": \"%s\",\n", op);
        printf("  \"targetPid\": %d,\n", target_pid);
        printf("  \"executionTimeUs\": %lld,\n", end_t - start_t);
        printf("  \"activeProcessesCount\": %d,\n", count);
        printf("  \"statusMessage\": \"%s\",\n", status_msg);
        printf("  \"savedRegisters\": [\"RIP: 0x004010a0\", \"RSP: 0x7fff0010\", \"CR3 (Page Table Base): 0x1f4000\"],\n");
        printf("  \"pcbTable\": [\n");
        for (int i = 0; i < count; i++) {
            printf("    {\"pid\": %d, \"name\": \"%s\", \"priority\": %d, \"burst\": %d, \"state\": \"%s\", \"regPc\": \"0x%lx\"}%s\n",
                   procs[i].pid, procs[i].name, procs[i].priority, procs[i].burst_time,
                   state_to_string(procs[i].state), procs[i].cpu_registers.reg_pc,
                   (i == count - 1) ? "" : ",");
        }
        printf("  ]\n");
        printf("}\n");
        return 0;
    }

    /* --- Synchronization (Mutex vs Semaphore vs Race) --- */
    if (strcmp(action, "--sync") == 0) {
        const char *type = (argc > 2) ? argv[2] : "mutex";
        int mode = (strcmp(type, "semaphore") == 0) ? SYNC_MODE_SEMAPHORE : (strcmp(type, "race") == 0) ? SYNC_MODE_RACE : SYNC_MODE_MUTEX;

        SyncWorkerResult res1, res2;
        char last_owner[64] = {0};
        run_sync_simulation(mode, &res1, &res2, last_owner, sizeof(last_owner));

        long long end_t = get_time_us();

        printf("{\n");
        printf("  \"engine\": \"Modular POSIX Synchronization (synchronization.c)\",\n");
        printf("  \"syncType\": \"%s\",\n", type);
        printf("  \"executionTimeUs\": %lld,\n", end_t - start_t);
        printf("  \"mutexEnabled\": %s,\n", (mode == SYNC_MODE_MUTEX) ? "true" : "false");
        printf("  \"semaphoreEnabled\": %s,\n", (mode == SYNC_MODE_SEMAPHORE) ? "true" : "false");
        printf("  \"raceConditionPrevented\": %s,\n", (mode != SYNC_MODE_RACE) ? "true" : "false");
        printf("  \"lastClaimedBy\": \"%s\",\n", last_owner);
        printf("  \"threads\": [\n");
        printf("    {\"thread\": \"%s\", \"acquired\": %s, \"outcome\": \"%s\"},\n",
               res1.thread_name, res1.acquired ? "true" : "false", res1.outcome);
        printf("    {\"thread\": \"%s\", \"acquired\": %s, \"outcome\": \"%s\"}\n",
               res2.thread_name, res2.acquired ? "true" : "false", res2.outcome);
        printf("  ]\n");
        printf("}\n");
        return 0;
    }

    /* --- IPC (POSIX Pipes) --- */
    if (strcmp(action, "--ipc") == 0) {
        char telemetry[512] = {0};
        size_t transferred = 0;
        int status = run_ipc_pipe_demo(telemetry, sizeof(telemetry), &transferred);
        long long end_t = get_time_us();

        printf("{\n");
        printf("  \"engine\": \"Modular POSIX Pipe Subsystem (ipc_pipe.c)\",\n");
        printf("  \"mechanism\": \"UNIX Unidirectional Pipes (pipe, write, read)\",\n");
        printf("  \"status\": \"%s\",\n", (status == 0) ? "SUCCESS" : "FAILURE");
        printf("  \"telemetryPayload\": \"%s\",\n", telemetry);
        printf("  \"bufferCapacityBytes\": 65536,\n");
        printf("  \"executionTimeUs\": %lld\n", end_t - start_t);
        printf("}\n");
        return 0;
    }

    /* --- Banker's Algorithm --- */
    if (strcmp(action, "--banker") == 0) {
        BankerData b;
        init_default_banker(&b);

        if (argc > 5) {
            b.available[0] = atoi(argv[2]);
            b.available[1] = atoi(argv[3]);
            b.available[2] = atoi(argv[4]);
            b.available[3] = atoi(argv[5]);
        }

        char safe_seq[MAX_PROCESSES][64];
        int seq_len = 0;
        char reason[512];
        int is_safe = check_banker_safety(&b, safe_seq, &seq_len, reason, sizeof(reason));

        long long end_t = get_time_us();

        printf("{\n");
        printf("  \"engine\": \"Modular Dijkstra Banker Engine (bankers_algorithm.c)\",\n");
        printf("  \"isSafe\": %s,\n", is_safe ? "true" : "false");
        printf("  \"executionTimeUs\": %lld,\n", end_t - start_t);
        printf("  \"reason\": \"%s\",\n", reason);
        printf("  \"safeSequence\": [\n");
        for (int i = 0; i < seq_len; i++) {
            printf("    \"%s\"%s\n", safe_seq[i], (i == seq_len - 1) ? "" : ",");
        }
        printf("  ],\n");
        printf("  \"matrices\": {\n");
        printf("    \"available\": [%d, %d, %d, %d],\n", b.available[0], b.available[1], b.available[2], b.available[3]);
        printf("    \"resourceNames\": [\"%s\", \"%s\", \"%s\", \"%s\"],\n",
               b.resource_names[0], b.resource_names[1], b.resource_names[2], b.resource_names[3]);
        printf("    \"processes\": [\n");
        for (int i = 0; i < b.num_processes; i++) {
            printf("      {\n");
            printf("        \"name\": \"%s\",\n", b.process_names[i]);
            printf("        \"allocation\": [%d, %d, %d, %d],\n", b.allocation[i][0], b.allocation[i][1], b.allocation[i][2], b.allocation[i][3]);
            printf("        \"max\": [%d, %d, %d, %d],\n", b.max[i][0], b.max[i][1], b.max[i][2], b.max[i][3]);
            printf("        \"need\": [%d, %d, %d, %d]\n", b.need[i][0], b.need[i][1], b.need[i][2], b.need[i][3]);
            printf("      }%s\n", (i == b.num_processes - 1) ? "" : ",");
        }
        printf("    ]\n");
        printf("  }\n");
        printf("}\n");
        return 0;
    }

    /* --- Banker's Resource-Request Algorithm --- */
    if (strcmp(action, "--banker-request") == 0) {
        BankerData b;
        init_default_banker(&b);

        int proc_idx = (argc > 2) ? atoi(argv[2]) : 1;
        int req[MAX_RESOURCES] = {
            (argc > 3) ? atoi(argv[3]) : 10,
            (argc > 4) ? atoi(argv[4]) : 20,
            (argc > 5) ? atoi(argv[5]) : 10,
            (argc > 6) ? atoi(argv[6]) : 1
        };

        char reason[512];
        int res = banker_resource_request(&b, proc_idx, req, reason, sizeof(reason));
        long long end_t = get_time_us();

        printf("{\n");
        printf("  \"engine\": \"Modular Banker Resource-Request Engine (bankers_algorithm.c)\",\n");
        printf("  \"processIndex\": %d,\n", proc_idx);
        printf("  \"processName\": \"%s\",\n", b.process_names[proc_idx]);
        printf("  \"requested\": [%d, %d, %d, %d],\n", req[0], req[1], req[2], req[3]);
        printf("  \"decision\": \"%s\",\n", (res == 1) ? "GRANTED" : (res == 0) ? "BLOCKED_WAITING" : "ERROR_EXCEEDED");
        printf("  \"reason\": \"%s\",\n", reason);
        printf("  \"executionTimeUs\": %lld\n", end_t - start_t);
        printf("}\n");
        return 0;
    }

    /* --- Deadlock Cycle Detection --- */
    if (strcmp(action, "--deadlock-detect") == 0) {
        char cycle_procs[MAX_NODES][64];
        int cycle_len = 0;
        char coffman[4][128];
        int cond_len = 0;
        int has_cycle = detect_deadlock_cycle(cycle_procs, &cycle_len, coffman, &cond_len);
        long long end_t = get_time_us();

        printf("{\n");
        printf("  \"engine\": \"Modular Deadlock WFG Subsystem (deadlock.c)\",\n");
        printf("  \"deadlockDetected\": %s,\n", has_cycle ? "true" : "false");
        printf("  \"executionTimeUs\": %lld,\n", end_t - start_t);
        printf("  \"cycleLength\": %d,\n", cycle_len);
        printf("  \"cycleProcesses\": [\n");
        for (int i = 0; i < cycle_len; i++) {
            printf("    \"%s\"%s\n", cycle_procs[i], (i == cycle_len - 1) ? "" : ",");
        }
        printf("  ],\n");
        printf("  \"coffmanConditions\": [\n");
        for (int i = 0; i < cond_len; i++) {
            printf("    \"%s\"%s\n", coffman[i], (i == cond_len - 1) ? "" : ",");
        }
        printf("  ]\n");
        printf("}\n");
        return 0;
    }

    /* --- Deadlock Recovery --- */
    if (strcmp(action, "--deadlock-recover") == 0) {
        int victim_pid = 0;
        char victim_name[64];
        char reason[256];
        recover_deadlock(&victim_pid, victim_name, sizeof(victim_name), reason, sizeof(reason));
        long long end_t = get_time_us();

        printf("{\n");
        printf("  \"engine\": \"Modular Deadlock Recovery Subsystem (deadlock.c)\",\n");
        printf("  \"recoveryStrategy\": \"Process Termination & Resource Preemption based on Priority Cost Function\",\n");
        printf("  \"victimProcess\": {\n");
        printf("    \"pid\": %d,\n", victim_pid);
        printf("    \"name\": \"%s\",\n", victim_name);
        printf("    \"priority\": 4,\n");
        printf("    \"reason\": \"%s\"\n", reason);
        printf("  },\n");
        printf("  \"recoveredState\": \"SAFE\",\n");
        printf("  \"executionTimeUs\": %lld,\n", end_t - start_t);
        printf("  \"cycleBroken\": true\n");
        printf("}\n");
        return 0;
    }

    printf("{\"error\":\"Unknown action: %s\"}\n", action);
    return 1;
}
