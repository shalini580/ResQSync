# ResQSync C kernel
# The server builds this by itself on start. To build by hand:  make -C c_engine

CC ?= cc
CFLAGS = -std=gnu11 -O2 -Wall -Wextra -pthread
SRC = main.c pcb.c cpu_scheduler.c synchronization.c ipc_pipe.c bankers_algorithm.c deadlock.c

resqsync_kernel: $(SRC) *.h
	$(CC) $(CFLAGS) -o resqsync_kernel $(SRC)

clean:
	rm -f resqsync_kernel
