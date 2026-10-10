#include "pcb.h"
#include <stdio.h>
#include <string.h>

const char *state_to_string(ProcessState s) {
    switch (s) {
        case STATE_NEW: return "NEW";
        case STATE_READY: return "READY";
        case STATE_RUNNING: return "RUNNING";
        case STATE_WAITING: return "WAITING";
        case STATE_TERMINATED: return "TERMINATED";
        default: return "UNKNOWN";
    }
}

void init_default_pcbs(PCB *procs, int *count) {
    *count = 5;
    procs[0] = (PCB){ 101, "E101: Sector 4 Flash Flood Triage", 0, 5, 5, 1, -1, 0, 0, 0, -1, 0, STATE_READY, { 0x00401000, 0x7fff0010, 0x1, 0x0 } };
    procs[1] = (PCB){ 102, "E102: Commercial Chemical Fire",     1, 3, 3, 2, -1, 0, 0, 0, -1, 0, STATE_READY, { 0x00402000, 0x7fff0020, 0x2, 0x0 } };
    procs[2] = (PCB){ 103, "E103: Building Structural Collapse", 2, 6, 6, 2, -1, 0, 0, 0, -1, 0, STATE_READY, { 0x00403000, 0x7fff0030, 0x3, 0x0 } };
    procs[3] = (PCB){ 104, "E104: Central Medical Outbreak",     3, 2, 2, 3, -1, 0, 0, 0, -1, 0, STATE_READY, { 0x00404000, 0x7fff0040, 0x4, 0x0 } };
    procs[4] = (PCB){ 105, "E105: East Grid Substation Blackout",4, 4, 4, 4, -1, 0, 0, 0, -1, 0, STATE_READY, { 0x00405000, 0x7fff0050, 0x5, 0x0 } };
}

int terminate_process(PCB *procs, int count, int target_pid, char *out_msg, size_t msg_size) {
    for (int i = 0; i < count; i++) {
        if (procs[i].pid == target_pid) {
            procs[i].state = STATE_TERMINATED;
            snprintf(out_msg, msg_size, "Process PID-%d terminated cleanly via kernel SIGTERM signal handler. Allocated memory, open file descriptors, and CPU core released back to OS pool.", target_pid);
            return 0;
        }
    }
    snprintf(out_msg, msg_size, "Error: PID-%d not found in active PCB table.", target_pid);
    return -1;
}

int simulate_context_switch(PCB *outgoing, PCB *incoming, char *out_msg, size_t msg_size) {
    if (outgoing) {
        outgoing->state = STATE_READY;
        outgoing->context_switches++;
        outgoing->cpu_registers.reg_pc += 0x20;
    }
    if (incoming) {
        incoming->state = STATE_RUNNING;
    }
    snprintf(out_msg, msg_size, "Context Switch Executed: Outgoing registers (RIP, RSP, CR3) pushed to kernel stack; incoming registers restored into CPU core. Hardware switch latency: ~1.8 microseconds.");
    return 0;
}
