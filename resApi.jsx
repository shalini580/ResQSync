// fetch helper, login token and live updates for every page
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const RES_TOKEN_KEY = 'resqsync_token';

export function resGetToken() {
  try {
    return localStorage.getItem(RES_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function resSetToken(resToken) {
  try {
    if (resToken) localStorage.setItem(RES_TOKEN_KEY, resToken);
    else localStorage.removeItem(RES_TOKEN_KEY);
  } catch {
    // private mode etc. - token just lives for this tab
  }
}

export async function resApi(resPath, { method: resMethod = 'GET', body: resBody } = {}) {
  const resToken = resGetToken();
  const resRes = await fetch(`/api${resPath}`, {
    method: resMethod,
    headers: { 'Content-Type': 'application/json', ...(resToken ? { Authorization: `Bearer ${resToken}` } : {}) },
    body: resBody ? JSON.stringify(resBody) : undefined,
  });
  const resData = await resRes.json().catch(() => ({}));
  if (!resRes.ok) throw Object.assign(new Error(resData.error || `Request failed (${resRes.status})`), { status: resRes.status });
  return resData;
}

// ------------------------------------------------------------------ live updates

const ResLiveContext = createContext(null);

// one Server-Sent Events connection for the whole app
export function ResLiveProvider({ children: resChildren }) {
  const resListeners = useRef(new Set());
  const [resConnected, resSetConnected] = useState(false);

  useEffect(() => {
    const resToken = resGetToken();
    if (!resToken) return undefined;
    const resSource = new EventSource(`/api/events?token=${encodeURIComponent(resToken)}`);
    resSource.onopen = () => resSetConnected(true);
    resSource.onerror = () => resSetConnected(false);
    resSource.addEventListener('data', (resEv) => {
      const resTopics = JSON.parse(resEv.data);
      resListeners.current.forEach((resFn) => resFn(resTopics));
    });
    return () => resSource.close();
  }, []);

  const resSubscribe = useCallback((resFn) => {
    resListeners.current.add(resFn);
    return () => resListeners.current.delete(resFn);
  }, []);

  return <ResLiveContext.Provider value={{ resSubscribe, resConnected }}>{resChildren}</ResLiveContext.Provider>;
}

export function resUseConnected() {
  return useContext(ResLiveContext)?.resConnected ?? false;
}

/** loads resPath and loads it again whenever the server says one of resTopics changed */
export function resUseLive(resPath, resTopics = []) {
  const resLive = useContext(ResLiveContext);
  const [resData, resSetData] = useState(null);
  const [resError, resSetError] = useState(null);
  const resTopicKey = resTopics.join(',');

  const resReload = useCallback(() => {
    if (!resPath) return;
    resApi(resPath)
      .then((resD) => {
        resSetData(resD);
        resSetError(null);
      })
      .catch((resE) => resSetError(resE.message));
  }, [resPath]);

  useEffect(() => {
    resReload();
    if (!resLive) return undefined;
    const resWanted = resTopicKey.split(',');
    return resLive.resSubscribe((resChanged) => {
      if (resChanged.includes('all') || resChanged.some((resT) => resWanted.includes(resT))) resReload();
    });
  }, [resReload, resLive, resTopicKey]);

  return { resData, resError, resReload };
}

// ------------------------------------------------------------------ shared constants

export const RES_ZONES = ['Zone A', 'Zone B', 'Zone C', 'Zone D'];
export const RES_TYPES = ['food', 'water', 'medicine', 'cots', 'vehicles'];
export const RES_LABEL = { food: 'Food', water: 'Water', medicine: 'Medicine', cots: 'Cots', vehicles: 'Vehicles' };
export const RES_UNIT = { food: 'meals', water: 'crates', medicine: 'kits', cots: 'cots', vehicles: 'vans' };
export const RES_PRIORITY = {
  1: 'P1 Critical',
  2: 'P2 High',
  3: 'P3 Medium',
  4: 'P4 Low',
};
export const RES_CASE_TYPES = ['flood', 'fire', 'earthquake', 'medical', 'other'];

export function resTimeAgo(resValue) {
  if (!resValue) return '';
  const resStr = String(resValue);
  const resT = new Date(resStr.includes('T') ? resStr : resStr.replace(' ', 'T') + 'Z').getTime();
  const resS = Math.round((Date.now() - resT) / 1000);
  if (resS < 0) {
    const resIn = -resS;
    return resIn < 3600 ? `in ${Math.ceil(resIn / 60)} min` : `in ${Math.round(resIn / 3600)} h`;
  }
  if (resS < 60) return `${resS}s ago`;
  if (resS < 3600) return `${Math.floor(resS / 60)} min ago`;
  if (resS < 86400) return `${Math.floor(resS / 3600)} h ago`;
  return `${Math.floor(resS / 86400)} d ago`;
}

export function resOrdinal(resN) {
  const resSuffix = ['th', 'st', 'nd', 'rd'];
  const resV = resN % 100;
  return resN + (resSuffix[(resV - 20) % 10] || resSuffix[resV] || resSuffix[0]);
}

export function resQtyText(resRow) {
  return RES_TYPES.filter((resK) => Number(resRow[resK]) > 0)
    .map((resK) => `${resRow[resK]} ${RES_LABEL[resK].toLowerCase()}`)
    .join(', ');
}
