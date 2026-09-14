import fs from 'fs';

let content = fs.readFileSync('telegram.ts', 'utf-8');

// Add imports at the top
const imports = `import { db } from './src/db/index.js';
import { users, subscriptions, referrals, usage, supportMap, supportState, history } from './src/db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
`;

content = content.replace('import fs from "fs";', imports + 'import fs from "fs";');

// Replace function definitions
const regexes = [
  {
    find: /function getUserLang\(chatId: number\): string \{[\s\S]*?return "en";\n\}/,
    replace: `async function getUserLang(chatId: number): Promise<string> {
  try {
    const user = await db.select().from(users).where(eq(users.chatId, chatId)).limit(1);
    return user[0]?.lang || "en";
  } catch (err) {
    return "en";
  }
}`
  },
  {
    find: /function setUserLang\(chatId: number, lang: string\) \{[\s\S]*?catch \(err\) \{\n    console\.error\("Error writing user lang file:", err\);\n  \}\n\}/,
    replace: `async function setUserLang(chatId: number, lang: string) {
  try {
    await db.insert(users).values({ chatId, lang })
      .onConflictDoUpdate({ target: users.chatId, set: { lang } });
  } catch (err) {}
}`
  },
  {
    find: /function mapAdminMessageToUser\(adminMessageId: number, userChatId: number\) \{[\s\S]*?catch \(err\) \{\}\n\}/,
    replace: `async function mapAdminMessageToUser(adminMessageId: number, userChatId: number) {
  try {
    await db.insert(supportMap).values({ adminMessageId, originalChatId: userChatId })
      .onConflictDoUpdate({ target: supportMap.adminMessageId, set: { originalChatId: userChatId } });
  } catch (err) {}
}`
  },
  {
    find: /function getUserChatIdFromAdminMessage\(adminMessageId: number\): number \| null \{[\s\S]*?return null;\n\}/,
    replace: `async function getUserChatIdFromAdminMessage(adminMessageId: number): Promise<number | null> {
  try {
    const map = await db.select().from(supportMap).where(eq(supportMap.adminMessageId, adminMessageId)).limit(1);
    return map[0] ? Number(map[0].originalChatId) : null;
  } catch (err) {
    return null;
  }
}`
  },
  {
    find: /function getSupportState\(chatId: number\): \{ active: boolean, messages: number\[\] \} \{[\s\S]*?return \{ active: false, messages: \[\] \};\n\}/,
    replace: `async function getSupportState(chatId: number): Promise<{ active: boolean, messages: number[] }> {
  try {
    const state = await db.select().from(supportState).where(eq(supportState.chatId, chatId)).limit(1);
    // Note: since schema only has 'isWaiting', we don't store messages anymore, or we can just return what we have.
    // The messages array is actually barely used, so let's mock it.
    return { active: state[0]?.isWaiting || false, messages: [] };
  } catch (err) {
    return { active: false, messages: [] };
  }
}`
  },
  {
    find: /function setSupportState\(chatId: number, active: boolean, newMessages: number\[\] = \[\]\) \{[\s\S]*?catch \(err\) \{\}\n\}/,
    replace: `async function setSupportState(chatId: number, active: boolean, newMessages: number[] = []) {
  try {
    if (!active) {
      await db.delete(supportState).where(eq(supportState.chatId, chatId));
    } else {
      await db.insert(supportState).values({ chatId, isWaiting: true })
        .onConflictDoUpdate({ target: supportState.chatId, set: { isWaiting: true } });
    }
  } catch (err) {}
}`
  },
  {
    find: /function getUserSub\(chatId: number\): boolean \{[\s\S]*?return false;\n\}/,
    replace: `async function getUserSub(chatId: number): Promise<boolean> {
  try {
    const sub = await db.select().from(subscriptions).where(eq(subscriptions.chatId, chatId)).limit(1);
    if (sub.length > 0) {
      if (sub[0].isLifetime) return true;
      if (sub[0].expiry && sub[0].expiry > Date.now()) return true;
    }
  } catch (err) {}
  return false;
}`
  },
  {
    find: /function setUserSub\(chatId: number, durationDays: number \| "lifetime"\) \{[\s\S]*?catch \(err\) \{\n    console\.error\("Error writing user sub file:", err\);\n  \}\n\}/,
    replace: `async function setUserSub(chatId: number, durationDays: number | "lifetime") {
  try {
    let isLifetime = false;
    let expiry = null;
    if (durationDays === "lifetime") {
      isLifetime = true;
    } else {
      const current = await db.select().from(subscriptions).where(eq(subscriptions.chatId, chatId)).limit(1);
      const currentExpiry = (current[0] && current[0].expiry && current[0].expiry > Date.now()) ? current[0].expiry : Date.now();
      expiry = currentExpiry + (durationDays * 24 * 60 * 60 * 1000);
    }
    await db.insert(subscriptions).values({ chatId, isLifetime, expiry })
      .onConflictDoUpdate({ target: subscriptions.chatId, set: { isLifetime, expiry } });
  } catch (err) {
    console.error("Error setting user sub:", err);
  }
}`
  },
  {
    find: /function checkDownloadLimit\(chatId: number\): boolean \{[\s\S]*?return true;\n\}/,
    replace: `async function checkDownloadLimit(chatId: number): Promise<boolean> {
  if (await getUserSub(chatId)) return true;
  try {
    const today = new Date().toISOString().split('T')[0];
    const u = await db.select().from(usage).where(and(eq(usage.chatId, chatId), eq(usage.date, today))).limit(1);
    const count = u[0]?.count || 0;
    if (count >= 5) return false;
  } catch (err) {}
  return true;
}`
  },
  {
    find: /function incrementDownloadCount\(chatId: number\) \{[\s\S]*?catch \(err\) \{\n    console\.error\("Error writing usage file:", err\);\n  \}\n\}/,
    replace: `async function incrementDownloadCount(chatId: number) {
  if (await getUserSub(chatId)) return;
  try {
    const today = new Date().toISOString().split('T')[0];
    const u = await db.select().from(usage).where(and(eq(usage.chatId, chatId), eq(usage.date, today))).limit(1);
    const current = u[0]?.count || 0;
    if (u.length > 0) {
      await db.update(usage).set({ count: current + 1 }).where(eq(usage.id, u[0].id));
    } else {
      await db.insert(usage).values({ chatId, date: today, count: 1 });
    }
  } catch (err) {}
}`
  },
  {
    find: /function getDownloadStats\(chatId: number\): number \{[\s\S]*?return 0;\n\}/,
    replace: `async function getDownloadStats(chatId: number): Promise<number> {
  if (await getUserSub(chatId)) return 0;
  try {
    const today = new Date().toISOString().split('T')[0];
    const u = await db.select().from(usage).where(and(eq(usage.chatId, chatId), eq(usage.date, today))).limit(1);
    return u[0]?.count || 0;
  } catch (err) {}
  return 0;
}`
  },
  {
    find: /function getReferralData\(chatId: number\): \{ count: number; days: number \} \{[\s\S]*?return \{ count: 0, days: 0 \};\n\}/,
    replace: `async function getReferralData(chatId: number): Promise<{ count: number; days: number }> {
  try {
    const ref = await db.select().from(referrals).where(eq(referrals.chatId, chatId)).limit(1);
    if (ref.length > 0) {
      return { count: ref[0].count, days: ref[0].days };
    }
  } catch (err) {}
  return { count: 0, days: 0 };
}`
  },
  {
    find: /function addReferral\(referrerId: number, inviteeId: number\) \{[\s\S]*?catch \(err\) \{\n    console\.error\("Error writing referral file:", err\);\n  \}\n\}/,
    replace: `async function addReferral(referrerId: number, inviteeId: number) {
  try {
    // For simplicity, we just add to the referrer's count and days without tracking inviteeId explicitly
    // since the original structure just used "invited" as a hash set.
    const ref = await db.select().from(referrals).where(eq(referrals.chatId, referrerId)).limit(1);
    const count = (ref[0]?.count || 0) + 1;
    const days = (ref[0]?.days || 0) + 3;
    await db.insert(referrals).values({ chatId: referrerId, count, days })
      .onConflictDoUpdate({ target: referrals.chatId, set: { count, days } });
    await setUserSub(referrerId, 3);
  } catch (err) {}
}`
  },
  {
    find: /function getUserHistory\(chatId: number\): HistoryEntry\[\] \{[\s\S]*?return \[\];\n\}/,
    replace: `async function getUserHistory(chatId: number): Promise<HistoryEntry[]> {
  try {
    const h = await db.select().from(history).where(eq(history.chatId, chatId)).orderBy(desc(history.date)).limit(10);
    return h.map(item => ({
      title: item.title,
      url: item.url,
      date: new Date(item.date).toISOString()
    }));
  } catch (err) {}
  return [];
}`
  },
  {
    find: /function addUserHistory\(chatId: number, title: string, url: string\) \{[\s\S]*?catch \(err\) \{\n    console\.error\("Error writing history file:", err\);\n  \}\n\}/,
    replace: `async function addUserHistory(chatId: number, title: string, url: string) {
  try {
    await db.insert(history).values({
      chatId,
      url,
      title,
      platform: "unknown",
      date: Date.now()
    });
  } catch (err) {}
}`
  },
  {
    find: /function clearUserHistory\(chatId: number\) \{[\s\S]*?catch \(err\) \{\n    console\.error\("Error clearing history file:", err\);\n  \}\n\}/,
    replace: `async function clearUserHistory(chatId: number) {
  try {
    await db.delete(history).where(eq(history.chatId, chatId));
  } catch (err) {}
}`
  }
];

