// Database Configuration
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'emailflow.sqlite');

export const dbConfig = {
  path: DB_PATH,
  connectionOptions: {
    filename: DB_PATH,
    driver: 'sqlite3'
  },
  enableWAL: true, // Enable Write-Ahead Logging for better concurrency
  busyTimeout: 5000 // 5 seconds
};
