import fs from 'fs';
import path from 'path';

export interface CloudflareConfig {
  apiToken: string;
  accountId: string;
  databaseId?: string;
  databaseName?: string;
  autoSync?: boolean;
  enabled?: boolean;
}

export interface CloudflareStatus {
  enabled: boolean;
  connected: boolean;
  accountId: string;
  databaseId: string;
  databaseName: string;
  latencyMs: number;
  lastSync: number | null;
  error: string | null;
  tablesCount: number;
}

const CONFIG_PATH = path.join(process.cwd(), 'cloudflare_config.json');

export function getCloudflareConfig(): CloudflareConfig | null {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
      if (data.apiToken && data.accountId) {
        return data;
      }
    } catch (e) {
      console.error('[Cloudflare] Error reading config file:', e);
    }
  }

  if (process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID) {
    return {
      apiToken: process.env.CLOUDFLARE_API_TOKEN,
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      databaseId: process.env.CLOUDFLARE_DATABASE_ID || '',
      databaseName: process.env.CLOUDFLARE_DATABASE_NAME || 'telegram_bot_db',
      enabled: true,
      autoSync: true
    };
  }

  return null;
}

export function saveCloudflareConfig(config: CloudflareConfig): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

export function removeCloudflareConfig(): void {
  if (fs.existsSync(CONFIG_PATH)) {
    fs.unlinkSync(CONFIG_PATH);
  }
}

async function safeParseCloudflareJson(response: Response): Promise<any> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    const preview = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);
    throw new Error(
      `Cloudflare API returned non-JSON HTTP ${response.status}${preview ? `: ${preview}` : ''}`
    );
  }
}

/**
 * Fetch accounts associated with the Cloudflare API Token
 */
export async function fetchCloudflareAccounts(
  apiToken: string
): Promise<{ success: boolean; accounts: Array<{ id: string; name: string }>; error?: string }> {
  try {
    const url = 'https://api.cloudflare.com/client/v4/accounts';
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken.trim()}`,
        'Content-Type': 'application/json'
      }
    });

    const data: any = await safeParseCloudflareJson(response);
    if (!data.success) {
      const errMsg = (data.errors && data.errors[0]?.message) || 'Invalid Cloudflare API Token or missing Account Read permission';
      return { success: false, accounts: [], error: errMsg };
    }

    const accounts = (data.result || []).map((acc: any) => ({
      id: acc.id,
      name: acc.name
    }));

    if (accounts.length === 0) {
      return { success: false, accounts: [], error: 'No Cloudflare accounts found for this token.' };
    }

    return { success: true, accounts };
  } catch (err: any) {
    return { success: false, accounts: [], error: err.message || 'Failed to reach Cloudflare API' };
  }
}

/**
 * Automatically configure everything with just an API Token:
 * 1. Find Account ID automatically
 * 2. Find or create D1 database automatically
 * 3. Initialize all schema tables
 * 4. Save configuration and return status
 */
export async function autoSetupCloudflare(
  apiToken: string,
  preferredDbName: string = 'telegram_bot_db'
): Promise<{
  success: boolean;
  config?: CloudflareConfig;
  account?: { id: string; name: string };
  database?: { uuid: string; name: string };
  isNewDatabase?: boolean;
  error?: string;
}> {
  const token = apiToken.trim();
  if (!token) {
    return { success: false, error: 'API Token is required' };
  }

  // 1. Fetch Account
  const accRes = await fetchCloudflareAccounts(token);
  if (!accRes.success || accRes.accounts.length === 0) {
    return { success: false, error: accRes.error || 'Failed to discover Cloudflare Account ID' };
  }

  const account = accRes.accounts[0];
  const accountId = account.id;

  // 2. Look for existing D1 databases in this account
  const listRes = await listCloudflareDatabases(token, accountId);
  let databaseId = '';
  let databaseName = preferredDbName;
  let isNew = false;

  if (listRes.success && listRes.databases.length > 0) {
    // Check if preferred database name exists
    const match = listRes.databases.find(d => d.name.toLowerCase() === preferredDbName.toLowerCase());
    if (match) {
      databaseId = match.uuid;
      databaseName = match.name;
    } else {
      // Use the first existing D1 or create one
      databaseId = listRes.databases[0].uuid;
      databaseName = listRes.databases[0].name;
    }
  }

  // If no database found, create one automatically!
  if (!databaseId) {
    const createRes = await createCloudflareDatabase(token, accountId, preferredDbName);
    if (!createRes.success || !createRes.database) {
      return { success: false, error: createRes.error || 'Failed to automatically create Cloudflare D1 database' };
    }
    databaseId = createRes.database.uuid;
    databaseName = createRes.database.name;
    isNew = true;
  }

  // 3. Initialize tables on D1
  const config: CloudflareConfig = {
    apiToken: token,
    accountId,
    databaseId,
    databaseName,
    enabled: true,
    autoSync: true
  };

  const initRes = await initializeD1Tables(config);
  if (!initRes.success) {
    return { success: false, error: `Failed to initialize D1 database tables: ${initRes.error}` };
  }

  // 4. Save config
  saveCloudflareConfig(config);

  // 5. Automatically pull existing data from Cloudflare D1 into active database
  try {
    await pullAllFromCloudflare(config);
  } catch (err) {
    console.warn('[Cloudflare D1 Auto-Setup] Pull warning:', err);
  }

  return {
    success: true,
    config,
    account,
    database: { uuid: databaseId, name: databaseName },
    isNewDatabase: isNew
  };
}

/**
 * Execute a SQL query on Cloudflare D1 via the Cloudflare REST API
 */
export async function executeD1Query(
  sql: string,
  params: any[] = [],
  customConfig?: CloudflareConfig
): Promise<{ results: any[]; success: boolean; error?: string }> {
  const cfg = customConfig || getCloudflareConfig();
  if (!cfg || !cfg.apiToken || !cfg.accountId || !cfg.databaseId) {
    return { results: [], success: false, error: 'Cloudflare D1 is not fully configured' };
  }

  try {
    const url = `https://api.cloudflare.com/client/v4/accounts/${cfg.accountId}/d1/database/${cfg.databaseId}/query`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfg.apiToken.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql,
        params
      })
    });

    const data: any = await safeParseCloudflareJson(response);
    if (!data.success) {
      const errMsg = (data.errors && data.errors[0]?.message) || 'Query failed on Cloudflare D1';
      return { results: [], success: false, error: errMsg };
    }

    const firstResult = data.result && data.result[0];
    return {
      results: (firstResult && firstResult.results) || [],
      success: true
    };
  } catch (err: any) {
    return { results: [], success: false, error: err.message || 'Network error connecting to Cloudflare D1' };
  }
}

