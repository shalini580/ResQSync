/*
 * deadlock.c - finds the processes stuck in a circular wait and breaks it
 * by preempting the least important one (lowest priority) until nobody is stuck.
 */
#include <stdio.h>
#include <string.h>
#include "deadlock.h"
#include "pcb.h"

static int resN, resM;
static int resAvail[RES_MAX_RES], resAlloc[RES_MAX_PROC][RES_MAX_RES], resReq[RES_MAX_PROC][RES_MAX_RES];
static int resPrio[RES_MAX_PROC], resGone[RES_MAX_PROC];
static char resNames[RES_MAX_PROC][RES_NAME_LEN];

/* returns how many are deadlocked and marks them in resStuck */
static int resDetect(int *resStuck) {
    int resWork[RES_MAX_RES], resFinish[RES_MAX_PROC];
    memcpy(resWork, resAvail, sizeof resWork);

    for (int resI = 0; resI < resN; resI++) {
        int resHolds = 0;
        for (int resJ = 0; resJ < resM; resJ++) if (resAlloc[resI][resJ] > 0) resHolds = 1;
        resFinish[resI] = resGone[resI] || !resHolds;   /* holds nothing -> can't be part of a cycle */
    }

    int resProgress = 1;
    while (resProgress) {
        resProgress = 0;
        for (int resI = 0; resI < resN; resI++) {
            if (resFinish[resI]) continue;
            int resCan = 1;
            for (int resJ = 0; resJ < resM; resJ++) if (resReq[resI][resJ] > resWork[resJ]) { resCan = 0; break; }
            if (resCan) {
                for (int resJ = 0; resJ < resM; resJ++) resWork[resJ] += resAlloc[resI][resJ];
                resFinish[resI] = 1;
                resProgress = 1;
            }
        }
    }

    int resCount = 0;
    for (int resI = 0; resI < resN; resI++) {
        resStuck[resI] = !resFinish[resI];
        resCount += resStuck[resI];
    }
    return resCount;
}

static void resPrintStuck(const int *resStuck) {
    putchar('[');
    int resFirst = 1;
    for (int resI = 0; resI < resN; resI++) {
        if (!resStuck[resI]) continue;
        if (!resFirst) putchar(',');
        resJsonString(resNames[resI]);
        resFirst = 0;
    }
    putchar(']');
}

void resRunDeadlock(void) {
    if (scanf("%d %d", &resN, &resM) != 2 || resN < 1 || resM < 1 || resN > RES_MAX_PROC || resM > RES_MAX_RES) {
        printf("{\"ok\":false,\"error\":\"bad input\"}\n");
        return;
    }
    for (int resJ = 0; resJ < resM; resJ++) resAvail[resJ] = resReadInt();
    for (int resI = 0; resI < resN; resI++) for (int resJ = 0; resJ < resM; resJ++) resAlloc[resI][resJ] = resReadInt();
    for (int resI = 0; resI < resN; resI++) for (int resJ = 0; resJ < resM; resJ++) resReq[resI][resJ] = resReadInt();
    for (int resI = 0; resI < resN; resI++) if (scanf("%d", &resPrio[resI]) != 1) resPrio[resI] = 2;
    for (int resI = 0; resI < resN; resI++) {
        if (scanf("%15s", resNames[resI]) != 1) snprintf(resNames[resI], RES_NAME_LEN, "P%d", resI);
        resGone[resI] = 0;
    }

    int resStuck[RES_MAX_PROC];
    int resFound = resDetect(resStuck);
    printf("{\"ok\":true,\"deadlocked\":");
    resPrintStuck(resStuck);
    printf(",\"recovery\":[");

    /* recovery: preempt the least important stuck process, give its resources back, check again */
    int resRound = 0;
    while (resFound > 0 && resRound < resN) {
        int resVictim = -1;
        for (int resI = 0; resI < resN; resI++) {
            if (!resStuck[resI]) continue;
            if (resVictim < 0 || resPrio[resI] > resPrio[resVictim] ||
                (resPrio[resI] == resPrio[resVictim] && resI > resVictim)) resVictim = resI;
        }
        printf("%s{\"victim\":", resRound ? "," : "");
        resJsonString(resNames[resVictim]);
        printf(",\"priority\":%d,\"released\":[", resPrio[resVictim]);
        for (int resJ = 0; resJ < resM; resJ++) {
            printf("%s%d", resJ ? "," : "", resAlloc[resVictim][resJ]);
            resAvail[resJ] += resAlloc[resVictim][resJ];
            resAlloc[resVictim][resJ] = 0;
        }
        resGone[resVictim] = 1;
        resFound = resDetect(resStuck);
        printf("],\"stillDeadlocked\":");
        resPrintStuck(resStuck);
        putchar('}');
        resRound++;
    }
    printf("],\"resolved\":%s}\n", resFound == 0 ? "true" : "false");
}
