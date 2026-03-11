// Database connection pool for better performance and reusability
import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL || '';

let pool = null;

export function getPool() {
  if (!DATABASE_URL) return null;

  if (!pool) {
    pool = new pg.Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 20, // Max connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected pool error:', err);
    });
  }

  return pool;
}

export async function queryPool(sql, params = []) {
  const poolInstance = getPool();
  if (!poolInstance) throw new Error('Database pool not configured');
  
  return poolInstance.query(sql, params);
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
