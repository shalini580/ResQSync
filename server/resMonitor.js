// Small event bus. The allocator writes what it is doing here and the
// browser gets it live through /api/events.
import { EventEmitter } from 'events';

export const resBus = new EventEmitter();
resBus.setMaxListeners(300);

const resLog = [];
let resLogSeq = 0;

// kind: info | lock | wait | wake | alloc | done | error
export function resSyncLog(resKind, resMessage) {
  resLog.push({ id: ++resLogSeq, kind: resKind, message: resMessage, at: new Date().toISOString() });
  if (resLog.length > 200) resLog.shift();
  resBus.emit('data', 'sync');
}

export function resRecentLog(resLimit = 60) {
  return resLog.slice(-resLimit).reverse();
}

// tell every open page that some data changed
export function resChanged(resTopic) {
  resBus.emit('data', resTopic);
}
