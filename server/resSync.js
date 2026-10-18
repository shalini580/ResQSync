// Mutex, Semaphore and Condition variable for the allocator.
//
// Node runs our JS on one thread, but every `await` (a DB call, a timer) lets
// another task run in between. So two workers can still read the same stock
// and both hand it out - a real race. These classes stop that the same way
// the OS versions do.

export class ResMutex {
  constructor(resName) {
    this.resName = resName;
    this.resLocked = false;
    this.resOwner = null;
    this.resWaiters = []; // FIFO, so nobody waits forever
  }

  resLock(resOwner = 'someone') {
    if (!this.resLocked) {
      this.resLocked = true;
      this.resOwner = resOwner;
      return Promise.resolve();
    }
    return new Promise((resResolve) => this.resWaiters.push({ resResolve, resOwner }));
  }

  resUnlock() {
    const resNext = this.resWaiters.shift();
    if (resNext) {
      // hand the lock straight to the next one in line, it never becomes "free" in between
      this.resOwner = resNext.resOwner;
      resNext.resResolve();
    } else {
      this.resLocked = false;
      this.resOwner = null;
    }
  }

  async resRun(resOwner, resFn) {
    await this.resLock(resOwner);
    try {
      return await resFn();
    } finally {
      this.resUnlock();
    }
  }

  resSnapshot() {
    return {
      name: this.resName,
      locked: this.resLocked,
      owner: this.resOwner,
      waiting: this.resWaiters.map((resW) => resW.resOwner),
    };
  }
}

export class ResSemaphore {
  constructor(resName, resStart) {
    this.resName = resName;
    this.resValue = resStart;
    this.resWaiters = [];
  }

  // P / down - sleep while the value is 0
  resWait() {
    if (this.resValue > 0) {
      this.resValue -= 1;
      return Promise.resolve();
    }
    return new Promise((resResolve) => this.resWaiters.push(resResolve));
  }

  // V / up - wake one sleeper, or bump the count
  resSignal() {
    const resNext = this.resWaiters.shift();
    if (resNext) resNext();
    else this.resValue += 1;
  }

  resSnapshot() {
    return { name: this.resName, value: this.resValue, blocked: this.resWaiters.length };
  }
}

export class ResCondition {
  constructor(resName) {
    this.resName = resName;
    this.resWaiters = [];
  }

  // caller must hold resMutex. Joining the list and unlocking happen together,
  // so a signal can't slip in between (no lost wake-up). We re-lock before returning.
  resWait(resMutex, resLabel, resPriority = 0, resTieBreak = 0) {
    return new Promise((resResolve) => {
      this.resWaiters.push({ resResolve, resLabel, resPriority, resTieBreak });
      resMutex.resUnlock();
    }).then(() => resMutex.resLock(resLabel));
  }

  // wake everyone, most urgent first (P1 before P4, then smaller id)
  resBroadcast() {
    const resAll = this.resWaiters.sort(
      (resA, resB) => resA.resPriority - resB.resPriority || resA.resTieBreak - resB.resTieBreak
    );
    this.resWaiters = [];
    resAll.forEach((resW) => resW.resResolve());
    return resAll.length;
  }

  resSnapshot() {
    return { name: this.resName, waiting: this.resWaiters.map((resW) => resW.resLabel) };
  }
}
