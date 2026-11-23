#ifndef RES_IPC_PIPE_H
#define RES_IPC_PIPE_H

/*
 * Two processes talk through pipes:
 *   parent (request desk)  --pipe 1-->  child (allocator)
 *   parent                 <--pipe 2--  child
 * stdin: "food water" stock, then N, then N lines "name food water".
 */
void resRunPipeDemo(void);

#endif
