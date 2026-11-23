#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/wait.h>
#include "ipc_pipe.h"
#include "pcb.h"

#define RES_MAX_MSG 32

typedef struct {
    char resName[RES_NAME_LEN];
    int resFood, resWater;
} resPipeRequest;

void resRunPipeDemo(void) {
    int resStockFood = 0, resStockWater = 0, resN = 0;
    resPipeRequest resReqs[RES_MAX_MSG];

    if (scanf("%d %d %d", &resStockFood, &resStockWater, &resN) != 3 || resN < 1) {
        printf("{\"ok\":false,\"error\":\"bad input\"}\n");
        return;
    }
    if (resN > RES_MAX_MSG) resN = RES_MAX_MSG;
    for (int resI = 0; resI < resN; resI++) {
        if (scanf("%15s %d %d", resReqs[resI].resName, &resReqs[resI].resFood, &resReqs[resI].resWater) != 3) {
            resN = resI;
            break;
        }
    }

    int resToChild[2], resToParent[2];
    if (pipe(resToChild) < 0 || pipe(resToParent) < 0) {
        printf("{\"ok\":false,\"error\":\"pipe failed\"}\n");
        return;
    }
    fflush(stdout);  /* don't let the child inherit half a buffer */

    pid_t resChild = fork();
    if (resChild < 0) {
        printf("{\"ok\":false,\"error\":\"fork failed\"}\n");
        return;
    }

    if (resChild == 0) {
        /* ---- child: the allocator process. Reads requests, answers with what it gave. */
        close(resToChild[1]);
        close(resToParent[0]);
        FILE *resIn = fdopen(resToChild[0], "r");
        FILE *resOut = fdopen(resToParent[1], "w");
        char resName[RES_NAME_LEN];
        int resFood, resWater;
        while (fscanf(resIn, "%15s %d %d", resName, &resFood, &resWater) == 3) {
            int resGiveFood = resFood < resStockFood ? resFood : resStockFood;
            int resGiveWater = resWater < resStockWater ? resWater : resStockWater;
            resStockFood -= resGiveFood;
            resStockWater -= resGiveWater;
            fprintf(resOut, "%s %d %d %d %d %d\n", resName, resGiveFood, resGiveWater,
                    resStockFood, resStockWater, (int)getpid());
            fflush(resOut);
        }
        fclose(resIn);
        fclose(resOut);
        _exit(0);
    }

    /* ---- parent: the request desk. Sends every request, then reads the replies. */
    close(resToChild[0]);
    close(resToParent[1]);
    FILE *resOut = fdopen(resToChild[1], "w");
    FILE *resIn = fdopen(resToParent[0], "r");
    for (int resI = 0; resI < resN; resI++) {
        fprintf(resOut, "%s %d %d\n", resReqs[resI].resName, resReqs[resI].resFood, resReqs[resI].resWater);
    }
    fclose(resOut);   /* EOF tells the child we are done */

    printf("{\"ok\":true,\"parentPid\":%d,\"childPid\":%d,\"messages\":[", (int)getpid(), (int)resChild);
    char resName[RES_NAME_LEN];
    int resGf, resGw, resLf, resLw, resFrom, resI = 0;
    while (fscanf(resIn, "%15s %d %d %d %d %d", resName, &resGf, &resGw, &resLf, &resLw, &resFrom) == 6) {
        printf("%s{\"pid\":", resI ? "," : "");
        resJsonString(resName);
        printf(",\"askedFood\":%d,\"askedWater\":%d,\"gaveFood\":%d,\"gaveWater\":%d,"
               "\"stockFoodLeft\":%d,\"stockWaterLeft\":%d,\"answeredBy\":%d}",
               resReqs[resI].resFood, resReqs[resI].resWater, resGf, resGw, resLf, resLw, resFrom);
        resI++;
    }
    fclose(resIn);
    waitpid(resChild, NULL, 0);
    printf("]}\n");
}
