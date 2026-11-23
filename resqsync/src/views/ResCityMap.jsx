import { useEffect, useState } from 'react';
import { resApi, resUseLive, RES_ZONES, RES_LABEL, resQtyText } from '../resApi.jsx';
import { ResPage, ResPriority } from '../components/ResShared.jsx';
import { RES_ZONE_ORIGIN, RES_ZONE_SIZE, resDepotOf, ResInsightChips } from '../components/ResGeo.jsx';

// the simulated city: four zones in a 2 x 2 grid, a pin for every open case
const RES_BOX = { 'Zone A': [20, 20], 'Zone B': [420, 20], 'Zone C': [20, 280], 'Zone D': [420, 280] };
const RES_W = 380;
const RES_H = 240;

export default function ResCityMap({ user: resUser }) {
  const { resData: resQueue } = resUseLive('/queue', ['queue']);
  const { resData: resStock } = resUseLive('/resources', ['stock']);
  const { resData: resLayout } = resUseLive('/city/layout', ['roads']);
  const [resPicked, resSetPicked] = useState(null);
  const [resRoute, resSetRoute] = useState(null);
  const [resRoadMode, resSetRoadMode] = useState(false);
  const [resRoadMsg, resSetRoadMsg] = useState('');
  const resIsAdmin = resUser?.role === 'admin';

  // fastest route (Dijkstra on the road grid) from the depot to the picked pin
  const resClosedCount = resLayout?.closures?.length ?? 0;
  useEffect(() => {
    if (!resPicked) { resSetRoute(null); return; }
    const [resDx, resDy] = resDepotOf(resPicked.zone);
    const resX = resPicked.loc_x ?? resDx;
    const resY = resPicked.loc_y ?? resDy;
    resApi(`/route?zone=${encodeURIComponent(resPicked.zone)}&x=${resX}&y=${resY}`).then(resSetRoute).catch(() => resSetRoute(null));
  }, [resPicked, resClosedCount]);

  // km inside the city -> pixels inside the zone box
  const resToSvg = (resZone, resKx, resKy) => {
    const [resBx, resBy] = RES_BOX[resZone];
    const [resOx, resOy] = RES_ZONE_ORIGIN[resZone];
    return [resBx + ((resKx - resOx) / RES_ZONE_SIZE) * RES_W, resBy + ((resKy - resOy) / RES_ZONE_SIZE) * RES_H];
  };
  const resFromSvg = (resSx, resSy) => {
    for (const resZ of RES_ZONES) {
      const [resBx, resBy] = RES_BOX[resZ];
      if (resSx >= resBx && resSx <= resBx + RES_W && resSy >= resBy && resSy <= resBy + RES_H) {
        const [resOx, resOy] = RES_ZONE_ORIGIN[resZ];
        return [resOx + ((resSx - resBx) / RES_W) * RES_ZONE_SIZE, resOy + ((resSy - resBy) / RES_H) * RES_ZONE_SIZE];
      }
    }
    return null;
  };
  const resZoneOfKm = (resKx, resKy) => RES_ZONES.find((resZ) => {
    const [resOx, resOy] = RES_ZONE_ORIGIN[resZ];
    return resKx >= resOx && resKx <= resOx + RES_ZONE_SIZE && resKy >= resOy && resKy <= resOy + RES_ZONE_SIZE;
  });
  const resPath = (resPts, resZone) => resPts.map(([resKx, resKy], resI) => `${resI ? 'L' : 'M'}${resToSvg(resZone, resKx, resKy).join(',')}`).join('');

  async function resMapClick(resE) {
    if (!resRoadMode) return;
    const resSvg = resE.currentTarget;
    const resPt = resSvg.createSVGPoint();
    resPt.x = resE.clientX;
    resPt.y = resE.clientY;
    const resLocal = resPt.matrixTransform(resSvg.getScreenCTM().inverse());
    const resKm = resFromSvg(resLocal.x, resLocal.y);
    if (!resKm) return;
    try {
      const resOut = await resApi('/admin/roads/toggle', { method: 'POST', body: { x: resKm[0], y: resKm[1] } });
      resSetRoadMsg(`${resOut.closed ? 'Closed' : 'Reopened'} ${resOut.segments} street segments near (${resKm[0].toFixed(1)}, ${resKm[1].toFixed(1)}) km.`);
    } catch (resErr) {
      resSetRoadMsg(resErr.message);
    }
  }

  const resPins = (resQueue || []).map((resQ, resI) => {
    const [resDx, resDy] = resDepotOf(resQ.zone);
    const resKx = resQ.loc_x === null || resQ.loc_x === undefined ? resDx : Number(resQ.loc_x);
    const resKy = resQ.loc_y === null || resQ.loc_y === undefined ? resDy : Number(resQ.loc_y);
    const [resCx, resCy] = resToSvg(resQ.zone, resKx, resKy);
    return { ...resQ, resCx, resCy, resI };
  });

  const resLevel = (resZone) => {
    const resRows = (resStock || []).filter((resS) => resS.zone === resZone && ['food', 'water', 'medicine'].includes(resS.resource_type));
    const resLeft = resRows.reduce((resA, resR) => resA + resR.available, 0);
    const resAll = resRows.reduce((resA, resR) => resA + resR.available + resR.allocated, 0);
    return resAll ? Math.round((100 * resLeft) / resAll) : 0;
  };

  return (
    <ResPage title="City map & routes" intro="The simulated city is 20 km x 20 km. Every pin is an open case or NGO request at its real spot, coloured by priority. D is the zone depot the supplies leave from. Click a pin to see the fastest road route (Dijkstra) and what it still needs.">
      {resIsAdmin && (
        <div className="road-tools">
          <label className="switch"><input type="checkbox" checked={resRoadMode} onChange={(resE) => { resSetRoadMode(resE.target.checked); resSetRoadMsg(''); }} /> Close or reopen roads by clicking the map</label>
          {resClosedCount > 0 && <button className="btn small-btn" onClick={() => resApi('/admin/roads/clear', { method: 'POST' }).then(() => resSetRoadMsg('All roads are open again.'))}>Open all roads</button>}
          {resRoadMsg && <span className="small muted" aria-live="polite">{resRoadMsg}</span>}
        </div>
      )}
      <div className="map-wrap">
        <svg viewBox="0 0 820 540" className={`city-map${resRoadMode ? ' road-mode' : ''}`} role="img" aria-label="Map of the four city zones with open cases, roads and the river" onClick={resMapClick}>
          {RES_ZONES.map((resZ) => {
            const [resX, resY] = RES_BOX[resZ];
            const resPct = resLevel(resZ);
            return (
              <g key={resZ}>
                <rect x={resX} y={resY} width={RES_W} height={RES_H} rx="10" className="map-zone" />
                <clipPath id={`clip-${resZ.replace(' ', '')}`}><rect x={resX} y={resY} width={RES_W} height={RES_H} rx="10" /></clipPath>
                <g clipPath={`url(#clip-${resZ.replace(' ', '')})`}>
                  {(() => {
                    const [resDx, resDy] = resToSvg(resZ, ...resDepotOf(resZ));
                    return <path d={`M${resX},${resDy}H${resX + RES_W}M${resDx},${resY}V${resY + RES_H}`} className="map-mainroad" />;
                  })()}
                  {resLayout && <path d={resPath(resLayout.river, resZ)} className="map-river" />}
                  {resLayout?.bridges.filter(([resBx, resBy]) => resZoneOfKm(resBx, resBy) === resZ).map(([resBx, resBy]) => {
                    const [resSx, resSy] = resToSvg(resZ, resBx, resBy);
                    return <rect key={resBx} x={resSx - 4} y={resSy - 12} width="8" height="24" rx="2" className="map-bridge"><title>Bridge</title></rect>;
                  })}
                  {resLayout?.closures.filter(([resA]) => resZoneOfKm(...resA) === resZ).map(([resA, resB2]) => (
                    <path key={`${resA}${resB2}`} d={resPath([resA, resB2], resZ)} className="map-closed" />
                  ))}
                </g>
                <text x={resX + 16} y={resY + 32} className="map-zone-name">{resZ}</text>
                <text x={resX + 16} y={resY + 54} className="map-zone-sub">Stock left {resPct}%</text>
                <rect x={resX + 16} y={resY + 64} width="160" height="6" rx="3" className="map-bar-bg" />
                <rect x={resX + 16} y={resY + 64} width={1.6 * resPct} height="6" rx="3" className={`map-bar ${resPct < 25 ? 'low' : ''}`} />
                {(() => {
                  const [resDx, resDy] = resToSvg(resZ, ...resDepotOf(resZ));
                  return (
                    <g className="map-depot">
                      <rect x={resDx - 11} y={resDy - 11} width="22" height="22" rx="3" />
                      <text x={resDx} y={resDy + 5}>D</text>
                    </g>
                  );
                })()}
              </g>
            );
          })}
          {resPicked && resRoute?.reachable && <path d={resPath(resRoute.path, resPicked.zone)} className="map-route" />}
          {resPins.map((resP) => (
            <g key={`${resP.kind}${resP.id}`} className="map-pin" onClick={(resE) => { if (resRoadMode) return; resE.stopPropagation(); resSetPicked(resP); }} tabIndex="0"
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
              <p className="muted small">Filled circle = emergency case, dashed ring = NGO request. The number is the priority. D = depot.</p>
              <ul className="legend">
                {[1, 2, 3, 4].map((resP) => <li key={resP}><span className={`dot p${resP}`} /> <ResPriority value={resP} /></li>)}
              </ul>
              <p className="muted small">{resQueue?.length ?? 0} open on the map.</p>
              <p className="muted small">Thick grey lines are main roads (60 km/h), other streets 30 km/h. The blue line is the river: it can only be crossed on a bridge. Red streets are closed.</p>
            </>
          ) : (
            <>
              <h2>{resPicked.process_id}</h2>
              <p><ResPriority value={resPicked.priority} /> <span className="muted">{resPicked.zone}, {resPicked.kind === 'case' ? 'emergency case' : 'NGO request'}</span></p>
              <p><strong>{resPicked.title}</strong></p>
              <p className="muted small">{resPicked.owner}</p>
              <ResInsightChips row={resPicked} />
              {resRoute && (
                <div className="route-box">
                  <h3>Fastest route from the depot</h3>
                  {resRoute.reachable ? (
                    <p className="small">
                      <span className="num route-num">{resRoute.minutes} min</span> {resRoute.km} km by road (straight line {resRoute.straightKm} km)
                      {resRoute.bridges.length ? `, crosses the river on the bridge at x = ${resRoute.bridges.join(', ')} km` : ''}.
                      <span className="muted"> Dijkstra checked {resRoute.visited} junctions{resRoute.blockedEdges ? `, ${resRoute.blockedEdges} blocked street segments skipped` : ''}.</span>
                    </p>
                  ) : <p className="error small">No road reaches this spot: every way in is closed.</p>}
                </div>
              )}
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
