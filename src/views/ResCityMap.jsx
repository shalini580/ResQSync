import { useState } from 'react';
import { resUseLive, RES_ZONES, RES_LABEL, resQtyText } from '../resApi.jsx';
import { ResPage, ResPriority } from '../components/ResShared.jsx';

// the simulated city: four zones in a 2 x 2 grid, a pin for every open case
const RES_BOX = { 'Zone A': [20, 20], 'Zone B': [420, 20], 'Zone C': [20, 280], 'Zone D': [420, 280] };
const RES_W = 380;
const RES_H = 240;

export default function ResCityMap() {
  const { resData: resQueue } = resUseLive('/queue', ['queue']);
  const { resData: resStock } = resUseLive('/resources', ['stock']);
  const [resPicked, resSetPicked] = useState(null);

  const resPins = (resQueue || []).map((resQ, resI) => {
    const [resX, resY] = RES_BOX[resQ.zone];
    // spread pins inside the zone in a simple grid
    const resInZone = (resQueue || []).filter((resO) => resO.zone === resQ.zone);
    const resIdx = resInZone.indexOf(resQ);
    return { ...resQ, resCx: resX + 50 + (resIdx % 6) * 55, resCy: resY + 110 + Math.floor(resIdx / 6) * 50, resI };
  });

  const resLevel = (resZone) => {
    const resRows = (resStock || []).filter((resS) => resS.zone === resZone && ['food', 'water', 'medicine'].includes(resS.resource_type));
    const resLeft = resRows.reduce((resA, resR) => resA + resR.available, 0);
    const resAll = resRows.reduce((resA, resR) => resA + resR.available + resR.allocated, 0);
    return resAll ? Math.round((100 * resLeft) / resAll) : 0;
  };

  return (
    <ResPage title="City map" intro="The simulated city. Every pin is an open emergency case or NGO request, coloured by priority. Click a pin to see what it still needs.">
      <div className="map-wrap">
        <svg viewBox="0 0 820 540" className="city-map" role="img" aria-label="Map of the four city zones with open cases">
          {RES_ZONES.map((resZ) => {
            const [resX, resY] = RES_BOX[resZ];
            const resPct = resLevel(resZ);
            return (
              <g key={resZ}>
                <rect x={resX} y={resY} width={RES_W} height={RES_H} rx="10" className="map-zone" />
                <text x={resX + 16} y={resY + 32} className="map-zone-name">{resZ}</text>
                <text x={resX + 16} y={resY + 54} className="map-zone-sub">Stock left {resPct}%</text>
                <rect x={resX + 16} y={resY + 64} width="160" height="6" rx="3" className="map-bar-bg" />
                <rect x={resX + 16} y={resY + 64} width={1.6 * resPct} height="6" rx="3" className={`map-bar ${resPct < 25 ? 'low' : ''}`} />
              </g>
            );
          })}
          {resPins.map((resP) => (
            <g key={`${resP.kind}${resP.id}`} className="map-pin" onClick={() => resSetPicked(resP)} tabIndex="0"
              onKeyDown={(resE) => resE.key === 'Enter' && resSetPicked(resP)}>
              <circle cx={resP.resCx} cy={resP.resCy} r="16" className={`pin p${resP.priority}${resP.kind === 'request' ? ' req' : ''}`} />
              <text x={resP.resCx} y={resP.resCy + 4} className="pin-text">{resP.priority}</text>
            </g>
          ))}
        </svg>
        <aside className="panel map-side">
          {!resPicked ? (
            <>
              <h2>Legend</h2>
              <p className="muted small">Filled circle = emergency case, ring = NGO request. The number is the priority.</p>
              <ul className="legend">
                {[1, 2, 3, 4].map((resP) => <li key={resP}><span className={`dot p${resP}`} /> <ResPriority value={resP} /></li>)}
              </ul>
              <p className="muted small">{resQueue?.length ?? 0} open on the map.</p>
            </>
          ) : (
            <>
              <h2>{resPicked.process_id}</h2>
              <p><ResPriority value={resPicked.priority} /> <span className="muted">{resPicked.zone}, {resPicked.kind === 'case' ? 'emergency case' : 'NGO request'}</span></p>
              <p><strong>{resPicked.title}</strong></p>
              <p className="muted small">{resPicked.owner}</p>
              <h3>Still needs</h3>
              <p>{resQtyText(resPicked) || 'Nothing'}</p>
              <h3>Zone stock</h3>
              <ul className="plain">
                {(resStock || []).filter((resS) => resS.zone === resPicked.zone).map((resS) => (
                  <li key={resS.resource_type}><span>{RES_LABEL[resS.resource_type]}</span><span className="num">{resS.available}</span></li>
                ))}
              </ul>
              <button className="link-btn dark" onClick={() => resSetPicked(null)}>Back to legend</button>
            </>
          )}
        </aside>
      </div>
    </ResPage>
  );
}