/**
 * List all D1 databases available in the user's Cloudflare account
 */
export async function listCloudflareDatabases(
  apiToken: string,
  accountId: string
): Promise<{ success: boolean; databases: Array<{ uuid: string; name: string; num_tables?: number }>; error?: string }> {
  try {
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId.trim()}/d1/database`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken.trim()}`,
        'Content-Type': 'application/json'
      }
    });

    const data: any = await safeParseCloudflareJson(response);
    if (!data.success) {
      const errMsg = (data.errors && data.errors[0]?.message) || 'Failed to list Cloudflare D1 databases';
      return { success: false, databases: [], error: errMsg };
    }

    return {
      success: true,
      databases: (data.result || []).map((db: any) => ({
        uuid: db.uuid,
        name: db.name,
        num_tables: db.num_tables
      }))
    };
  } catch (err: any) {
    return { success: false, databases: [], error: err.message || 'Failed to reach Cloudflare API' };
  }
}

/**
 * Create a new D1 database in Cloudflare if the user doesn't have one yet
 */
export async function createCloudflareDatabase(
  apiToken: string,
  accountId: string,
  databaseName: string = 'telegram_bot_db'
): Promise<{ success: boolean; database?: { uuid: string; name: string }; error?: string }> {
  try {
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId.trim()}/d1/database`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: databaseName.trim() })
    });

    const data: any = await safeParseCloudflareJson(response);
    if (!data.success) {
      const errMsg = (data.errors && data.errors[0]?.message) || 'Failed to create Cloudflare D1 database';
      return { success: false, error: errMsg };
    }

    return {
      success: true,
      database: {
        uuid: data.result.uuid,
        name: data.result.name
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error communicating with Cloudflare API' };
  }
}

const D1_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    chat_id INTEGER PRIMARY KEY,
    lang TEXT NOT NULL DEFAULT 'en',
    username TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS subscriptions (
    chat_id INTEGER PRIMARY KEY,
    is_lifetime INTEGER NOT NULL DEFAULT 0,
    expiry INTEGER
  );`,
  `CREATE TABLE IF NOT EXISTS referrals (
    chat_id INTEGER PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0,
    days INTEGER NOT NULL DEFAULT 0
  );`,
  `CREATE TABLE IF NOT EXISTS usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0
  );`,
  `CREATE TABLE IF NOT EXISTS support_map (
    admin_message_id INTEGER PRIMARY KEY,
    original_chat_id INTEGER NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS support_state (
    chat_id INTEGER PRIMARY KEY,
    is_waiting INTEGER NOT NULL DEFAULT 0
  );`,
  `CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    platform TEXT NOT NULL,
    date INTEGER NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS gift_codes (
    id TEXT PRIMARY KEY,
    duration_days INTEGER NOT NULL,
    max_usages INTEGER NOT NULL,
    used_count INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS used_gift_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code_id TEXT NOT NULL,
    chat_id INTEGER NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_history_chat_id ON history(chat_id);`,
  `CREATE INDEX IF NOT EXISTS idx_usage_chat_date ON usage(chat_id, date);`,
  `CREATE INDEX IF NOT EXISTS idx_used_gift_codes ON used_gift_codes(code_id, chat_id);`
];

