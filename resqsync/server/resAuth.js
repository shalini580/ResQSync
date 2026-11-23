import jwt from 'jsonwebtoken';
import { resConfig } from './resConfig.js';

export function resSignToken(resUser) {
  return jwt.sign(
    { id: resUser.id, role: resUser.role, name: resUser.name, zone: resUser.zone },
    resConfig.resJwtSecret,
    { expiresIn: '12h' }
  );
}

// checks the token and, if roles are given, that the user has one of them
export function resRequireAuth(...resRoles) {
  return (resReq, resRes, resNext) => {
    const resHeader = resReq.headers.authorization || '';
    const resToken = resHeader.startsWith('Bearer ') ? resHeader.slice(7) : resReq.query.token;
    if (!resToken) return resRes.status(401).json({ error: 'Please sign in first' });
    try {
      resReq.user = jwt.verify(resToken, resConfig.resJwtSecret);
    } catch {
      return resRes.status(401).json({ error: 'Your session has expired, sign in again' });
    }
    if (resRoles.length && !resRoles.includes(resReq.user.role)) {
      return resRes.status(403).json({ error: 'Your role is not allowed to do this' });
    }
    resNext();
  };
}
