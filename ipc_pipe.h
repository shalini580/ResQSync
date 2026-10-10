#ifndef RESQSYNC_IPC_PIPE_H
#define RESQSYNC_IPC_PIPE_H

#include <stddef.h>

/* Simulates Inter-Process Communication using POSIX Unidirectional Pipe */
int run_ipc_pipe_demo(char *out_msg, size_t out_size, size_t *bytes_transferred);

#endif /* RESQSYNC_IPC_PIPE_H */
