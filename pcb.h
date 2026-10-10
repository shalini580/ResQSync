#ifndef RESQSYNC_PCB_H
#define RESQSYNC_PCB_H

#include <stddef.h>
#include <stdbool.h>

#define MAX_PROCESSES 16

/* Process Lifecycle States */
typedef enum {
    STATE_NEW,
    STATE_READY,
    STATE_RUNNING,
    STATE_WAITING,
    STATE_TERMINATED
} ProcessState;

const char *state_to_string(ProcessState s);

/* Process Control Block (PCB) Structure */
typedef struct {
    int pid;
    char name[64];
    int arrival_time;
    int burst_time;
    int remaining_time;
    int priority; // 1 (Highest / Critical) to 10 (Lowest)
    int start_time;
    int completion_time;
    int waiting_time;
    int turnaround_time;
    int response_time;
    int context_switches;
    ProcessState state;
    // Simulated Hardware CPU Registers
    struct {
        unsigned long reg_pc;  // Program Counter (RIP)
        unsigned long reg_sp;  // Stack Pointer (RSP)
        unsigned long reg_rax; // General Register AX
        unsigned long reg_rbx; // General Register BX
    } cpu_registers;
} PCB;

/* Function Prototypes */
void init_default_pcbs(PCB *procs, int *count);
int terminate_process(PCB *procs, int count, int target_pid, char *out_msg, size_t msg_size);
int simulate_context_switch(PCB *outgoing, PCB *incoming, char *out_msg, size_t msg_size);

#endif /* RESQSYNC_PCB_H */
