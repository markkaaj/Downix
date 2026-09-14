import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { drizzle as drizzlePgLite } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import * as schema from './schema.js';
import * as dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';

const { Pool } = pg;

const DEFAULT_DATABASE_URL = "";

export function getActiveDatabaseUrl(): string {
  // 1. Check if process.env.DATABASE_URL is set and not known expired URLs
  if (
    process.env.DATABASE_URL &&
    !process.env.DATABASE_URL.includes("sakura.proxy.rlwy.net:26401") &&
    !process.env.DATABASE_URL.includes("db.swsdqhqmuqbhyykiymif.supabase.co")
  ) {
    return process.env.DATABASE_URL.trim();
  }

  // 2. Check if .env or .env.example contains a valid DATABASE_URL
  const envFiles = [path.join(process.cwd(), ".env"), path.join(process.cwd(), ".env.example")];
  for (const file of envFiles) {
    if (fs.existsSync(file)) {
      try {
        const content = fs.readFileSync(file, "utf-8");
        const match = content.match(/^DATABASE_URL=(.+)$/m);
        if (match && match[1]) {
          const url = match[1].trim();
          if (
            url &&
            !url.includes("sakura.proxy.rlwy.net:26401") &&
            !url.includes("db.swsdqhqmuqbhyykiymif.supabase.co") &&
            (url.startsWith("postgres://") || url.startsWith("postgresql://"))
          ) {
            return url;
          }
        }
      } catch (_) {}
    }
  }

  return "";
}

export function parseAndCreatePool(connectionUrl: string): pg.Pool {
  let cleanUrl = (connectionUrl || "").trim();
  if (!cleanUrl) {
    cleanUrl = getActiveDatabaseUrl();
  }

  // Remove surrounding brackets if user pasted password as [password] e.g. postgres:[password]@host
  cleanUrl = cleanUrl.replace(/:\[([^\]]+)\]@/, (match, p1) => ":" + encodeURIComponent(p1) + "@");

  let newPool: pg.Pool;

  try {
    if (!cleanUrl) {
      newPool = new Pool({ connectionTimeoutMillis: 1000 });
    } else {
      const parsed = new URL(cleanUrl);
      const host = parsed.hostname;
      const isSsl = host.includes("supabase.co") || 
                    host.includes("neon.tech") || 
                    host.includes("pooler.supabase.com") ||
                    host.includes("aivencloud.com") ||
                    cleanUrl.includes("sslmode=require");

      newPool = new Pool({
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        host: parsed.hostname,
        port: parseInt(parsed.port || "5432", 10),
        database: parsed.pathname.replace(/^\//, "") || "postgres",
        ssl: isSsl ? { rejectUnauthorized: false } : undefined,
        connectionTimeoutMillis: 3500,
        idleTimeoutMillis: 10000,
      });
    }
  } catch (err) {
    newPool = new Pool({
      connectionString: cleanUrl || undefined,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 3500,
      idleTimeoutMillis: 10000,
    });
  }

  // Catch connection errors on idle pool clients so it does not trigger unhandled ECONNRESET
  newPool.on('error', (err: any) => {
    console.warn('[Database] Remote connection notification:', err?.message || err);
  });

  return newPool;
}

const INIT_SQL = `
CREATE TABLE IF NOT EXISTS users (
  chat_id bigint PRIMARY KEY,
  lang text NOT NULL DEFAULT 'en',
  username text
);

CREATE TABLE IF NOT EXISTS subscriptions (
  chat_id bigint PRIMARY KEY,
  is_lifetime boolean NOT NULL DEFAULT false,
  expiry bigint
);

CREATE TABLE IF NOT EXISTS referrals (
  chat_id bigint PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  days integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS usage (
  id serial PRIMARY KEY,
  chat_id bigint NOT NULL,
  date text NOT NULL,
  count integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS support_map (
  admin_message_id integer PRIMARY KEY,
  original_chat_id bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS support_state (
  chat_id bigint PRIMARY KEY,
  is_waiting boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS history (
  id serial PRIMARY KEY,
  chat_id bigint NOT NULL,
  url text NOT NULL,
  title text NOT NULL,
  platform text NOT NULL,
  date bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS gift_codes (
  id text PRIMARY KEY,
  duration_days integer NOT NULL,
  max_usages integer NOT NULL,
  used_count integer NOT NULL DEFAULT 0,
  created_at bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS used_gift_codes (
  id serial PRIMARY KEY,
  code_id text NOT NULL,
  chat_id bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_history_chat_id ON history(chat_id);
CREATE INDEX IF NOT EXISTS idx_usage_chat_date ON usage(chat_id, date);
CREATE INDEX IF NOT EXISTS idx_used_gift_codes ON used_gift_codes(code_id, chat_id);
`;

