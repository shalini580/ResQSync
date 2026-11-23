#ifndef RES_CPU_SCHEDULER_H
#define RES_CPU_SCHEDULER_H

#include "pcb.h"

/* algo = "fcfs" | "sjf" | "srtf" | "priority" | "rr" */
int resSchedule(const char *resAlgo, resProcess *resList, int resCount, int resQuantum,
                resSegment *resGantt, int *resSegCount);

/* prints the full result of one algorithm as JSON */
void resPrintSchedule(const char *resAlgo, resProcess *resList, int resCount, int resQuantum);

/* runs all five and prints the averages side by side */
void resPrintCompare(resProcess *resList, int resCount, int resQuantum);

#endif
