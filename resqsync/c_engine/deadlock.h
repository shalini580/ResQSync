#ifndef RES_DEADLOCK_H
#define RES_DEADLOCK_H

/*
 * Deadlock DETECTION + RECOVERY.
 * stdin:
 *   n m
 *   available   (m)
 *   allocation  (n rows of m)
 *   request     (n rows of m)  - what each process is still waiting for
 *   priority    (n numbers, 1 = most important)
 *   names       (n words, optional)
 */
void resRunDeadlock(void);

#endif