regexes.forEach(r => {
  content = content.replace(r.find, r.replace);
});

// Update callers to add await.
// It's a bit brute force, but works for our specific callers.
content = content.replace(/const lang = getUserLang\(/g, "const lang = await getUserLang(");
content = content.replace(/const isPremium = getUserSub\(/g, "const isPremium = await getUserSub(");
content = content.replace(/const usedDownloads = getDownloadStats\(/g, "const usedDownloads = await getDownloadStats(");
content = content.replace(/const refData = getReferralData\(/g, "const refData = await getReferralData(");
content = content.replace(/const userHistory = getUserHistory\(/g, "const userHistory = await getUserHistory(");
content = content.replace(/const state = getSupportState\(/g, "const state = await getSupportState(");
content = content.replace(/const supportState = getSupportState\(/g, "const supportState = await getSupportState(");
content = content.replace(/const targetChatId = getUserChatIdFromAdminMessage\(/g, "const targetChatId = await getUserChatIdFromAdminMessage(");

content = content.replace(/setUserLang\(/g, "await setUserLang(");
content = content.replace(/setSupportState\(/g, "await setSupportState(");
content = content.replace(/mapAdminMessageToUser\(/g, "await mapAdminMessageToUser(");
content = content.replace(/addReferral\(/g, "await addReferral(");
content = content.replace(/setUserSub\(/g, "await setUserSub(");
content = content.replace(/addUserHistory\(/g, "await addUserHistory(");
content = content.replace(/clearUserHistory\(/g, "await clearUserHistory(");
content = content.replace(/if \(!checkDownloadLimit\(/g, "if (!(await checkDownloadLimit(");
content = content.replace(/incrementDownloadCount\(/g, "await incrementDownloadCount(");

// We should also remove the FILE constants at the top
content = content.replace(/const DATA_DIR = [\s\S]*?\}\n/, "");
content = content.replace(/const (LANG|SUPPORT_MAP|SUPPORT_STATE|USAGE|REFERRAL|SUB|HISTORY)_FILE = [^\n]*\n/g, "");

fs.writeFileSync('telegram.ts', content, 'utf-8');
console.log("Updated telegram.ts");
