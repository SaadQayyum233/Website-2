import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import fs from 'fs';
import path from 'path';
import { dbConfig } from '../config/dbConfig';

// Ensure directory exists
const dbDir = path.dirname(dbConfig.path);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db: Database | null = null;

export async function getDatabase(): Promise<Database> {
  if (!db) {
    // Initialize database connection
    db = await open({
      filename: dbConfig.path,
      driver: sqlite3.Database
    });

    // Enable foreign keys
    await db.exec('PRAGMA foreign_keys = ON;');

    // Enable Write-Ahead Logging for better concurrency if configured
    if (dbConfig.enableWAL) {
      await db.exec('PRAGMA journal_mode = WAL;');
    }

    // Set busy timeout
    await db.exec(`PRAGMA busy_timeout = ${dbConfig.busyTimeout};`);

    // Initialize the database schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await db.exec(schema);
      console.log('Database schema initialized');
    } else {
      console.warn('Schema file not found. Database may not be properly initialized.');
    }
  }

  return db;
}

// Close database connection (useful for tests and graceful shutdown)
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}

// Transaction helper
export async function withTransaction<T>(callback: (db: Database) => Promise<T>): Promise<T> {
  const db = await getDatabase();
  
  try {
    await db.exec('BEGIN TRANSACTION');
    const result = await callback(db);
    await db.exec('COMMIT');
    return result;
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }
}
