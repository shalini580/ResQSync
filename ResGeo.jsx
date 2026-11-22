// The simulated city on the client side: 20 km x 20 km, four 10 km zones,
// one depot (the stock warehouse) in the middle of each zone.
// Same numbers as server/resGeo.js.
import { useEffect, useState } from 'react';
import { resApi, RES_PRIORITY } from '../resApi.jsx';

export const RES_ZONE_ORIGIN = { 'Zone A': [0, 0], 'Zone B': [10, 0], 'Zone C': [0, 10], 'Zone D': [10, 10] };
export const RES_ZONE_SIZE = 10;

export function resDepotOf(resZone) {
  const [resX, resY] = RES_ZONE_ORIGIN[resZone] || [0, 0];
  return [resX + RES_ZONE_SIZE / 2, resY + RES_ZONE_SIZE / 2];
}

export function resDistance(resZone, resX, resY) {
  const [resDx, resDy] = resDepotOf(resZone);
  return Math.hypot(resX - resDx, resY - resDy);
}

const resPct = (resV) => `${Math.round(Number(resV) * 100)}%`;

/** ML risk, distance and people as small chips (used on queue cards) */
export function ResInsightChips({ row: resR }) {
  if (resR.risk === undefined) return null;
  const resRiskTone = resR.risk >= 0.85 ? 'hi' : resR.risk >= 0.5 ? 'mid' : 'lo';
  return (
    <div className="insight">
      <span className={`ichip risk-${resRiskTone}`} title="Probability from the ML model that this becomes critical if it waits">
        ML risk {resPct(resR.risk)}
      </span>
      {resR.distance !== null && resR.distance !== undefined && (
        <span className="ichip" title="Straight-line distance from the zone depot">{Number(resR.distance).toFixed(1)} km from depot</span>
      )}
      {resR.people_affected !== undefined && <span className="ichip">{resR.people_affected} people</span>}
      <span className="ichip" title="0.6 x risk + 0.4 x nearness. Breaks ties inside the same priority">score {Number(resR.score).toFixed(2)}</span>
      {resR.mlBoost > 0 && <span className="ichip ml-up" title="Risk is above the promotion threshold, so it is served one level higher">ML ↑ P{resR.priority - 1}</span>}
    </div>
  );
}

/**
 * Click inside the zone to say where the incident is. 1 square = 1 km.
 * The cross in the middle is the depot the supplies leave from.
 */
export function ResLocationPicker({ zone: resZone, x: resX, y: resY, onPick: resOnPick }) {
  const [resOx, resOy] = RES_ZONE_ORIGIN[resZone] || [0, 0];
  const resSize = 200;
  const resScale = resSize / RES_ZONE_SIZE;
  const resHas = resX !== '' && resY !== '' && resX !== null && resY !== null && resX !== undefined;
  const resPx = resHas ? (Number(resX) - resOx) * resScale : null;
  const resPy = resHas ? (Number(resY) - resOy) * resScale : null;

  function resClick(resE) {
    const resBox = resE.currentTarget.getBoundingClientRect();
    const resKx = resOx + ((resE.clientX - resBox.left) / resBox.width) * RES_ZONE_SIZE;
    const resKy = resOy + ((resE.clientY - resBox.top) / resBox.height) * RES_ZONE_SIZE;
    resOnPick(Math.round(resKx * 10) / 10, Math.round(resKy * 10) / 10);
  }

  return (
    <div className="picker">
      <svg viewBox={`0 0 ${resSize} ${resSize}`} className="picker-map" onClick={resClick} role="img"
        aria-label={`Map of ${resZone}. Click where the incident is.`}>
        <rect x="0" y="0" width={resSize} height={resSize} className="picker-bg" />
        {Array.from({ length: RES_ZONE_SIZE - 1 }, (_, resI) => (resI + 1) * resScale).map((resG) => (
          <g key={resG}>
            <line x1={resG} y1="0" x2={resG} y2={resSize} className="picker-grid" />
            <line x1="0" y1={resG} x2={resSize} y2={resG} className="picker-grid" />
          </g>
        ))}
        <circle cx={resSize / 2} cy={resSize / 2} r={resScale * 2.5} className="picker-ring" />
        <path d={`M${resSize / 2 - 7} ${resSize / 2}h14M${resSize / 2} ${resSize / 2 - 7}v14`} className="picker-depot" />
        {resHas && (
          <>
            <line x1={resSize / 2} y1={resSize / 2} x2={resPx} y2={resPy} className="picker-line" />
            <circle cx={resPx} cy={resPy} r="7" className="picker-dot" />
          </>
        )}
      </svg>
      <div className="picker-side small">
        <strong>{resZone}</strong>
        <span className="muted">Click the map where it happened. + is the depot.</span>
        {resHas ? (
          <span>
            ({Number(resX).toFixed(1)}, {Number(resY).toFixed(1)}) km
            <br />
            <strong>{resDistance(resZone, Number(resX), Number(resY)).toFixed(1)} km</strong> from the depot
          </span>
        ) : (
          <span className="muted">No spot picked: a random spot in the zone is used.</span>
        )}
      </div>
    </div>
  );
}

/** live "what will the scheduler do with this" preview while the form is filled in */
export function ResRiskPreview({ form: resF }) {
  const [resOut, resSetOut] = useState(null);
  const resKey = JSON.stringify(resF);
  useEffect(() => {
    const resT = setTimeout(() => {
      resApi('/ml/predict', { method: 'POST', body: resF }).then(resSetOut).catch(() => resSetOut(null));
    }, 250);
    return () => clearTimeout(resT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resKey]);
  if (!resOut) return null;
  return (
    <div className={`risk-preview${resOut.promoted ? ' is-up' : ''}`} aria-live="polite">
      <div>
        <span className="num big">{resPct(resOut.risk)}</span>
        <span className="muted small">ML risk</span>
      </div>
      <div>
        <span className="num big">{resOut.distance.toFixed(1)}</span>
        <span className="muted small">km to depot</span>
      </div>
      <div>
        <span className="num big">{resOut.score.toFixed(2)}</span>
        <span className="muted small">queue score</span>
      </div>
      <p className="small">
        {resOut.promoted
          ? `Risk is above the threshold, so the scheduler will serve it as ${RES_PRIORITY[resOut.effective]}.`
          : `Served as ${RES_PRIORITY[resOut.effective]}. Inside that level, higher score goes first.`}
      </p>
    </div>
  );
}
