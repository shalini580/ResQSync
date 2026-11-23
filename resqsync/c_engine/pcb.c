#include <string.h>
#include "pcb.h"

const char *resStateName(resState resS) {
    switch (resS) {
        case RES_NEW: return "new";
        case RES_READY: return "ready";
        case RES_RUNNING: return "running";
        case RES_WAITING: return "waiting";
        default: return "terminated";
    }
}

int resReadProcesses(resProcess *resList, int resMax) {
    int resCount = 0;
    if (scanf("%d", &resCount) != 1 || resCount < 1) return 0;
    if (resCount > resMax) resCount = resMax;

    for (int resI = 0; resI < resCount; resI++) {
        resProcess *resP = &resList[resI];
        if (scanf("%15s %d %d %d", resP->resName, &resP->resArrival, &resP->resBurst, &resP->resPriority) != 4) {
            return resI; /* stop at the first broken line */
        }
        if (resP->resBurst < 1) resP->resBurst = 1;
        if (resP->resArrival < 0) resP->resArrival = 0;
    }
    resResetProcesses(resList, resCount);
    return resCount;
}

void resResetProcesses(resProcess *resList, int resCount) {
    for (int resI = 0; resI < resCount; resI++) {
        resList[resI].resRemaining = resList[resI].resBurst;
        resList[resI].resStart = -1;
        resList[resI].resCompletion = 0;
        resList[resI].resStateNow = RES_NEW;
    }
}

void resJsonString(const char *resText) {
    putchar('"');
    for (const char *resC = resText; *resC; resC++) {
        if (*resC == '"' || *resC == '\\') putchar('\\');
        putchar(*resC);
    }
    putchar('"');
}

int resReadInt(void) {
    int resValue = 0;
    if (scanf("%d", &resValue) != 1) resValue = 0;
    return resValue;
}
