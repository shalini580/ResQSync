#include "ipc_pipe.h"
#include <stdio.h>
#include <string.h>
#include <unistd.h>

int run_ipc_pipe_demo(char *out_msg, size_t out_size, size_t *bytes_transferred) {
    int pipefd[2];
    if (pipe(pipefd) == -1) {
        snprintf(out_msg, out_size, "Error: POSIX pipe() system call failed.");
        return -1;
    }

    const char *telemetry = "[IPC-KERNEL-PIPE] Sensor Beacon #12 -> Dispatcher Core: PID-101 Water Level Critical (4.2m). Auto-allocate 2 Rescue Vans.";
    size_t len = strlen(telemetry) + 1;

    ssize_t w = write(pipefd[1], telemetry, len);
    (void)w;
    close(pipefd[1]); // Close write end

    char read_buf[256] = {0};
    ssize_t r = read(pipefd[0], read_buf, sizeof(read_buf) - 1);
    close(pipefd[0]); // Close read end

    if (r > 0) {
        *bytes_transferred = (size_t)r;
        snprintf(out_msg, out_size, "%s (Transferred %zd bytes through 64KB POSIX unidirectional pipe buffer)", read_buf, r);
        return 0;
    }

    snprintf(out_msg, out_size, "Error: read() failed on POSIX pipe buffer.");
    return -1;
}