/**
 * Initialize all database tables and indexes on Cloudflare D1
 */
export async function initializeD1Tables(config: CloudflareConfig): Promise<{ success: boolean; error?: string }> {
  for (const sql of D1_SCHEMA_STATEMENTS) {
    const res = await executeD1Query(sql, [], config);
    if (!res.success) {
      console.error('[Cloudflare D1] Failed statement:', sql, res.error);
      return { success: false, error: res.error };
    }
  }
  return { success: true };
}

/**
 * Check connectivity and table stats for Cloudflare D1
 */
export async function checkCloudflareStatus(): Promise<CloudflareStatus> {
  const cfg = getCloudflareConfig();
  if (!cfg || !cfg.enabled) {
    return {
      enabled: false,
      connected: false,
      accountId: cfg?.accountId || '',
      databaseId: cfg?.databaseId || '',
      databaseName: cfg?.databaseName || '',
      latencyMs: 0,
      lastSync: null,
      error: null,
      tablesCount: 0
    };
  }

  const start = Date.now();
  try {
    const testQuery = await executeD1Query("SELECT name FROM sqlite_master WHERE type='table';", [], cfg);
    const latency = Date.now() - start;

    if (!testQuery.success) {
      return {
        enabled: true,
        connected: false,
        accountId: cfg.accountId,
        databaseId: cfg.databaseId || '',
        databaseName: cfg.databaseName || '',
        latencyMs: latency,
        lastSync: null,
        error: testQuery.error || 'Connection failed',
        tablesCount: 0
      };
    }

    const tables = testQuery.results.map((r: any) => r.name).filter((n: string) => !n.startsWith('_cf_') && !n.startsWith('sqlite_') && !n.startsWith('d1_'));

    return {
      enabled: true,
      connected: true,
      accountId: cfg.accountId,
      databaseId: cfg.databaseId || '',
      databaseName: cfg.databaseName || '',
      latencyMs: latency,
      lastSync: Date.now(),
      error: null,
      tablesCount: tables.length
    };
  } catch (err: any) {
    return {
      enabled: true,
      connected: false,
      accountId: cfg.accountId,
      databaseId: cfg.databaseId || '',
      databaseName: cfg.databaseName || '',
      latencyMs: 0,
      lastSync: null,
      error: err.message || 'Unknown network error',
      tablesCount: 0
    };
  }
}

/**
 * Sync helper: mirror user updates or data to Cloudflare D1
 */
