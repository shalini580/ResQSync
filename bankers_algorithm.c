/*
 * bankers_algorithm.c - deadlock AVOIDANCE.
 * Before giving resources we check if the system stays in a safe state.
 */
#include <stdio.h>
#include <string.h>
#include "bankers_algorithm.h"
#include "pcb.h"

static int resN, resM;
static int resAvail[RES_MAX_RES], resMax[RES_MAX_PROC][RES_MAX_RES], resAlloc[RES_MAX_PROC][RES_MAX_RES];
static int resNeed[RES_MAX_PROC][RES_MAX_RES];
static char resNames[RES_MAX_PROC][RES_NAME_LEN];

static void resPrintVector(const int *resV) {
    putchar('[');
    for (int resJ = 0; resJ < resM; resJ++) printf("%s%d", resJ ? "," : "", resV[resJ]);
    putchar(']');
}

/* the safety algorithm - prints the steps and fills resSeq */
static int resIsSafe(int *resSeq, int resPrintSteps) {
    int resWork[RES_MAX_RES], resFinish[RES_MAX_PROC] = {0}, resCount = 0;
    memcpy(resWork, resAvail, sizeof resWork);

    if (resPrintSteps) printf("\"steps\":[");
    int resProgress = 1, resFirst = 1;
    while (resProgress) {
        resProgress = 0;
        for (int resI = 0; resI < resN; resI++) {
            if (resFinish[resI]) continue;
            int resFits = 1;
            for (int resJ = 0; resJ < resM; resJ++) if (resNeed[resI][resJ] > resWork[resJ]) { resFits = 0; break; }
            if (!resFits) continue;

            if (resPrintSteps) {
                printf("%s{\"pid\":", resFirst ? "" : ",");
                resJsonString(resNames[resI]);
                printf(",\"workBefore\":");
                resPrintVector(resWork);
            }
            for (int resJ = 0; resJ < resM; resJ++) resWork[resJ] += resAlloc[resI][resJ];
            if (resPrintSteps) {
                printf(",\"workAfter\":");
                resPrintVector(resWork);
                putchar('}');
            }
            resFirst = 0;
            resFinish[resI] = 1;
            resSeq[resCount++] = resI;
            resProgress = 1;
        }
    }
    if (resPrintSteps) printf("],");
    return resCount == resN;
}

void resRunBankers(void) {
    if (scanf("%d %d", &resN, &resM) != 2 || resN < 1 || resM < 1 || resN > RES_MAX_PROC || resM > RES_MAX_RES) {
        printf("{\"ok\":false,\"error\":\"bad input\"}\n");
        return;
    }
    for (int resJ = 0; resJ < resM; resJ++) resAvail[resJ] = resReadInt();
    for (int resI = 0; resI < resN; resI++) for (int resJ = 0; resJ < resM; resJ++) resMax[resI][resJ] = resReadInt();
    for (int resI = 0; resI < resN; resI++) for (int resJ = 0; resJ < resM; resJ++) resAlloc[resI][resJ] = resReadInt();

    int resHasRequest = 0, resReqProc = -1, resRequest[RES_MAX_RES] = {0};
    if (scanf("%d", &resHasRequest) == 1 && resHasRequest) {
        resReqProc = resReadInt();
        for (int resJ = 0; resJ < resM; resJ++) resRequest[resJ] = resReadInt();
    }
    for (int resI = 0; resI < resN; resI++) {
        if (scanf("%15s", resNames[resI]) != 1) snprintf(resNames[resI], RES_NAME_LEN, "P%d", resI);
    }

    for (int resI = 0; resI < resN; resI++)
        for (int resJ = 0; resJ < resM; resJ++) resNeed[resI][resJ] = resMax[resI][resJ] - resAlloc[resI][resJ];

    printf("{\"ok\":true,\"need\":[");
    for (int resI = 0; resI < resN; resI++) { if (resI) putchar(','); resPrintVector(resNeed[resI]); }
    printf("],");

    int resSeq[RES_MAX_PROC];
    int resSafe = resIsSafe(resSeq, 1);
    printf("\"safe\":%s,\"sequence\":[", resSafe ? "true" : "false");
    if (resSafe) for (int resI = 0; resI < resN; resI++) { if (resI) putchar(','); resJsonString(resNames[resSeq[resI]]); }
    printf("]");

    if (resHasRequest && resReqProc >= 0 && resReqProc < resN) {
        const char *resReason = "granted";
        int resGranted = 1;
        for (int resJ = 0; resJ < resM; resJ++) {
            if (resRequest[resJ] > resNeed[resReqProc][resJ]) { resGranted = 0; resReason = "asks for more than its declared max"; break; }
            if (resRequest[resJ] > resAvail[resJ]) { resGranted = 0; resReason = "not enough available - process must wait"; break; }
        }
        int resSeq2[RES_MAX_PROC];
        int resSafeAfter = 0;
        if (resGranted) {
            /* pretend to give it, check safety, then roll back if unsafe */
            for (int resJ = 0; resJ < resM; resJ++) {
                resAvail[resJ] -= resRequest[resJ];
                resAlloc[resReqProc][resJ] += resRequest[resJ];
                resNeed[resReqProc][resJ] -= resRequest[resJ];
            }
            resSafeAfter = resIsSafe(resSeq2, 0);
            if (!resSafeAfter) { resGranted = 0; resReason = "would leave the system in an UNSAFE state - request denied"; }
        }
        printf(",\"request\":{\"pid\":");
        resJsonString(resNames[resReqProc]);
        printf(",\"vector\":");
        resPrintVector(resRequest);
        printf(",\"granted\":%s,\"reason\":", resGranted ? "true" : "false");
        resJsonString(resReason);
        printf(",\"sequenceAfter\":[");
        if (resGranted) for (int resI = 0; resI < resN; resI++) { if (resI) putchar(','); resJsonString(resNames[resSeq2[resI]]); }
        printf("]}");
    }
    printf("}\n");
}