// Initialize persistent local storage directory
const dataDir = path.join(process.cwd(), 'data', 'db');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Clean up any stale postmaster.pid lock file in data directory to prevent PGlite startup crashes
try {
  const lockFile = path.join(dataDir, 'postmaster.pid');
  if (fs.existsSync(lockFile)) {
    fs.unlinkSync(lockFile);
  }
} catch (_) {}

let localPglite: PGlite;
try {
  localPglite = new PGlite(dataDir);
} catch (e) {
  console.warn('[Database] Failed to open local data dir, falling back to in-memory PGlite:', e);
  localPglite = new PGlite();
}

let localDrizzle = drizzlePgLite(localPglite, { schema });

// Read active remote DATABASE_URL
const rawUrl = getActiveDatabaseUrl();
export const pool = parseAndCreatePool(rawUrl);
const remoteDrizzle = drizzlePg(pool, { schema });

// Active DB instance reference (defaults to local fallback, upgraded to remote when healthy)
let activeDrizzleInstance: any = localDrizzle;
let isRemoteHealthy = false;
let initPromise: Promise<void> | null = null;

// Proxy DB export ensuring seamless operation regardless of database backend
export const db = new Proxy({}, {
  get(target, prop, receiver) {
    const targetDb = activeDrizzleInstance;
    const value = Reflect.get(targetDb, prop);
    return typeof value === 'function' ? value.bind(targetDb) : value;
  }
}) as ReturnType<typeof drizzlePg<typeof schema>>;

/**
 * Automatically initializes database tables with resilient fallback
 */
export async function ensureDatabaseTables(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // 1. Initialize local database tables first (guarantees zero downtime)
    try {
      if (localPglite.waitReady) {
        await localPglite.waitReady;
      }
      await localPglite.exec(INIT_SQL);
      console.log("[Database] Local persistent database initialized successfully!");
    } catch (err: any) {
      console.warn("[Database] Local DB init failed on disk, recovering in-memory database:", err.message || err);
      try {
        localPglite = new PGlite();
        if (localPglite.waitReady) {
          await localPglite.waitReady;
        }
        await localPglite.exec(INIT_SQL);
        localDrizzle = drizzlePgLite(localPglite, { schema });
        activeDrizzleInstance = localDrizzle;
        console.log("[Database] In-memory database recovered successfully!");
      } catch (innerErr: any) {
        console.error("[Database] Critical DB recovery error:", innerErr.message || innerErr);
      }
    }

    // 2. Try testing remote PostgreSQL connection if configured
    if (rawUrl && !rawUrl.includes("sakura.proxy.rlwy.net")) {
      try {
        console.log("[Database] Checking remote PostgreSQL connection...");
        const client = await pool.connect();
        try {
          await client.query("SELECT 1");
          await client.query(INIT_SQL);
          isRemoteHealthy = true;
          activeDrizzleInstance = remoteDrizzle;
          console.log("[Database] Remote PostgreSQL connected & synced successfully!");
        } finally {
          client.release();
        }
      } catch (err: any) {
        console.log(`[Database] Remote PostgreSQL is currently unreachable (${err.message || 'connection failed'}). Using local database storage seamlessly.`);
        isRemoteHealthy = false;
        activeDrizzleInstance = localDrizzle;
      }
    } else {
      activeDrizzleInstance = localDrizzle;
    }
  })();

  return initPromise;
}

// Run initialization in background
ensureDatabaseTables().catch(err => {
  console.warn("[Database] Background initialization notification:", err.message || err);
});
