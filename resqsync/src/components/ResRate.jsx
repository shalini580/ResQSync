// Star ratings after a delivery. One rating per person per delivery
// (UNIQUE key in the feedback table); 1-2 stars fire trg_low_rating_alert.
import { useState } from 'react';
import { resApi, resUseLive } from '../resApi.jsx';

export function resUseGiven() {
  const { resData } = resUseLive('/feedback/mine', ['feedback']);
  return resData;
}

export function ResStars({ value: resValue, count: resCount }) {
  if (resValue === null || resValue === undefined) return <span className="muted small">no ratings</span>;
  const resV = Number(resValue);
  return (
    <span className="stars-read" title={`${resV.toFixed(1)} out of 5`}>
      {'★★★★★'.slice(0, Math.round(resV))}
      <span className="stars-off">{'★★★★★'.slice(Math.round(resV))}</span>
      <span className="muted small"> {resV.toFixed(1)}{resCount ? ` (${resCount})` : ''}</span>
    </span>
  );
}

export function ResRateBox({ context: resContext, contextId: resId, label: resLabel, mine: resMine }) {
  const [resPick, resSetPick] = useState(0);
  const [resHover, resSetHover] = useState(0);
  const [resComment, resSetComment] = useState('');
  const [resMsg, resSetMsg] = useState(null);
  const [resBusy, resSetBusy] = useState(false);

  const resDone = (resMine?.given || []).find((resG) => resG.context === resContext && Number(resG.context_id) === Number(resId));
  if (resDone) {
    return <span className="rated small">You rated {resLabel.toLowerCase()} <span className="stars-read">{'★'.repeat(resDone.rating)}</span></span>;
  }

  async function resSend() {
    resSetBusy(true);
    resSetMsg(null);
    try {
      await resApi('/feedback', { method: 'POST', body: { context: resContext, context_id: resId, rating: resPick, comment: resComment } });
    } catch (resErr) {
      resSetMsg(resErr.message);
    } finally {
      resSetBusy(false);
    }
  }

  return (
    <div className="rate">
      <span className="small">{resLabel}</span>
      <div className="stars" onMouseLeave={() => resSetHover(0)} role="radiogroup" aria-label={resLabel}>
        {[1, 2, 3, 4, 5].map((resS) => (
          <button key={resS} type="button" role="radio" aria-checked={resPick === resS} aria-label={`${resS} star${resS > 1 ? 's' : ''}`}
            className={resS <= (resHover || resPick) ? 'on' : ''} onMouseEnter={() => resSetHover(resS)} onClick={() => resSetPick(resS)}>
            ★
          </button>
        ))}
      </div>
      {resPick > 0 && (
        <>
          <input className="rate-comment" value={resComment} onChange={(resE) => resSetComment(resE.target.value)} placeholder="Comment (optional)" maxLength={255} />
          <button className="btn small-btn primary" disabled={resBusy} onClick={resSend}>Send</button>
        </>
      )}
      {resMsg && <span className="error small">{resMsg}</span>}
    </div>
  );
}