export async function syncToCloudflare(table: string, action: 'upsert' | 'delete' | 'insert', data: any): Promise<void> {
  const cfg = getCloudflareConfig();
  if (!cfg || !cfg.enabled || !cfg.databaseId) return;

  try {
    if (table === 'users' && action === 'upsert') {
      const langToSet = data.lang || null;
      const usernameToSet = data.username !== undefined ? (data.username || null) : undefined;

      if (langToSet && usernameToSet !== undefined) {
        await executeD1Query(
          `INSERT INTO users (chat_id, lang, username) VALUES (?, ?, ?)
           ON CONFLICT(chat_id) DO UPDATE SET lang = excluded.lang, username = excluded.username`,
          [data.chatId, langToSet, usernameToSet],
          cfg
        );
      } else if (langToSet) {
        await executeD1Query(
          `INSERT INTO users (chat_id, lang, username) VALUES (?, ?, NULL)
           ON CONFLICT(chat_id) DO UPDATE SET lang = excluded.lang`,
          [data.chatId, langToSet],
          cfg
        );
      } else if (usernameToSet !== undefined) {
        await executeD1Query(
          `INSERT INTO users (chat_id, lang, username) VALUES (?, 'en', ?)
           ON CONFLICT(chat_id) DO UPDATE SET username = excluded.username`,
          [data.chatId, usernameToSet],
          cfg
        );
      } else {
        await executeD1Query(
          `INSERT INTO users (chat_id, lang, username) VALUES (?, 'en', NULL)
           ON CONFLICT(chat_id) DO NOTHING`,
          [data.chatId],
          cfg
        );
      }
    } else if (table === 'subscriptions' && action === 'upsert') {
      await executeD1Query(
        `INSERT INTO subscriptions (chat_id, is_lifetime, expiry) VALUES (?, ?, ?)
         ON CONFLICT(chat_id) DO UPDATE SET is_lifetime = excluded.is_lifetime, expiry = excluded.expiry`,
        [data.chatId, data.isLifetime ? 1 : 0, data.expiry || null],
        cfg
      );
    } else if (table === 'referrals' && action === 'upsert') {
      await executeD1Query(
        `INSERT INTO referrals (chat_id, count, days) VALUES (?, ?, ?)
         ON CONFLICT(chat_id) DO UPDATE SET count = excluded.count, days = excluded.days`,
        [data.chatId, data.count || 0, data.days || 0],
        cfg
      );
    } else if (table === 'history' && action === 'insert') {
      await executeD1Query(
        `INSERT INTO history (chat_id, url, title, platform, date) VALUES (?, ?, ?, ?, ?)`,
        [data.chatId, data.url, data.title, data.platform, data.date],
        cfg
      );
    } else if (table === 'history' && action === 'delete') {
      await executeD1Query(
        `DELETE FROM history WHERE chat_id = ?`,
        [data.chatId],
        cfg
      );
    } else if (table === 'gift_codes' && action === 'insert') {
      await executeD1Query(
        `INSERT INTO gift_codes (id, duration_days, max_usages, used_count, created_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET duration_days = excluded.duration_days, max_usages = excluded.max_usages, used_count = excluded.used_count`,
        [data.id, data.durationDays, data.maxUsages, data.usedCount || 0, data.createdAt],
        cfg
      );
    } else if (table === 'gift_codes' && action === 'delete') {
      await executeD1Query(`DELETE FROM gift_codes WHERE id = ?`, [data.id], cfg);
    } else if (table === 'used_gift_codes' && action === 'insert') {
      await executeD1Query(
        `INSERT INTO used_gift_codes (code_id, chat_id) VALUES (?, ?)`,
        [data.codeId, data.chatId],
        cfg
      );
    }
  } catch (e) {
    console.warn('[Cloudflare D1 Sync] Notification:', e);
  }
}

/**
 * Pull all data from Cloudflare D1 and populate into active local database
 */
