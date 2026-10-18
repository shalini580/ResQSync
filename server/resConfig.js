import dotenv from 'dotenv';
dotenv.config();

const resInt = (resValue, resDefault) => {
  const resNum = parseInt(resValue, 10);
  return Number.isFinite(resNum) ? resNum : resDefault;
};

export const resConfig = {
  resPort: resInt(process.env.PORT, 3000),
  resJwtSecret: process.env.JWT_SECRET || 'resqsync-dev-secret-change-me',

  // auto = try MySQL first, fall back to SQLite if it can't connect
  resDbEngine: (process.env.DB_ENGINE || 'auto').toLowerCase(),
  resMysql: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: resInt(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'resqsync_final',
  },
  resSqliteFile: process.env.DB_FILE || 'data/resqsync.db',

  resAllocator: {
    resWorkers: resInt(process.env.ALLOCATOR_WORKERS, 2),
    resBufferSize: resInt(process.env.QUEUE_CAPACITY, 8),
    resWorkDelayMs: resInt(process.env.WORK_DELAY_MS, 2000),
    resAgingMs: resInt(process.env.AGING_MS, 30000),
    resAuto: process.env.AUTO_ALLOCATE === 'true',
  },
};

export const RES_ZONES = ['Zone A', 'Zone B', 'Zone C', 'Zone D'];
export const RES_TYPES = ['food', 'water', 'medicine', 'cots', 'vehicles'];
export const RES_UNITS = {
  food: 'Ration meals',
  water: 'Water crates (20L)',
  medicine: 'Trauma kits',
  cots: 'Emergency cots',
  vehicles: 'Rescue vans',
};
