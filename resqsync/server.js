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
import { resExtraApi } from './server/resExtraRoutes.js';
import { resNewApi } from './server/resNewRoutes.js';
import { resStartForecastAlerts } from './server/resForecast.js';
import { resTrainModel } from './server/resModel.js';
import { resStartAutoBackup } from './server/resBackup.js';
import { resStartAutoArchive } from './server/resArchive.js';

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
  const resModel = resTrainModel();
  console.log(`[ml] risk model trained on ${resModel.samples} simulated incidents: test accuracy ${resModel.test.accuracy}% (priority-only rule ${resModel.baseline.accuracy}%)`);
  await resStartAllocator();
  resStartAutoBackup();
  resStartAutoArchive();
  resStartForecastAlerts();

  const resApp = express();
  resApp.use(express.json({ limit: '25mb' })); // backups can be uploaded for restore
  resApp.use('/api', resApi);
  resApp.use('/api', resExtraApi);
  resApp.use('/api', resNewApi);
  resApp.use('/api', resLabApi); // admin-only router, keep it last

  const resDist = path.resolve('dist');
  if (resIsProd && fs.existsSync(resDist)) {
    resApp.use(express.static(resDist));
    resApp.get('*', (_resReq, resRes) => resRes.sendFile(path.join(resDist, 'index.html')));
  } else {
    const { createServer: resCreateVite } = await import('vite');
    const resVite = await resCreateVite({ server: { middlewareMode: true }, appType: 'spa' });
    resApp.use(resVite.middlewares);
  }

  const resServer = resApp.listen(resConfig.resPort, () => {
    console.log(`\nResQSync running at http://localhost:${resConfig.resPort}\n`);
  });
  resServer.on('error', (resErr) => {
    if (resErr.code === 'EADDRINUSE') {
      console.error(`\nPort ${resConfig.resPort} is already in use - ResQSync is probably running in another terminal.`);
      console.error(`Stop it with Ctrl + C there, or run:  lsof -ti :${resConfig.resPort} | xargs kill -9\n`);
      process.exit(1);
    }
    throw resErr;
  });
}

resMain();
