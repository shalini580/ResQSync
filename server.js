// ResQSync server - Express API + Vite (React) on one port.
import express from 'express';
import path from 'path';
import fs from 'fs';
import { resConfig } from './server/resConfig.js';
import { resInitDatabase } from './server/resDb.js';
import { resSeed } from './server/resSeed.js';
import { resStartAllocator } from './server/resAllocator.js';
import { resBuildKernel } from './server/resKernel.js';
import { resApi } from './server/resRoutes.js';
import { resLabApi } from './server/resLabRoutes.js';

const resIsProd = process.argv.includes('--prod') || process.env.NODE_ENV === 'production';

async function resMain() {
  try {
    await resInitDatabase();
    await resSeed();
  } catch (resErr) {
    console.error('\n[db] Could not start the database:', resErr.message);
    console.error('[db] Check the DB_* values in .env, or set DB_ENGINE=sqlite to skip MySQL.\n');
    process.exit(1);
  }
  await resBuildKernel();
  await resStartAllocator();

  const resApp = express();
  resApp.use(express.json());
  resApp.use('/api', resApi);
  resApp.use('/api', resLabApi);

  const resDist = path.resolve('dist');
  if (resIsProd && fs.existsSync(resDist)) {
    resApp.use(express.static(resDist));
    resApp.get('*', (_resReq, resRes) => resRes.sendFile(path.join(resDist, 'index.html')));
  } else {
    const { createServer: resCreateVite } = await import('vite');
    const resVite = await resCreateVite({ server: { middlewareMode: true }, appType: 'spa' });
    resApp.use(resVite.middlewares);
  }

  resApp.listen(resConfig.resPort, () => {
    console.log(`\nResQSync running at http://localhost:${resConfig.resPort}\n`);
  });
}

resMain();
