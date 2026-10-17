/*
 * cpu_scheduler.c - the five CPU scheduling algorithms from the report.
 * Lower priority number = more urgent (P1 critical).
 */
#include <string.h>
#include "cpu_scheduler.h"

static void resAddSegment(resSegment *resGantt, int *resSegCount, const char *resName, int resFrom, int resTo) {
    if (resFrom == resTo) return;
    /* merge with the previous block if the same process just keeps running */
    if (*resSegCount > 0) {
        resSegment *resLast = &resGantt[*resSegCount - 1];
        if (strcmp(resLast->resName, resName) == 0 && resLast->resTo == resFrom) {
            resLast->resTo = resTo;
            return;
        }
    }
    if (*resSegCount >= RES_MAX_SEG) return;
    strncpy(resGantt[*resSegCount].resName, resName, RES_NAME_LEN - 1);
    resGantt[*resSegCount].resName[RES_NAME_LEN - 1] = '\0';
    resGantt[*resSegCount].resFrom = resFrom;
    resGantt[*resSegCount].resTo = resTo;
    (*resSegCount)++;
}

static int resAllDone(resProcess *resList, int resCount) {
    for (int resI = 0; resI < resCount; resI++)
        if (resList[resI].resRemaining > 0) return 0;
    return 1;
}

/* earliest arrival among the processes that still have work, used when the CPU is idle */
static int resNextArrival(resProcess *resList, int resCount, int resTime) {
    int resBest = -1;
    for (int resI = 0; resI < resCount; resI++) {
        if (resList[resI].resRemaining > 0 && resList[resI].resArrival > resTime) {
            if (resBest < 0 || resList[resI].resArrival < resBest) resBest = resList[resI].resArrival;
        }
    }
    return resBest;
}

/* picks the next process for the non-preemptive algorithms */
static int resPickNonPreemptive(const char *resAlgo, resProcess *resList, int resCount, int resTime) {
    int resPick = -1;
    for (int resI = 0; resI < resCount; resI++) {
        resProcess *resP = &resList[resI];
        if (resP->resRemaining == 0 || resP->resArrival > resTime) continue;
        if (resPick < 0) { resPick = resI; continue; }
        resProcess *resQ = &resList[resPick];

        int resBetter = 0;
        if (strcmp(resAlgo, "sjf") == 0) {
            resBetter = resP->resBurst < resQ->resBurst ||
                        (resP->resBurst == resQ->resBurst && resP->resArrival < resQ->resArrival);
        } else if (strcmp(resAlgo, "priority") == 0) {
            resBetter = resP->resPriority < resQ->resPriority ||
                        (resP->resPriority == resQ->resPriority && resP->resArrival < resQ->resArrival);
        } else { /* fcfs */
            resBetter = resP->resArrival < resQ->resArrival;
        }
        if (resBetter) resPick = resI;
    }
    return resPick;
}

static void resRunNonPreemptive(const char *resAlgo, resProcess *resList, int resCount,
                                resSegment *resGantt, int *resSegCount) {
    int resTime = 0;
    while (!resAllDone(resList, resCount)) {
        int resPick = resPickNonPreemptive(resAlgo, resList, resCount, resTime);
        if (resPick < 0) {
            int resNext = resNextArrival(resList, resCount, resTime);
            resAddSegment(resGantt, resSegCount, "IDLE", resTime, resNext);
            resTime = resNext;
            continue;
        }
        resProcess *resP = &resList[resPick];
        resP->resStart = resTime;
        resAddSegment(resGantt, resSegCount, resP->resName, resTime, resTime + resP->resBurst);
        resTime += resP->resBurst;
        resP->resRemaining = 0;
        resP->resCompletion = resTime;
        resP->resStateNow = RES_TERMINATED;
    }
}

/* shortest remaining time first - checks every time unit, so it can preempt */
static void resRunSrtf(resProcess *resList, int resCount, resSegment *resGantt, int *resSegCount) {
    int resTime = 0;
    while (!resAllDone(resList, resCount)) {
        int resPick = -1;
        for (int resI = 0; resI < resCount; resI++) {
            resProcess *resP = &resList[resI];
            if (resP->resRemaining == 0 || resP->resArrival > resTime) continue;
            if (resPick < 0 || resP->resRemaining < resList[resPick].resRemaining ||
                (resP->resRemaining == resList[resPick].resRemaining && resP->resArrival < resList[resPick].resArrival)) {
                resPick = resI;
            }
        }
        if (resPick < 0) {
            int resNext = resNextArrival(resList, resCount, resTime);
            resAddSegment(resGantt, resSegCount, "IDLE", resTime, resNext);
            resTime = resNext;
            continue;
        }
        resProcess *resP = &resList[resPick];
        if (resP->resStart < 0) resP->resStart = resTime;
        resAddSegment(resGantt, resSegCount, resP->resName, resTime, resTime + 1);
        resTime++;
        if (--resP->resRemaining == 0) {
            resP->resCompletion = resTime;
            resP->resStateNow = RES_TERMINATED;
        }
    }
}

