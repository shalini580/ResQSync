#ifndef RES_BANKERS_H
#define RES_BANKERS_H

/*
 * stdin:
 *   n m
 *   available (m numbers)
 *   max        (n rows of m)
 *   allocation (n rows of m)
 *   hasRequest (0/1)  [process r1 .. rm]
 *   names      (n words, optional)
 */
void resRunBankers(void);

#endif