export async function pullAllFromCloudflare(customConfig?: CloudflareConfig): Promise<{ success: boolean; importedCounts: Record<string, number>; error?: string }> {
  const cfg = customConfig || getCloudflareConfig();
  if (!cfg || !cfg.enabled || !cfg.databaseId) {
    return { success: false, importedCounts: {}, error: 'Cloudflare D1 is not configured' };
  }

  try {
    const { db, ensureDatabaseTables } = await import('./index.js');
    const { users, subscriptions, referrals, giftCodes, history, usedGiftCodes } = await import('./schema.js');
    await ensureDatabaseTables();

    const counts: Record<string, number> = { users: 0, subscriptions: 0, referrals: 0, giftCodes: 0, history: 0, usedGiftCodes: 0 };

    // 1. Users (Language preferences, usernames)
    const uRes = await executeD1Query(`SELECT chat_id, lang, username FROM users`, [], cfg);
    if (uRes.success && Array.isArray(uRes.results)) {
      for (const r of uRes.results) {
        if (r.chat_id != null) {
          await db.insert(users).values({
            chatId: Number(r.chat_id),
            lang: r.lang || 'en',
            username: r.username || null
          }).onConflictDoUpdate({
            target: users.chatId,
            set: { lang: r.lang || 'en', username: r.username || null }
          }).catch(() => {});
          counts.users++;
        }
      }
    }

    // 2. Subscriptions
    const sRes = await executeD1Query(`SELECT chat_id, is_lifetime, expiry FROM subscriptions`, [], cfg);
    if (sRes.success && Array.isArray(sRes.results)) {
      for (const r of sRes.results) {
        if (r.chat_id != null) {
          await db.insert(subscriptions).values({
            chatId: Number(r.chat_id),
            isLifetime: Boolean(r.is_lifetime),
            expiry: r.expiry ? Number(r.expiry) : null
          }).onConflictDoUpdate({
            target: subscriptions.chatId,
            set: { isLifetime: Boolean(r.is_lifetime), expiry: r.expiry ? Number(r.expiry) : null }
          }).catch(() => {});
          counts.subscriptions++;
        }
      }
    }

    // 3. Referrals
    const refRes = await executeD1Query(`SELECT chat_id, count, days FROM referrals`, [], cfg);
    if (refRes.success && Array.isArray(refRes.results)) {
      for (const r of refRes.results) {
        if (r.chat_id != null) {
          await db.insert(referrals).values({
            chatId: Number(r.chat_id),
            count: Number(r.count) || 0,
            days: Number(r.days) || 0
          }).onConflictDoUpdate({
            target: referrals.chatId,
            set: { count: Number(r.count) || 0, days: Number(r.days) || 0 }
          }).catch(() => {});
          counts.referrals++;
        }
      }
    }

    // 4. Gift Codes
    const gRes = await executeD1Query(`SELECT id, duration_days, max_usages, used_count, created_at FROM gift_codes`, [], cfg);
    if (gRes.success && Array.isArray(gRes.results)) {
      for (const r of gRes.results) {
        if (r.id) {
          await db.insert(giftCodes).values({
            id: String(r.id),
            durationDays: Number(r.duration_days) || 1,
            maxUsages: Number(r.max_usages) || 1,
            usedCount: Number(r.used_count) || 0,
            createdAt: Number(r.created_at) || Date.now()
          }).onConflictDoUpdate({
            target: giftCodes.id,
            set: {
              durationDays: Number(r.duration_days) || 1,
              maxUsages: Number(r.max_usages) || 1,
              usedCount: Number(r.used_count) || 0
            }
          }).catch(() => {});
          counts.giftCodes++;
        }
      }
    }

    // 5. History
    const hRes = await executeD1Query(`SELECT chat_id, url, title, platform, date FROM history ORDER BY date DESC LIMIT 200`, [], cfg);
    if (hRes.success && Array.isArray(hRes.results)) {
      for (const r of hRes.results) {
        if (r.chat_id != null && r.url) {
          await db.insert(history).values({
            chatId: Number(r.chat_id),
            url: String(r.url),
            title: String(r.title || 'Media'),
            platform: String(r.platform || 'unknown'),
            date: Number(r.date) || Date.now()
          }).catch(() => {});
          counts.history++;
        }
      }
    }

    // 6. Used Gift Codes
    const ugRes = await executeD1Query(`SELECT code_id, chat_id FROM used_gift_codes`, [], cfg);
    if (ugRes.success && Array.isArray(ugRes.results)) {
      for (const r of ugRes.results) {
        if (r.code_id && r.chat_id != null) {
          await db.insert(usedGiftCodes).values({
            codeId: String(r.code_id),
            chatId: Number(r.chat_id)
          }).catch(() => {});
          counts.usedGiftCodes++;
        }
      }
    }

    console.log('[Cloudflare D1] Restored database rows from Cloudflare D1 successfully:', counts);
    return { success: true, importedCounts: counts };
  } catch (err: any) {
    console.error('[Cloudflare D1] Error pulling data from D1:', err);
    return { success: false, importedCounts: {}, error: err.message || 'Failed to pull data from Cloudflare D1' };
  }
}