/* round robin with a simple circular ready queue */
static void resRunRoundRobin(resProcess *resList, int resCount, int resQuantum,
                             resSegment *resGantt, int *resSegCount) {
    /* circular queue - it never holds more than resCount entries at once */
    int resQueue[RES_MAX_PROC + 1];
    int resHead = 0, resTail = 0;
    const int resCap = RES_MAX_PROC + 1;
    int resInQueue[RES_MAX_PROC] = {0};
    int resTime = 0;
    if (resQuantum < 1) resQuantum = 2;

    /* adds everything that has arrived by resUpTo, in arrival order */
    #define RES_ADMIT(resUpTo)                                                          \
        for (int resI = 0; resI < resCount; resI++) {                                   \
            if (!resInQueue[resI] && resList[resI].resRemaining > 0 &&                  \
                resList[resI].resArrival <= (resUpTo)) {                                \
                resQueue[resTail] = resI;                                               \
                resTail = (resTail + 1) % resCap;                                       \
                resInQueue[resI] = 1;                                                   \
            }                                                                           \
        }

    while (!resAllDone(resList, resCount)) {
        RES_ADMIT(resTime);
        if (resHead == resTail) {
            int resNext = resNextArrival(resList, resCount, resTime);
            resAddSegment(resGantt, resSegCount, "IDLE", resTime, resNext);
            resTime = resNext;
            continue;
        }
        int resPick = resQueue[resHead];
        resHead = (resHead + 1) % resCap;
        resProcess *resP = &resList[resPick];
        if (resP->resStart < 0) resP->resStart = resTime;

        int resSlice = resP->resRemaining < resQuantum ? resP->resRemaining : resQuantum;
        resAddSegment(resGantt, resSegCount, resP->resName, resTime, resTime + resSlice);
        resTime += resSlice;
        resP->resRemaining -= resSlice;

        /* new arrivals go in before the preempted process goes back */
        RES_ADMIT(resTime);
        if (resP->resRemaining > 0) {
            resQueue[resTail] = resPick;
            resTail = (resTail + 1) % resCap;
        } else {
            resP->resCompletion = resTime;
            resP->resStateNow = RES_TERMINATED;
        }
    }
    #undef RES_ADMIT
}

int resSchedule(const char *resAlgo, resProcess *resList, int resCount, int resQuantum,
                resSegment *resGantt, int *resSegCount) {
    resResetProcesses(resList, resCount);
    *resSegCount = 0;
    if (strcmp(resAlgo, "srtf") == 0) resRunSrtf(resList, resCount, resGantt, resSegCount);
    else if (strcmp(resAlgo, "rr") == 0) resRunRoundRobin(resList, resCount, resQuantum, resGantt, resSegCount);
    else if (strcmp(resAlgo, "fcfs") == 0 || strcmp(resAlgo, "sjf") == 0 || strcmp(resAlgo, "priority") == 0)
        resRunNonPreemptive(resAlgo, resList, resCount, resGantt, resSegCount);
    else return 0;
    return 1;
}

static void resAverages(resProcess *resList, int resCount, double *resWait, double *resTurn, double *resResp) {
    double resW = 0, resT = 0, resR = 0;
    for (int resI = 0; resI < resCount; resI++) {
        int resTat = resList[resI].resCompletion - resList[resI].resArrival;
        resT += resTat;
        resW += resTat - resList[resI].resBurst;
        resR += resList[resI].resStart - resList[resI].resArrival;
    }
    *resWait = resW / resCount;
    *resTurn = resT / resCount;
    *resResp = resR / resCount;
}

void resPrintSchedule(const char *resAlgo, resProcess *resList, int resCount, int resQuantum) {
    static resSegment resGantt[RES_MAX_SEG];
    int resSegs = 0;
    if (!resSchedule(resAlgo, resList, resCount, resQuantum, resGantt, &resSegs)) {
        printf("{\"ok\":false,\"error\":\"unknown algorithm\"}\n");
        return;
    }
    double resWait, resTurn, resResp;
    resAverages(resList, resCount, &resWait, &resTurn, &resResp);

    printf("{\"ok\":true,\"algorithm\":");
    resJsonString(resAlgo);
    printf(",\"quantum\":%d,\"gantt\":[", resQuantum);
    for (int resI = 0; resI < resSegs; resI++) {
        printf("%s{\"pid\":", resI ? "," : "");
        resJsonString(resGantt[resI].resName);
        printf(",\"from\":%d,\"to\":%d}", resGantt[resI].resFrom, resGantt[resI].resTo);
    }
    printf("],\"processes\":[");
    for (int resI = 0; resI < resCount; resI++) {
        resProcess *resP = &resList[resI];
        int resTat = resP->resCompletion - resP->resArrival;
        printf("%s{\"pid\":", resI ? "," : "");
        resJsonString(resP->resName);
        printf(",\"arrival\":%d,\"burst\":%d,\"priority\":%d,\"start\":%d,\"completion\":%d,"
               "\"turnaround\":%d,\"waiting\":%d,\"response\":%d,\"state\":\"%s\"}",
               resP->resArrival, resP->resBurst, resP->resPriority, resP->resStart, resP->resCompletion,
               resTat, resTat - resP->resBurst, resP->resStart - resP->resArrival, resStateName(resP->resStateNow));
    }
    printf("],\"avgWaiting\":%.2f,\"avgTurnaround\":%.2f,\"avgResponse\":%.2f}\n", resWait, resTurn, resResp);
}

void resPrintCompare(resProcess *resList, int resCount, int resQuantum) {
    const char *resAlgos[] = {"fcfs", "sjf", "srtf", "priority", "rr"};
    static resSegment resGantt[RES_MAX_SEG];
    printf("{\"ok\":true,\"quantum\":%d,\"results\":[", resQuantum);
    for (int resA = 0; resA < 5; resA++) {
        int resSegs = 0;
        resSchedule(resAlgos[resA], resList, resCount, resQuantum, resGantt, &resSegs);
        double resWait, resTurn, resResp;
        resAverages(resList, resCount, &resWait, &resTurn, &resResp);
        printf("%s{\"algorithm\":\"%s\",\"avgWaiting\":%.2f,\"avgTurnaround\":%.2f,\"avgResponse\":%.2f,\"switches\":%d}",
               resA ? "," : "", resAlgos[resA], resWait, resTurn, resResp, resSegs - 1);
    }
    printf("]}\n");
}
