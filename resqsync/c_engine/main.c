/*
 * ResQSync OS kernel - small command line program.
 * The Node server runs it once per request and reads the JSON it prints.
 *
 *   resqsync_kernel status
 *   resqsync_kernel schedule <fcfs|sjf|srtf|priority|rr> [quantum]   (processes on stdin)
 *   resqsync_kernel compare [quantum]                                 (processes on stdin)
 *   resqsync_kernel mutex <threads> <iterations>
 *   resqsync_kernel semaphore <producers> <consumers> <items> <buffer>
 *   resqsync_kernel pipe                                              (stock + requests on stdin)
 *   resqsync_kernel bankers                                           (matrices on stdin)
 *   resqsync_kernel deadlock                                          (matrices on stdin)
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "pcb.h"
#include "cpu_scheduler.h"
#include "synchronization.h"
#include "ipc_pipe.h"
#include "bankers_algorithm.h"
#include "deadlock.h"

static int resArgInt(int resArgc, char **resArgv, int resAt, int resDefault) {
    return resArgc > resAt ? atoi(resArgv[resAt]) : resDefault;
}

int main(int resArgc, char **resArgv) {
    if (resArgc < 2) {
        printf("{\"ok\":false,\"error\":\"no command given\"}\n");
        return 1;
    }
    const char *resCmd = resArgv[1];

    if (strcmp(resCmd, "status") == 0) {
        printf("{\"ok\":true,\"kernel\":\"ResQSync C kernel\",\"version\":\"1.0\","
               "\"modules\":[\"pcb\",\"cpu_scheduler\",\"synchronization\",\"ipc_pipe\",\"bankers_algorithm\",\"deadlock\"]}\n");
    } else if (strcmp(resCmd, "schedule") == 0 || strcmp(resCmd, "compare") == 0) {
        static resProcess resList[RES_MAX_PROC];
        int resCount = resReadProcesses(resList, RES_MAX_PROC);
        if (resCount == 0) {
            printf("{\"ok\":false,\"error\":\"no processes on stdin\"}\n");
            return 1;
        }
        if (resCmd[0] == 's') {
            const char *resAlgo = resArgc > 2 ? resArgv[2] : "priority";
            resPrintSchedule(resAlgo, resList, resCount, resArgInt(resArgc, resArgv, 3, 2));
        } else {
            resPrintCompare(resList, resCount, resArgInt(resArgc, resArgv, 2, 2));
        }
    } else if (strcmp(resCmd, "mutex") == 0) {
        resRunMutexDemo(resArgInt(resArgc, resArgv, 2, 4), resArgInt(resArgc, resArgv, 3, 20000));
    } else if (strcmp(resCmd, "semaphore") == 0) {
        resRunProducerConsumer(resArgInt(resArgc, resArgv, 2, 2), resArgInt(resArgc, resArgv, 3, 2),
                               resArgInt(resArgc, resArgv, 4, 5), resArgInt(resArgc, resArgv, 5, 3));
    } else if (strcmp(resCmd, "pipe") == 0) {
        resRunPipeDemo();
    } else if (strcmp(resCmd, "bankers") == 0) {
        resRunBankers();
    } else if (strcmp(resCmd, "deadlock") == 0) {
        resRunDeadlock();
    } else {
        printf("{\"ok\":false,\"error\":\"unknown command\"}\n");
        return 1;
    }
    return 0;
}
