/*
 * pcb.h - process control block used by every part of the kernel.
 * An emergency case / NGO request from the website becomes one resProcess.
 */
#ifndef RES_PCB_H
#define RES_PCB_H

#include <stdio.h>

#define RES_MAX_PROC 64
#define RES_MAX_RES 8
#define RES_MAX_SEG 4096
#define RES_NAME_LEN 16

typedef enum { RES_NEW, RES_READY, RES_RUNNING, RES_WAITING, RES_TERMINATED } resState;

typedef struct {
    char resName[RES_NAME_LEN];   /* e.g. PID-101 */
    int resArrival;
    int resBurst;
    int resPriority;              /* 1 = critical ... 4 = low */
    int resRemaining;
    int resStart;                 /* first time on the CPU, -1 = never */
    int resCompletion;
    resState resStateNow;
} resProcess;

/* one block of the Gantt chart */
typedef struct {
    char resName[RES_NAME_LEN];
    int resFrom;
    int resTo;
} resSegment;

const char *resStateName(resState resS);

/* reads "N" then N lines of "name arrival burst priority" from stdin */
int resReadProcesses(resProcess *resList, int resMax);

void resResetProcesses(resProcess *resList, int resCount);

/* tiny JSON helpers so every command prints the same way */
void resJsonString(const char *resText);

/* reads one int from stdin, 0 if there is nothing left */
int resReadInt(void);

#endif
