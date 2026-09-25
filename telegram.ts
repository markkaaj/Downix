import { db } from './src/db/index.js';
import { users, subscriptions, referrals, usage, supportMap, supportState, history, giftCodes, usedGiftCodes } from './src/db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { syncToCloudflare, getCloudflareConfig, executeD1Query } from './src/db/cloudflare.js';
import fs from "fs";
import path from "path";
import crypto from "crypto";
import http from "http";
import https from "https";
import youtubedl, { ensureYtdlp } from "./ytdlp.js";
import ffmpeg from "ffmpeg-static";
import sharp from "sharp";




async function getUserLang(chatId: number): Promise<string> {
  try {
    const user = await db.select().from(users).where(eq(users.chatId, chatId)).limit(1);
    if (user[0]?.lang) return user[0].lang;

    // Check Cloudflare D1 if not found in local db
    const cfg = getCloudflareConfig();
    if (cfg && cfg.enabled && cfg.databaseId) {
      const d1Res = await executeD1Query(`SELECT lang, username FROM users WHERE chat_id = ? LIMIT 1`, [chatId], cfg);
      if (d1Res.success && d1Res.results && d1Res.results.length > 0) {
        const lang = d1Res.results[0].lang || "en";
        const username = d1Res.results[0].username || null;
        await db.insert(users).values({ chatId, lang, username })
          .onConflictDoUpdate({ target: users.chatId, set: { lang, username } }).catch(() => {});
        return lang;
      }
    }
    return "en";
  } catch (err) {
    return "en";
  }
}


async function updateUserInfo(chatId: number, username?: string) {
  try {
    const currentLang = await getUserLang(chatId);
    if (username) {
      await db.insert(users).values({ chatId, username, lang: currentLang })
        .onConflictDoUpdate({ target: users.chatId, set: { username, lang: currentLang } });
      syncToCloudflare('users', 'upsert', { chatId, username, lang: currentLang }).catch(() => {});
    } else {
      await db.insert(users).values({ chatId, lang: currentLang })
        .onConflictDoNothing().catch(() => {});
      syncToCloudflare('users', 'upsert', { chatId, lang: currentLang }).catch(() => {});
    }
  } catch (err) {}
}

async function setUserLang(chatId: number, lang: string) {
  try {
    const existing = await db.select().from(users).where(eq(users.chatId, chatId)).limit(1);
    const username = existing[0]?.username || null;
    await db.insert(users).values({ chatId, lang, username })
      .onConflictDoUpdate({ target: users.chatId, set: { lang } });
    await syncToCloudflare('users', 'upsert', { chatId, lang, username });
  } catch (err) {}
}




async function mapAdminMessageToUser(adminMessageId: number, userChatId: number) {
  try {
    await db.insert(supportMap).values({ adminMessageId, originalChatId: userChatId })
      .onConflictDoUpdate({ target: supportMap.adminMessageId, set: { originalChatId: userChatId } });
  } catch (err) {}
}

async function getUserChatIdFromAdminMessage(adminMessageId: number): Promise<number | null> {
  try {
    const map = await db.select().from(supportMap).where(eq(supportMap.adminMessageId, adminMessageId)).limit(1);
    return map[0] ? Number(map[0].originalChatId) : null;
  } catch (err) {
    return null;
  }
}


async function getSupportState(chatId: number): Promise<{ active: boolean, messages: number[] }> {
  try {
    const state = await db.select().from(supportState).where(eq(supportState.chatId, chatId)).limit(1);
    // Note: since schema only has 'isWaiting', we don't store messages anymore, or we can just return what we have.
    // The messages array is actually barely used, so let's mock it.
    return { active: state[0]?.isWaiting || false, messages: [] };
  } catch (err) {
    return { active: false, messages: [] };
  }
}

async function setSupportState(chatId: number, active: boolean, newMessages: number[] = []) {
  try {
    if (!active) {
      await db.delete(supportState).where(eq(supportState.chatId, chatId));
    } else {
      await db.insert(supportState).values({ chatId, isWaiting: true })
        .onConflictDoUpdate({ target: supportState.chatId, set: { isWaiting: true } });
    }
  } catch (err) {}
}

async function setMessageReaction(baseUrl: string, chatId: number, messageId: number, emoji: string) {
  try {
    await fetch(`${baseUrl}/setMessageReaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        reaction: [{ type: "emoji", emoji: emoji }]
      })
    });
  } catch (err) {}
}


async function checkDownloadLimit(chatId: number): Promise<boolean> {
  if (await getUserSub(chatId)) return true;
  try {
    const today = new Date().toISOString().split('T')[0];
    const u = await db.select().from(usage).where(and(eq(usage.chatId, chatId), eq(usage.date, today))).limit(1);
    const count = u[0]?.count || 0;
    if (count >= 5) return false;
  } catch (err) {}
  return true;
}

async function incrementDownloadCount(chatId: number) {
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
}

async function getDownloadStats(chatId: number): Promise<number> {
  if (await getUserSub(chatId)) return 0;
  try {
    const today = new Date().toISOString().split('T')[0];
    const u = await db.select().from(usage).where(and(eq(usage.chatId, chatId), eq(usage.date, today))).limit(1);
    return u[0]?.count || 0;
  } catch (err) {}
  return 0;
}

async function getReferralData(chatId: number): Promise<{ count: number; days: number }> {
  try {
    const ref = await db.select().from(referrals).where(eq(referrals.chatId, chatId)).limit(1);
    if (ref.length > 0) {
      return { count: ref[0].count, days: ref[0].days };
    }
    const cfg = getCloudflareConfig();
    if (cfg && cfg.enabled && cfg.databaseId) {
      const d1Res = await executeD1Query(`SELECT count, days FROM referrals WHERE chat_id = ? LIMIT 1`, [chatId], cfg);
      if (d1Res.success && d1Res.results && d1Res.results.length > 0) {
        const count = Number(d1Res.results[0].count) || 0;
        const days = Number(d1Res.results[0].days) || 0;
        await db.insert(referrals).values({ chatId, count, days })
          .onConflictDoUpdate({ target: referrals.chatId, set: { count, days } }).catch(() => {});
        return { count, days };
      }
    }
  } catch (err) {}
  return { count: 0, days: 0 };
}

async function addReferral(referrerId: number, inviteeId: number) {
  try {
    const currentRef = await getReferralData(referrerId);
    const count = currentRef.count + 1;
    const days = currentRef.days + 3;
    await db.insert(referrals).values({ chatId: referrerId, count, days })
      .onConflictDoUpdate({ target: referrals.chatId, set: { count, days } });
    syncToCloudflare('referrals', 'upsert', { chatId: referrerId, count, days }).catch(() => {});
    await setUserSub(referrerId, 3);
  } catch (err) {}
}


async function getUserSub(chatId: number): Promise<boolean> {
  try {
    const sub = await db.select().from(subscriptions).where(eq(subscriptions.chatId, chatId)).limit(1);
    if (sub.length > 0) {
      if (sub[0].isLifetime) return true;
      if (sub[0].expiry && sub[0].expiry > Date.now()) return true;
    }

    const cfg = getCloudflareConfig();
    if (cfg && cfg.enabled && cfg.databaseId) {
      const d1Res = await executeD1Query(`SELECT is_lifetime, expiry FROM subscriptions WHERE chat_id = ? LIMIT 1`, [chatId], cfg);
      if (d1Res.success && d1Res.results && d1Res.results.length > 0) {
        const d1Sub = d1Res.results[0];
        const isLifetime = Boolean(d1Sub.is_lifetime);
        const expiry = d1Sub.expiry ? Number(d1Sub.expiry) : null;
        await db.insert(subscriptions).values({ chatId, isLifetime, expiry })
          .onConflictDoUpdate({ target: subscriptions.chatId, set: { isLifetime, expiry } }).catch(() => {});
        if (isLifetime) return true;
        if (expiry && expiry > Date.now()) return true;
      }
    }
  } catch (err) {}
  return false;
}

async function setUserSub(chatId: number, durationDays: number | "lifetime") {
  try {
    let isLifetime = false;
    let expiry = null;
    if (durationDays === "lifetime") {
      isLifetime = true;
    } else {
      const current = await db.select().from(subscriptions).where(eq(subscriptions.chatId, chatId)).limit(1);
      let currentExpiry = (current[0] && current[0].expiry && current[0].expiry > Date.now()) ? current[0].expiry : Date.now();
      if (current.length === 0 || !current[0].expiry || current[0].expiry <= Date.now()) {
        const cfg = getCloudflareConfig();
        if (cfg && cfg.enabled && cfg.databaseId) {
          const d1Res = await executeD1Query(`SELECT is_lifetime, expiry FROM subscriptions WHERE chat_id = ? LIMIT 1`, [chatId], cfg);
          if (d1Res.success && d1Res.results && d1Res.results[0]?.expiry) {
            const exp = Number(d1Res.results[0].expiry);
            if (exp > Date.now()) currentExpiry = exp;
          }
        }
      }
      expiry = currentExpiry + (durationDays * 24 * 60 * 60 * 1000);
    }
    await db.insert(subscriptions).values({ chatId, isLifetime, expiry })
      .onConflictDoUpdate({ target: subscriptions.chatId, set: { isLifetime, expiry } });
    await syncToCloudflare('subscriptions', 'upsert', { chatId, isLifetime, expiry });
  } catch (err) {
    console.error("Error setting user sub:", err);
  }
}


interface HistoryEntry {
  id: number;
  title: string;
  url: string;
  date: string;
}

async function getUserHistory(chatId: number): Promise<HistoryEntry[]> {
  try {
    const h = await db.select().from(history).where(eq(history.chatId, chatId)).orderBy(desc(history.date)).limit(10);
    return h.map(item => ({
      id: item.id,
      title: item.title,
      url: item.url,
      date: new Date(item.date).toISOString()
    }));
  } catch (err) {}
  return [];
}

async function addUserHistory(chatId: number, title: string, url: string) {
  try {
    const now = Date.now();
    await db.insert(history).values({
      chatId,
      url,
      title,
      platform: "unknown",
      date: now
    });
    syncToCloudflare('history', 'insert', { chatId, url, title, platform: 'unknown', date: now }).catch(() => {});
  } catch (err) {}
}

async function clearUserHistory(chatId: number) {
  try {
    await db.delete(history).where(eq(history.chatId, chatId));
    syncToCloudflare('history', 'delete', { chatId }).catch(() => {});
  } catch (err) {}
}

const botTranslations: Record<string, Record<string, string>> = {
  fa: {
    welcome: `
<b>سلام به داونیکس خوش اومدی</b>

اینجا هرچی لینک <b>ویدیو</b>، <b>عکس</b> یا <b>آهنگ</b> داری بفرست، من برات دانلودش میکنم.

<b>از اینجاها هم میتونم برات دانلود کنم:</b>

<b>Instagram</b>
<b>YouTube</b>
<b>TikTok</b>
<b>Facebook</b>
<b>X</b>
<b>Pinterest</b>
<b>Reddit</b>
<b>Threads</b>
<b>Vimeo</b>
<b>Dailymotion</b>

<b>کیفیت خوب</b> میخوای؟ انتخابش با خودته.
<b>لینک رو بفرست</b>، بقیه‌ش با من.

اگه دانلود زیاد داری، <b>اشتراک ویژه</b> هم هست که دستت بازتر باشه و <b>سریعتر</b> به کارت برسم.

<b>خب دیگه، منتظر لینکت هستم.</b>
    `.trim(),
    selectLang: "لطفاً زبان مورد نظر خود را انتخاب کنید",
    langChanged: "✅ زبان ربات با موفقیت به <b>فارسی</b> تغییر یافت!",
    invalidLink: "⚠️ لطفاً یک آدرس لینک معتبر بفرستید تا براتون بررسی کنم!",
    analyzing: "صبر کن ببینم این <b>لینک</b> چیه (:",
    mediaFound: "اطلاعات رسانه پیدا شد:",
    title: "عنوان",
    uploader: "ناشر",
    duration: "مدت زمان",
    platform: "پلتفرم",
    unknown: "نامشخص",
    chooseFormat: "فرمت و کیفیت مورد نظر خود را برای دانلود مستقیم انتخاب کنید:",
    chooseCategory: "یکی از دسته‌بندی‌های زیر را جهت <b>دانلود</b> انتخاب کنید:",
    videoMenu: "ویدیو",
    musicMenu: "موزیک",
    thumbnailMenu: "تامنیل",
    chooseVideoQuality: "کیفیت مورد نظر برای دانلود ویدیو را انتخاب کنید:",
    chooseMusicQuality: "کیفیت مورد نظر برای دانلود موزیک را انتخاب کنید:",
    chooseThumbnailQuality: "کیفیت مورد نظر برای دانلود تصویر کاور را انتخاب کنید:",
    dlVideo144p: "کیفیت ۱۴۴p",
    dlVideo240p: "کیفیت ۲۴۰p",
    dlVideo360p: "کیفیت ۳۶۰p",
    dlVideo480p: "کیفیت ۴۸۰p",
    dlVideo720p: "کیفیت ۷۲۰p",
    dlVideo1080p: "کیفیت ۱۰۸۰p",
    dlVideo1440p: "کیفیت ۱۴۴۰p (2K)",
    dlVideo2160p: "کیفیت ۲۱۶۰p (4K)",
    dlVideo4320p: "کیفیت ۴۳۲۰p (8K)",
    dlThumBest: "بهترین کیفیت (Full HD)",
    dlThumMedium: "کیفیت معمولی (Medium)",
    backBtn: "‹ بازگشت",
    dlVideoBest: "بهترین",
    music320: "MP3 320",
    music128: "MP3 128",
    musicWav: "WAV",
    dlGold4K: "✨ دانلود طلایی ۴K Ultra HD",
    analyzeFailed: "❌ <b>آنالیز لینک ناموفق بود!</b>",
    systemError: "خطای سیستم: شکست در اجرای yt-dlp.",
    fallbackError: "خطا در بررسی لینک (احتمالاً سایت مبدا دسترسی را مسدود کرده است).",
    startingDownload: "دارم واست دانلودش میکنم ♡\n ⬡⬡⬡⬡⬡⬡⬡⬡⬡⬡ 0%",
    downloadProgress: "دارم واست دانلودش میکنم ♡\n {bar} {percent}%",
    uploadProgress: "دانلود شد دارم واست میفرستم\nفقط یه لحظه کنارم باش✿\n {bar} {percent}%",
    processingDone: "دانلود شد دارم واست میفرستم\nفقط یه لحظه کنارم باش✿",
    finalCaption: "اینم خدمتت عشقم♡\n\nعنوان: {title}\nحجم: {size}",
    fileSentSuccess: "✅ <b>فایل با موفقیت ارسال شد!</b>",
    size: "حجم",
    directLink: "🔗 <b>لینک دانلود مستقیم (سرور اختصاصی):</b>",
    clickToDownload: "برای دانلود مستقیم کلیک کنید",
    fileTooLarge: "⚠️ <b>فایل شما بسیار بزرگ است ({size} MB) و امکان آپلود مستقیم در تلگرام وجود ندارد (محدودیت ۵۰ مگابایت).</b>\n\nاما نگران نباشید! همین حالا می‌توانید از لینک مستقیم پرسرعت زیر بدون محدودیت آن را دانلود کنید:\n\n🔗 <b>لینک مستقیم اختصاصی:</b>\n<a href=\"{link}\">کلیک کنید برای دانلود مستقیم فایل</a>",
    domainNotSet: "⚠️ <b>فایل دانلود شد اما آدرس عمومی سرور ست نشده است. حجم فایل: {size} MB</b>\nلطفاً آدرس دامنه وب‌سایت را در تنظیمات پنل ست کنید تا لینک مستقیم ساخته شود.",
    sendingError: "❌ <b>خطا در ارسال فایل:</b>",
    downloadError: "❌ <b>دانلود با خطا مواجه شد!</b>",
    suddenError: "❌ <b>خطای ناگهانی در حین انجام فرآیند:</b>",
    expiredSession: "❌ این نشست یا لینک منقضی شده است. لطفا مجددا لینک را بفرستید.",
    dailyLimitReached: "عشقم، سهمیه امروزت تموم شد♡\n\nبه سقف <b>۵ دانلود در روز</b> رسیدی.\nبرای استفاده نامحدود، یه سر به اشتراک <b>پریمیوم</b> بزن",
    profile: "پروفایل",
    support: "پشتیبانی",
    changeLangBtn: "🌐 تغییر زبان",
    profileSection: "<b>حساب کاربری</b>\n\n› شناسه: \"<code>{chatId}</code>\"\n› زبان: فارسی 🇮🇷\n› اشتراک: {subscription}\n\nبرای مدیریت حساب، تغییر تنظیمات یا ارتقای اشتراک، یکی از گزینه‌های زیر را انتخاب کنید:",
    supportSection: "<b>ارتباط با پشتیبانی</b>\n\nلطفاً پیام، سوال یا مشکل خود را ارسال کنید.\nدرخواست شما مستقیماً برای تیم پشتیبانی ارسال خواهد شد و در سریعترین زمان ممکن بررسی میشود.",
  },
  en: {
    welcome: `
<b>Welcome to Downix</b>

Send me any <b>video</b>, <b>photo</b>, or <b>music</b> link here, and I'll download it for you.

<b>I can download from these platforms:</b>

<b>Instagram</b>
<b>YouTube</b>
<b>TikTok</b>
<b>Facebook</b>
<b>X</b>
<b>Pinterest</b>
<b>Reddit</b>
<b>Threads</b>
<b>Vimeo</b>
<b>Dailymotion</b>

Looking for <b>high quality</b>? The choice is yours.
<b>Just send the link</b>, and leave the rest to me.

If you download a lot, there's a <b>premium subscription</b> for more freedom and <b>faster</b> processing.

<b>Well then, I'm waiting for your link.</b>
    `.trim(),
    selectLang: "Please select your desired language",
    langChanged: "✅ Bot language has been successfully changed to <b>English</b>!",
    invalidLink: "⚠️ Please send a valid link so I can inspect it!",
    analyzing: "Hold on, let me see what this <b>link</b> is (:",
    mediaFound: "Media Info Found:",
    title: "Title",
    uploader: "Uploader",
    duration: "Duration",
    platform: "Platform",
    unknown: "Unknown",
    chooseFormat: "Choose your desired format and quality for direct download:",
    chooseCategory: "Choose one of the categories below to download:",
    videoMenu: "Video",
    musicMenu: "Music",
    thumbnailMenu: "Thumbnail",
    chooseVideoQuality: "Choose your desired video download quality:",
    chooseMusicQuality: "Choose your desired music download quality:",
    chooseThumbnailQuality: "Choose your desired thumbnail download quality:",
    dlVideo144p: "144p",
    dlVideo240p: "240p",
    dlVideo360p: "360p",
    dlVideo480p: "480p",
    dlVideo720p: "720p",
    dlVideo1080p: "1080p",
    dlVideo1440p: "1440p (2K)",
    dlVideo2160p: "2160p (4K)",
    dlVideo4320p: "4320p (8K)",
    dlThumBest: "Best Quality (Full HD)",
    dlThumMedium: "Medium Quality",
    backBtn: "‹ Back",
    dlVideoBest: "Best",
    music320: "MP3 320",
    music128: "MP3 128",
    musicWav: "WAV",
    dlGold4K: "✨ Gold 4K Ultra HD Download",
    analyzeFailed: "❌ <b>Link analysis failed!</b>",
    systemError: "System error: Failed to execute yt-dlp.",
    fallbackError: "Failed to parse link (probably blocked by the source site).",
    startingDownload: "Downloading it for you ♡\n ⬡⬡⬡⬡⬡⬡⬡⬡⬡⬡ 0%",
    downloadProgress: "Downloading it for you ♡\n {bar} {percent}%",
    uploadProgress: "Downloaded! Sending it to you\nJust a moment please✿\n {bar} {percent}%",
    processingDone: "Downloaded! Sending it to you\nJust a moment please✿",
    finalCaption: "Here you go my love♡\n\nTitle: {title}\nSize: {size}",
    fileSentSuccess: "✅ <b>File sent successfully!</b>",
    size: "Size",
    directLink: "🔗 <b>Direct download link (Dedicated Server):</b>",
    clickToDownload: "Click here to download directly",
    fileTooLarge: "⚠️ <b>Your file is too large ({size} MB) and cannot be uploaded directly to Telegram (50MB limit).</b>\n\nBut don't worry! You can download it right now using the high-speed direct link below:\n\n🔗 <b>Dedicated Direct Link:</b>\n<a href=\"{link}\">Click here to download the file directly</a>",
    domainNotSet: "⚠️ <b>File downloaded but server public address is not set. File size: {size} MB</b>\nPlease set the website domain address in panel settings to generate a direct link.",
    sendingError: "❌ <b>Error sending file:</b>",
    downloadError: "❌ <b>Download failed with error!</b>",
    suddenError: "❌ <b>Sudden error during the process:</b>",
    expiredSession: "❌ This session or link has expired. Please send the link again.",
    dailyLimitReached: "My love, your daily quota is over♡\n\nYou've reached the limit of <b>5 downloads per day</b>.\nTo use without limits, check out the <b>Premium</b> subscription",
    profile: "Profile",
    support: "Support",
    changeLangBtn: "🌐 Change Language",
    profileSection: "<b>User Account</b>\n\n› ID: \"<code>{chatId}</code>\"\n› Language: English 🇬🇧\n› Subscription: {subscription}\n\nTo manage your account, change settings, or upgrade your subscription, select one of the options below:",
    supportSection: "<b>Contact Support</b>\n\nPlease send your message, question, or issue.\nYour request will be sent directly to the support team and will be reviewed as soon as possible.",
  },
  ru: {
    welcome: `
<b>Добро пожаловать в Downix</b>

Отправьте мне любую ссылку на <b>видео</b>, <b>фото</b> или <b>музыку</b> здесь, и я скачаю её для вас.

<b>Я могу скачивать с этих платформ:</b>

<b>Instagram</b>
<b>YouTube</b>
<b>TikTok</b>
<b>Facebook</b>
<b>X</b>
<b>Pinterest</b>
<b>Reddit</b>
<b>Threads</b>
<b>Vimeo</b>
<b>Dailymotion</b>

Ищете <b>высокое качество</b>? Выбор за вами.
<b>Просто отправьте ссылку</b>, остальное оставьте мне.

Если вы много скачиваете, есть <b>премиум-подписка</b> для большей свободы и <b>более быстрой</b> обработки.

<b>Ну что ж, жду вашу ссылку.</b>
    `.trim(),
    selectLang: "Пожалуйста, выберите желаемый язык",
    langChanged: "✅ Язык бота успешно изменен на <b>Русский</b>!",
    invalidLink: "⚠️ Пожалуйста, отправьте действующую ссылку для проверки!",
    analyzing: "Погоди, дай гляну, что это за <b>ссылка</b> (:",
    mediaFound: "Информация о медиа найдена:",
    title: "Название",
    uploader: "Автор",
    duration: "Длительность",
    platform: "Платформа",
    unknown: "Неизвестно",
    chooseFormat: "Выберите желаемый формат и качество для прямого скачивания:",
    chooseCategory: "Выберите одну из категорий ниже для скачивания:",
    videoMenu: "Видео",
    musicMenu: "Музыка",
    thumbnailMenu: "Миниатюра",
    chooseVideoQuality: "Выберите желаемое качество загрузки видео:",
    chooseMusicQuality: "Выберите желаемое качество загрузки музыки:",
    chooseThumbnailQuality: "Выберите желаемое качество загрузки миниатюры:",
    dlVideo144p: "144p",
    dlVideo240p: "240p",
    dlVideo360p: "360p",
    dlVideo480p: "480p",
    dlVideo720p: "720p",
    dlVideo1080p: "1080p",
    dlVideo1440p: "1440p (2K)",
    dlVideo2160p: "2160p (4K)",
    dlVideo4320p: "4320p (8K)",
    dlThumBest: "Лучшее качество (Full HD)",
    dlThumMedium: "Среднее качество",
    backBtn: "‹ Назад",
    dlVideoBest: "Лучшее",
    music320: "MP3 320",
    music128: "MP3 128",
    musicWav: "WAV",
    dlGold4K: "✨ Скачать в золотом 4K Ultra HD",
    analyzeFailed: "❌ <b>Анализ ссылки не удался!</b>",
    systemError: "Системная ошибка: Не удалось запустить yt-dlp.",
    fallbackError: "Не удалось обработать ссылку (возможно, заблокировано исходным сайтом).",
    startingDownload: "Скачиваю для тебя ♡\n ⬡⬡⬡⬡⬡⬡⬡⬡⬡⬡ 0%",
    downloadProgress: "Скачиваю для тебя ♡\n {bar} {percent}%",
    uploadProgress: "Скачано! Отправляю тебе\nМинуточку✿\n {bar} {percent}%",
    processingDone: "Скачано! Отправляю тебе\nМинуточку✿",
    finalCaption: "Вот, любовь моя♡\n\nНазвание: {title}\nРазмер: {size}",
    fileSentSuccess: "✅ <b>Файл успешно отправлен!</b>",
    size: "Размер",
    directLink: "🔗 <b>Ссылка на прямое скачивание (Выделенный сервер):</b>",
    clickToDownload: "Нажмите здесь, чтобы скачать напрямую",
    fileTooLarge: "⚠️ <b>Ваш файл слишком большой ({size} МБ) и не может быть загружен напрямую в Telegram (лимит 50 МБ).</b>\n\nНо не волнуйтесь! Вы можете скачать его прямо сейчас по высокоскоростной ссылке ниже:\n\n🔗 <b>Прямая ссылка:</b>\n<a href=\"{link}\">Нажмите здесь, чтобы скачать файл напрямую</a>",
    domainNotSet: "⚠️ <b>Файл загружен, но публичный адрес сервера не настроен. Размер файла: {size} МБ</b>\nПожалуйста, установите адрес домена веб-сайта в настройках панели, чтобы создать прямую ссылку.",
    sendingError: "❌ <b>Ошибка при отправке файла:</b>",
    downloadError: "❌ <b>Загрузка завершилась ошибкой!</b>",
    suddenError: "❌ <b>Внезапная ошибка во время процесса:</b>",
    expiredSession: "❌ Сессия или ссылка истекла. Пожалуйста, отправьте ссылку заново.",
    dailyLimitReached: "Любовь моя, твой дневной лимит исчерпан♡\n\nТы достиг лимита в <b>5 скачиваний в день</b>.\nДля безлимитного использования обрати внимание на <b>Премиум</b> подписку",
    profile: "Профиль",
    support: "Поддержка",
    changeLangBtn: "🌐 Изменить язык",
    profileSection: "<b>Личный кабинет</b>\n\n› ID: \"<code>{chatId}</code>\"\n› Язык: Русский 🇷🇺\n› Подписка: {subscription}\n\nЧтобы управлять аккаунтом, изменить настройки или улучшить подписку, выберите один из вариантов ниже:",
    supportSection: "<b>Связь с поддержкой</b>\n\nПожалуйста, отправьте ваше сообщение, вопрос или проблему.\nВаш запрос будет отправлен напрямую в службу поддержки и будет рассмотрен в кратчайшие сроки.",
  }
};

// Store url mappings to bypass Telegram's 64-byte callback_data limit
const urlCache = new Map<string, { 
  url: string; 
  title: string; 
  platform?: string; 
  thumbnailBest?: string; 
  thumbnailMedium?: string; 
  caption?: string;
  isImageOnly?: boolean;
  videoQualities?: any[];
}>();

async function restoreMediaMenu(baseUrl: string, chatId: number, messageId: number, urlId?: string) {
  if (!urlId) return;
  const cached = urlCache.get(urlId);
  if (!cached) return;
  const lang = await getUserLang(chatId);
  const keyboard: any = { inline_keyboard: [] };
  if (!cached.isImageOnly) {
    keyboard.inline_keyboard.push([
      { text: botTranslations[lang].videoMenu, callback_data: `menu:select_video:${urlId}` },
      { text: botTranslations[lang].musicMenu, callback_data: `menu:select_music:${urlId}` }
    ]);
  }
  if (cached.thumbnailBest) {
    keyboard.inline_keyboard.push([
      { text: botTranslations[lang].thumbnailMenu, callback_data: `menu:select_thumbnail:${urlId}` }
    ]);
  }
  const textToShow = cached.caption || botTranslations[lang].chooseCategory;
  await editTelegramMessage(baseUrl, chatId, messageId, textToShow, keyboard);
}

interface BotStatus {
  running: boolean;
  botName: string | null;
  botUsername: string | null;
  tokenConfigured: boolean;
  error: string | null;
}

let botPollingInstance: Promise<void> | null = null;
let isBotRunning = false;
let botUsername: string | null = null;
let botName: string | null = null;
let botError: string | null = null;
let abortController: AbortController | null = null;

// Helper to get active bot status
export function getBotStatus(): BotStatus {
  const tokenFile = path.join(process.cwd(), "telegram_token.txt");
  const hasToken = fs.existsSync(tokenFile) && fs.readFileSync(tokenFile, "utf-8").trim().length > 0;
  return {
    running: isBotRunning,
    botName,
    botUsername,
    tokenConfigured: hasToken || !!process.env.TELEGRAM_BOT_TOKEN,
    error: botError,
  };
}

// Format duration helper
function formatDuration(seconds: number | undefined): string {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Detect Platform helper
function detectPlatform(extractor: string | undefined, url: string): string {
  const extLower = (extractor || "").toLowerCase();
  const urlLower = url.toLowerCase();
  if (extLower.includes("youtube") || urlLower.includes("youtube.com") || urlLower.includes("youtu.be")) {
    return "YouTube";
  }
  if (extLower.includes("instagram") || urlLower.includes("instagram.com")) {
    return "Instagram";
  }
  if (extLower.includes("tiktok") || urlLower.includes("tiktok.com")) {
    return "TikTok";
  }
  if (extLower.includes("pinterest") || urlLower.includes("pinterest.com") || urlLower.includes("pin.it")) {
    return "Pinterest";
  }
  return "Other";
}

// Friendly error helper
function getFriendlyError(url: string, rawError: string, lang: string = "fa"): string {
  const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
  const isInstagram = url.includes("instagram.com");
  const errStr = rawError.toLowerCase();
  
  if (
    errStr.includes("sign in") || 
    errStr.includes("authentication") || 
    errStr.includes("login") || 
    errStr.includes("empty media response") || 
    errStr.includes("http error 400") || 
    errStr.includes("confirm you're not a bot") ||
    errStr.includes("requested format is not available")
  ) {
    if (isYouTube) {
      if (lang === "en") return "This video requires valid cookies. Please update your YouTube cookies in the website panel.";
      if (lang === "ru") return "Для этого видео требуются действующие куки. Пожалуйста, обновите куки YouTube на веб-панели.";
      return "این ویدیو نیاز به کوکی معتبر دارد. لطفاً کوکی‌های یوتیوب خود را از پنل وب‌سایت به‌روزرسانی کنید.";
    }
    if (isInstagram) {
      if (lang === "en") return "This Instagram video requires login. Please configure valid cookies in the website.";
      if (lang === "ru") return "Для этого видео Instagram требуется вход. Пожалуйста, настройте действующие куки на веб-сайте.";
      return "این ویدیو اینستاگرام نیاز به ورود دارد. لطفاً کوکی‌های معتبر را از وب‌سایت تنظیم کنید.";
    }
    if (lang === "en") return "Access to this link requires login. Please configure valid cookies.";
    if (lang === "ru") return "Для доступа по этой ссылке требуется вход. Пожалуйста, настройте действующие куки.";
    return "دسترسی به این لینک نیاز به ورود دارد. لطفاً کوکی‌های معتبر تنظیم کنید.";
  }
  if (errStr.includes("unsupported url")) {
    if (lang === "en") return "The entered link is not supported. Please send a valid link.";
    if (lang === "ru") return "Введенная ссылка не поддерживается. Пожалуйста, отправьте действующую ссылку.";
    return "آدرس وارد شده پشتیبانی نمی‌شود. لطفاً لینک معتبر ارسال کنید.";
  }
  if (lang === "en") return "An error occurred while analyzing or downloading. Please try again.";
  if (lang === "ru") return "Произошла ошибка при анализе или загрузке. Пожалуйста, попробуйте еще раз.";
  return "خطایی در تحلیل یا دانلود فایل رخ داد. لطفاً دوباره تلاش کنید.";
}

// Start Telegram Bot
export async function startTelegramBot(token: string) {
  if (isBotRunning) {
    await stopTelegramBot();
  }

  const BASE_URL = `https://api.telegram.org/bot${token}`;
  abortController = new AbortController();
  isBotRunning = true;
  botError = null;

  console.log("Initializing Telegram Bot with token...");

  try {
    // Fetch bot info
    const meRes = await fetch(`${BASE_URL}/getMe`, { signal: abortController.signal });
    const meData = await meRes.json();

    if (!meData.ok) {
      throw new Error(meData.description || "Invalid token provided.");
    }

    botUsername = `@${meData.result.username}`;
    botName = meData.result.first_name;
    console.log(`Telegram Bot started successfully as ${botUsername} (${botName})`);

    // Delete webhook if previously set so polling works smoothly
    try {
      await fetch(`${BASE_URL}/deleteWebhook?drop_pending_updates=false`);
    } catch (_) {}

    // Start polling loop
    botPollingInstance = (async () => {
      let offset = 0;
      const allowedUpdates = JSON.stringify(["message", "callback_query", "pre_checkout_query", "chat_member"]);
      while (isBotRunning) {
        try {
          const res = await fetch(`${BASE_URL}/getUpdates?offset=${offset}&timeout=20&allowed_updates=${encodeURIComponent(allowedUpdates)}`, {
            signal: abortController?.signal
          });
          const data = await res.json();

          if (!isBotRunning) break;

          if (!data.ok) {
            console.error("[Telegram Polling Error] getUpdates returned:", data.description || data);
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }

          if (data.ok && Array.isArray(data.result) && data.result.length > 0) {
            for (const update of data.result) {
              offset = update.update_id + 1;
              handleUpdate(BASE_URL, update).catch(err => {
                console.error("Error processing Telegram update:", err);
              });
            }
          }
        } catch (err: any) {
          if (err.name === "AbortError") {
            console.log("Polling aborted.");
            break;
          }
          console.error("Error in Telegram Polling:", err.message);
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    })();

  } catch (err: any) {
    console.error("Failed to start Telegram Bot:", err.message);
    botError = err.message || "اتصال به تلگرام ناموفق بود. توکن را بررسی کنید.";
    isBotRunning = false;
    botUsername = null;
    botName = null;
  }
}

// Stop Bot
export async function stopTelegramBot() {
  isBotRunning = false;
  if (abortController) {
    abortController.abort();
  }
  botUsername = null;
  botName = null;
  botPollingInstance = null;
  console.log("Telegram Bot stopped.");
}

// Get Server Host
function getServerHost(): string {
  if (process.env.DEVELOPMENT_APP_URL) {
    return process.env.DEVELOPMENT_APP_URL.replace(/\/$/, "");
  }
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    const domain = process.env.RAILWAY_PUBLIC_DOMAIN;
    return domain.startsWith("http") ? domain.replace(/\/$/, "") : `https://${domain}`;
  }
  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    const domain = process.env.VERCEL_URL;
    return domain.startsWith("http") ? domain.replace(/\/$/, "") : `https://${domain}`;
  }
  if (process.env.PUBLIC_URL) {
    return process.env.PUBLIC_URL.replace(/\/$/, "");
  }
  return "";
}

const membershipCache = new Map<number, {status: boolean, expiry: number}>();

// Channel Membership Check
async function checkChannelMembership(baseUrl: string, chatId: number, channelUsername: string): Promise<boolean> {
  try {
    const cached = membershipCache.get(chatId);
    if (cached && Date.now() < cached.expiry) {
      return cached.status;
    }

    const cleanChannel = channelUsername.startsWith("@") || !isNaN(Number(channelUsername))
      ? channelUsername
      : `@${channelUsername}`;

    const res = await fetch(`${baseUrl}/getChatMember?chat_id=${cleanChannel}&user_id=${chatId}`);
    const data = await res.json();
    if (data.ok) {
      const status = data.result?.status;
      const isMember = ["creator", "administrator", "member", "restricted"].includes(status);
      if (isMember) {
        // Cache membership for 60 seconds to prevent slow button clicks
        membershipCache.set(chatId, { status: true, expiry: Date.now() + 60000 });
      }
      return isMember;
    } else {
      // If the bot is not admin in the channel (400 'member list is inaccessible') or chat not found,
      // Telegram does not allow querying membership. Do not block users from using the bot in that case.
      console.warn(`[Telegram Bot] Channel check returned for ${cleanChannel}:`, data.description || data);
      if (
        data.description &&
        (data.description.includes("member list is inaccessible") ||
         data.description.includes("chat not found") ||
         data.description.includes("bot is not a member") ||
         data.description.includes("Not Found"))
      ) {
        return true;
      }
      return false;
    }
  } catch (err) {
    console.error("Error checking channel membership:", err);
    return true;
  }
}

async function ensureMembership(baseUrl: string, chatId: number, messageId?: number): Promise<boolean> {
  const requiredChannel = process.env.REQUIRED_CHANNEL;
  if (!requiredChannel || requiredChannel.trim() === "") return true;

  const isMember = await checkChannelMembership(baseUrl, chatId, requiredChannel);
  if (!isMember) {
    let joinLink = (process.env.REQUIRED_CHANNEL_LINK || requiredChannel).trim();
    if (!joinLink.startsWith("http://") && !joinLink.startsWith("https://")) {
      const handle = joinLink.replace(/^@+/, "");
      joinLink = `https://t.me/${handle}`;
    }
    const msg = `<b>^_^ اینجوری که نمیشه!</b>\n\nاول توی کانال عضو شو، بعد هرچی از دستم بربیاد برات انجام میدم`;
    const keyboard = {
      inline_keyboard: [
        [{ text: "عضویت در کانال 📢", url: joinLink }],
        [{ text: "عضو شدم ✅ (بررسی مجدد)", callback_data: "menu:start" }]
      ]
    };
    if (messageId) {
      await editTelegramMessage(baseUrl, chatId, messageId, msg, keyboard);
    } else {
      await sendTelegramMessage(baseUrl, chatId, msg, keyboard);
    }
    return false;
  }
  return true;
}

// Handle Updates
async function handleUpdate(baseUrl: string, update: any) {
  if (update.message?.chat?.id) {
    const username = update.message.from?.username || update.message.chat?.username;
    updateUserInfo(update.message.chat.id, username);
  }
  if (update.callback_query?.message?.chat?.id && !update.callback_query.data?.startsWith("lang:")) {
    const username = update.callback_query.from?.username || update.callback_query.message.chat?.username;
    updateUserInfo(update.callback_query.message.chat.id, username);
  }
  // 1. Successful Payment Update
  if (update.message && update.message.successful_payment) {
    const chatId = update.message.chat.id;
    const lang = await getUserLang(chatId);
    
    const payload = update.message.successful_payment.invoice_payload;
    if (payload && payload.startsWith("stars_premium_")) {
      const parts = payload.split("_");
      const duration = parts[2];
      const starsAmount = update.message.successful_payment.total_amount;
      
      let days = 0;
      if (duration === "1day") days = 1;
      else if (duration === "1week") days = 7;
      else if (duration === "1month") days = 30;
      else if (duration === "3months") days = 90;
      else if (duration === "1year") days = 365;
      
      if (days > 0) {
        await setUserSub(chatId, days);
      }

      // Notify support admin (7421504833) of the successful payment
      try {
        const adminChatId = 7421504833;
        const adminMsg = `⭐️ <b>تراکنش موفق ستاره‌های تلگرام</b>\n\n👤 <b>کاربر:</b> <code>${chatId}</code>\n⏳ <b>اشتراک:</b> ${duration}\n💰 <b>مبلغ پرداخت:</b> ${starsAmount || 1} استارز\n\nتراکنش ثبت و مستقیماً به حساب پشتیبان @CipherTunSupport اختصاص یافت.`;
        await sendTelegramMessage(baseUrl, adminChatId, adminMsg);
      } catch (adminErr) {
        console.error("Error notifying support admin:", adminErr);
      }
    }
    
    const successMsg = {
      fa: `عشقم پرداختت <b>تایید</b> شد♡\n\nبه جمع <b>پریمیوم‌ها</b> خوش اومدی\nحالا دیگه همه‌جوره کنارتم^_-`,
      en: `My love, your payment is <b>confirmed</b>♡\n\nWelcome to the <b>Premium</b> family\nNow I'm with you in every way^_-`,
      ru: `Любовь моя, твоя оплата <b>подтверждена</b>♡\n\nДобро пожаловать в круг <b>Премиум-пользователей</b>\nТеперь я с тобой во всём^_-`
    };
    
    await sendTelegramMessage(baseUrl, chatId, successMsg[lang as "fa" | "en" | "ru"] || successMsg.fa);
    return;
  }

  // 1.5 Chat Member Update
  if (update.chat_member) {
    const chatMember = update.chat_member;
    const requiredChannel = process.env.REQUIRED_CHANNEL;
    
    if (requiredChannel) {
      const reqChanStr = requiredChannel.replace("@", "");
      const isTargetChannel = chatMember.chat.username === reqChanStr || chatMember.chat.id.toString() === requiredChannel;
      
      if (isTargetChannel) {
        const newStatus = chatMember.new_chat_member.status;
        if (["creator", "administrator", "member", "restricted"].includes(newStatus)) {
          const chatId = chatMember.from.id;
          const lang = await getUserLang(chatId);
          const welcomeMessage = botTranslations[lang].welcome;
          const keyboard: any = {
            inline_keyboard: [
              [
                { text: botTranslations[lang].profile, callback_data: "menu:profile", style: "primary" },
                { text: botTranslations[lang].support, callback_data: "menu:support", style: "success" }
              ]
            ]
          };
          await sendTelegramMessage(baseUrl, chatId, welcomeMessage, keyboard);
        }
      }
    }
    return;
  }

  
  // Support Room Interception
  if (update.message && update.message.chat) {
    const chatId = update.message.chat.id;
    const text = update.message.text ? update.message.text.trim() : "";

    // Admin handling login code / password for MTProto
    if (chatId === 7421504833) {
      if (text === "/login") {
        const phone = process.env.TELEGRAM_PHONE || "+19429993274";
        await sendTelegramMessage(baseUrl, chatId, `⏳ در حال شروع احراز هویت MTProto برای شماره:\n${phone}`);
        try {
          const botToken = getBotTokenFromUrl(baseUrl);
          await getMTProtoClient(baseUrl, botToken);
          return;
        } catch (e: any) {
          await sendTelegramMessage(baseUrl, chatId, `❌ خطا در لاگین MTProto:\n\n${e.message}`);
          return;
        }
      }
      if (text.startsWith("/code ")) {
        const code = text.replace("/code ", "").trim();
        if (pendingCodeResolve) {
          pendingCodeResolve(code);
          await sendTelegramMessage(baseUrl, chatId, `✅ کد ورود (${code}) دریافت شد. در حال ادامه احراز هویت MTProto...`);
          return;
        } else {
          await sendTelegramMessage(baseUrl, chatId, `⚠️ هیچ درخواستی برای کد ورود منتظر نیست.`);
          return;
        }
      }
      if (text.startsWith("/pass ") || text.startsWith("/password ")) {
        const pass = text.replace(/^\/(pass|password)\s+/, "").trim();
        if (pendingPasswordResolve) {
          pendingPasswordResolve(pass);
          await sendTelegramMessage(baseUrl, chatId, `✅ رمز عبور 2FA دریافت شد...`);
          return;
        }
      }
    }
    
// Admin replying to user
    if (chatId === 7421504833 && update.message.reply_to_message) {
      const replyMsgId = update.message.reply_to_message.message_id;
      const targetChatId = await getUserChatIdFromAdminMessage(replyMsgId);
      
      let finalTargetChatId = targetChatId;
      
      // Fallback
      if (!finalTargetChatId) {
        const replyText = update.message.reply_to_message.text || update.message.reply_to_message.caption || "";
        const match = replyText.match(/پیام پشتیبانی از (\d+)/);
        if (match) {
          finalTargetChatId = parseInt(match[1]);
        }
      }
      
      if (finalTargetChatId) {
        if (update.message.text) {
          const sentToUser = await sendTelegramMessage(baseUrl, finalTargetChatId, update.message.text);
          if (sentToUser && sentToUser.result) {
            await setSupportState(finalTargetChatId, true, [sentToUser.result.message_id]);
          }
        } else {
          // If the admin sent a photo/video/sticker, we can copy it to the user
          try {
             const copyRes = await fetch(`${baseUrl}/copyMessage`, {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({
                 chat_id: finalTargetChatId,
                 from_chat_id: chatId,
                 message_id: update.message.message_id,
                 caption: update.message.caption
               })
             });
             const copyData = await copyRes.json();
             if (copyData && copyData.ok && copyData.result) {
               await setSupportState(finalTargetChatId, true, [copyData.result.message_id]);
             }
          } catch (err) {}
        }
        return;
      }
    }
    
    const supportState = await getSupportState(chatId);
    if (supportState.active) {
      // If user typed a command like /start, /menu, /cancel, clear support mode and process command
      if (text.startsWith("/")) {
        await setSupportState(chatId, false);
      } else {
        const msgId = update.message.message_id;
        const adminChatId = 7421504833;
        
        try {
          const copyRes = await fetch(`${baseUrl}/copyMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: adminChatId,
              from_chat_id: chatId,
              message_id: msgId
            })
          });
          const copyData = await copyRes.json();
          
          if (copyData && copyData.ok && copyData.result) {
            const adminCopiedMsgId = copyData.result.message_id;
            await mapAdminMessageToUser(adminCopiedMsgId, chatId);
          }
          
          await setMessageReaction(baseUrl, chatId, msgId, "👀");
          
          await setSupportState(chatId, true, [msgId]);
        } catch (err) {}
        
        return; // Intercepted
      }
    }
  }

  // 2. Text Message Update

  // 2. Text Message Update

  if (update.message && update.message.text) {
    const chatId = update.message.chat.id;
    const text = update.message.text.trim();

    // Process referral or gift code
    if (text.startsWith("/start")) {
      const parts = text.split(" ");
      if (parts.length > 1) {
        const payload = parts[1];
        if (payload.startsWith("ref_")) {
          const referrerId = parseInt(payload.replace("ref_", ""), 10);
          if (!isNaN(referrerId) && referrerId !== chatId) {
            // Check if this user was already invited or is a new user
            let isNewUser = true;
            try {
              const userCheck = await db.select().from(users).where(eq(users.chatId, chatId)).limit(1);
              if (userCheck.length > 0) {
                isNewUser = false;
              }
            } catch (e) {}
              
            if (isNewUser) {
              await addReferral(referrerId, chatId);
            }
          }
        } else {
          // Gift code logic
          const giftCodeId = payload;
          try {
            const gift = await db.select().from(giftCodes).where(eq(giftCodes.id, giftCodeId)).limit(1);
            if (gift.length > 0) {
              if (gift[0].usedCount < gift[0].maxUsages) {
                 const hasUsed = await db.select().from(usedGiftCodes).where(and(eq(usedGiftCodes.codeId, giftCodeId), eq(usedGiftCodes.chatId, chatId))).limit(1);
                 if (hasUsed.length === 0) {
                   const newUsedCount = gift[0].usedCount + 1;
                   await db.update(giftCodes).set({ usedCount: newUsedCount }).where(eq(giftCodes.id, giftCodeId));
                   await db.insert(usedGiftCodes).values({ codeId: giftCodeId, chatId });
                   syncToCloudflare('gift_codes', 'insert', {
                     id: giftCodeId,
                     durationDays: gift[0].durationDays,
                     maxUsages: gift[0].maxUsages,
                     usedCount: newUsedCount,
                     createdAt: gift[0].createdAt
                   }).catch(() => {});
                   syncToCloudflare('used_gift_codes', 'insert', { codeId: giftCodeId, chatId }).catch(() => {});

                   await setUserSub(chatId, gift[0].durationDays);
                   
                   const lang = await getUserLang(chatId);
                   const msgs = {
                     en: "🎉 Your Premium subscription has been successfully activated!",
                     fa: "<b>به جمع پریمیومها خوش اومدی</b>\nبهت <b>پریمیوم</b> " + gift[0].durationDays + " روزه <b>هدیه</b> داده M2\n<b>حالا دیگه </b>همهجوره کنارتم^_-",
                     ru: "🎉 Ваша премиум подписка успешно активирована!"
                   };
                   await sendTelegramMessage(baseUrl, chatId, msgs[lang] || msgs.fa);
                 } else {
                   const lang = await getUserLang(chatId);
                   const msgs = {
                     en: "❌ You have already used this gift code.",
                     fa: "❌ شما قبلاً از این کد هدیه استفاده کرده‌اید.",
                     ru: "❌ Вы уже использовали этот подарочный код."
                   };
                   await sendTelegramMessage(baseUrl, chatId, msgs[lang] || msgs.fa);
                 }
              } else {
                 const lang = await getUserLang(chatId);
                 const msgs = {
                   en: "❌ This gift code has reached its maximum usage limit.",
                   fa: "❌ ظرفیت استفاده از این کد هدیه به پایان رسیده است.",
                   ru: "❌ Этот подарочный код достиг максимального лимита использований."
                 };
                 await sendTelegramMessage(baseUrl, chatId, msgs[lang] || msgs.fa);
              }
            }
          } catch(e) {
            console.error(e);
          }
        }
      }
    }

    if (!(await ensureMembership(baseUrl, chatId))) return;

    if (text.startsWith("/start")) {
      const lang = await getUserLang(chatId);
      const welcomeMessage = botTranslations[lang].welcome;
      const keyboard: any = {
        inline_keyboard: [
          [
            { text: botTranslations[lang].profile, callback_data: "menu:profile", style: "primary" },
            { text: botTranslations[lang].support, callback_data: "menu:support", style: "success" }
          ]
        ]
      };
      await sendTelegramMessage(baseUrl, chatId, welcomeMessage, keyboard);
      return;
    }

    if (text.startsWith("/lang") || text.startsWith("/language")) {
      const lang = await getUserLang(chatId);
      const keyboard: any = {
        inline_keyboard: [
          [
            { text: (lang === "fa" ? "✓ " : "") + "فارسی 🇮🇷", callback_data: "lang:fa" },
            { text: (lang === "en" ? "✓ " : "") + "English 🇬🇧", callback_data: "lang:en" },
            { text: (lang === "ru" ? "✓ " : "") + "Русский 🇷🇺", callback_data: "lang:ru" }
          ]
        ]
      };
      await sendTelegramMessage(baseUrl, chatId, botTranslations[lang].selectLang, keyboard);
      return;
    }

    // Check for link
    const linkMatch = text.match(/(https?:\/\/[^\s]+)/g);
    if (linkMatch) {
      const url = linkMatch[0];
      await analyzeAndSendOptions(baseUrl, chatId, url);
    } else {
      const lang = await getUserLang(chatId);
      await sendTelegramMessage(baseUrl, chatId, botTranslations[lang].invalidLink);
    }
  }

  // 2. Callback Query Update (Button Clicks)
  if (update.callback_query) {
    const callbackQuery = update.callback_query;
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data;

    // Acknowledge click immediately (except for lang selection which needs a toast)
    if (!data.startsWith("lang:")) {
      fetch(`${baseUrl}/answerCallbackQuery?callback_query_id=${callbackQuery.id}`).catch(() => {});
    }

    if (!(await ensureMembership(baseUrl, chatId, messageId))) return;

    if (data === "menu:start") {
      const lang = await getUserLang(chatId);
      const welcomeMessage = botTranslations[lang].welcome;
      const keyboard: any = {
        inline_keyboard: [
          [
            { text: botTranslations[lang].profile, callback_data: "menu:profile", style: "primary" },
            { text: botTranslations[lang].support, callback_data: "menu:support", style: "success" }
          ]
        ]
      };
      await editTelegramMessage(baseUrl, chatId, messageId, welcomeMessage, keyboard);
      return;
    }

    if (data === "menu:profile") {
      const lang = await getUserLang(chatId);
      const isPremium = await getUserSub(chatId);
      const usedDownloads = await getDownloadStats(chatId);
      const remainingDownloads = Math.max(0, 5 - usedDownloads);
      
      let subText = "عادی";
      if (lang === "en") subText = isPremium ? "Premium" : `Normal (Remaining Downloads: ${remainingDownloads}/5)`;
      else if (lang === "ru") subText = isPremium ? "Премиум" : `Обычная (Осталось загрузок: ${remainingDownloads}/5)`;
      else subText = isPremium ? "پریمیوم" : `عادی (شارژ دانلود: ${remainingDownloads}/5)`;

      const profileText = botTranslations[lang].profileSection
        .replace("{chatId}", chatId.toString())
        .replace("{subscription}", subText);
      
      const buttons = {
        fa: { premium: "پریمیوم", referral: "رفرال", lang: "زبان", history: "تاریخچه", back: "‹ بازگشت" },
        en: { premium: "Premium", referral: "Referral", lang: "Language", history: "History", back: "‹ Back" },
        ru: { premium: "Премиум", referral: "Рефералы", lang: "Язык", history: "История", back: "‹ Назад" }
      };

      const btn = buttons[lang as "fa" | "en" | "ru"] || buttons.fa;

      const keyboard: any = {
        inline_keyboard: [
          [
            { text: btn.premium, callback_data: "menu:premium" },
            { text: btn.referral, callback_data: "menu:referral" }
          ],
          [
            { text: btn.history, callback_data: "menu:history" },
            { text: btn.lang, callback_data: "menu:change_lang" }
          ],
          [
            { text: btn.back, callback_data: "menu:start", style: "danger" }
          ]
        ]
      };
      await editTelegramMessage(baseUrl, chatId, messageId, profileText, keyboard);
      return;
    }

    if (data === "menu:premium") {
      const lang = await getUserLang(chatId);
      const premiumText = {
        fa: `♾ <b>ارتقای حساب به نسخهٔ پریمیوم</b>

با فعالسازی نسخهٔ پریمیوم، تمامی محدودیت‌های ربات برداشته میشود و میتوانید با بالاترین سرعت و بدون هیچ محدودیتی از همه امکانات استفاده کنید.

<b>مزایای نسخهٔ ویژه</b>

› پردازش با حداکثر سرعت
› بدون محدودیت حجم فایل
› بدون محدودیت تعداد درخواست‌ها
› دسترسی کامل به تمامی قابلیت‌های ربات

<b>مدت اشتراک:</b>`,
        en: `♾ <b>Upgrade Account to Premium Version</b>

By activating the Premium version, all bot limitations are removed, and you can enjoy all features at the highest speed without any restrictions.

<b>Special Features Benefits</b>

› Process at maximum speed
› No file size limit
› Unlimited number of requests
› Full access to all bot features

<b>Subscription Period:</b>`,
        ru: `♾ <b>Улучшение аккаунта до Премиум версии</b>

При активации Премиум-версии все ограничения бота снимаются, и вы можете использовать все функции на максимальной скорости и без ограничений.

<b>Преимущества специальной версии</b>

› Обработка на максимальной скорости
› Без ограничений по размеру файлов
› Безлимитное количество запросов
› Полный доступ ко всем функциям бота

<b>Период подписки:</b>`
      };

      const buttons = {
        fa: [
          [{ text: "✦ یک روزه - ۱ استار ✦", callback_data: "stars_pay:1:1day" }],
          [{ text: "✦ یک هفته - ۲۵ استار ✦", callback_data: "stars_pay:25:1week" }],
          [{ text: "✦ یک ماهه - ۵۰ استار ✦", callback_data: "stars_pay:50:1month" }],
          [{ text: "✦ سه ماهه - ۱۵۰ استار ✦", callback_data: "stars_pay:150:3months" }],
          [{ text: "✦ یک ساله - ۶۰۰ استار ✦", callback_data: "stars_pay:600:1year" }],
          [{ text: "‹ بازگشت", callback_data: "menu:profile", style: "danger" }]
        ],
        en: [
          [{ text: "✦ 1 Day - 1 Star ✦", callback_data: "stars_pay:1:1day" }],
          [{ text: "✦ 1 Week - 25 Stars ✦", callback_data: "stars_pay:25:1week" }],
          [{ text: "✦ 1 Month - 50 Stars ✦", callback_data: "stars_pay:50:1month" }],
          [{ text: "✦ 3 Months - 150 Stars ✦", callback_data: "stars_pay:150:3months" }],
          [{ text: "✦ 1 Year - 600 Stars ✦", callback_data: "stars_pay:600:1year" }],
          [{ text: "‹ Back", callback_data: "menu:profile", style: "danger" }]
        ],
        ru: [
          [{ text: "✦ 1 день - 1 Звезда ✦", callback_data: "stars_pay:1:1day" }],
          [{ text: "✦ 1 неделя - 25 Звезд ✦", callback_data: "stars_pay:25:1week" }],
          [{ text: "✦ 1 месяц - 50 Звезд ✦", callback_data: "stars_pay:50:1month" }],
          [{ text: "✦ 3 месяца - 150 Звезд ✦", callback_data: "stars_pay:150:3months" }],
          [{ text: "✦ 1 год - 600 Звезд ✦", callback_data: "stars_pay:600:1year" }],
          [{ text: "‹ Назад", callback_data: "menu:profile", style: "danger" }]
        ]
      };

      const text = premiumText[lang as "fa" | "en" | "ru"] || premiumText.fa;
      const keyboard: any = {
        inline_keyboard: buttons[lang as "fa" | "en" | "ru"] || buttons.fa
      };

      await editTelegramMessage(baseUrl, chatId, messageId, text, keyboard);
      return;
    }

    if (data.startsWith("stars_pay:")) {
      const lang = await getUserLang(chatId);
      const parts = data.split(":");
      const starsAmount = parseInt(parts[1], 10);
      const duration = parts[2];
      
      let title = "";
      let description = "";
      let label = "";
      let payBtnText = "";
      let backBtnText = "";
      
      if (lang === "fa") {
        payBtnText = `پرداخت ⭐️ ${starsAmount}`;
        backBtnText = "‹ بازگشت";
        if (duration === "1day") {
          title = "اشتراک پریمیوم یک روزه ربات";
          description = "خرید اشتراک بدون محدودیت یک روزه با ۱ استارز تلگرام\n(Telegram Stars XTR)";
          label = "اشتراک یک روزه";
        } else if (duration === "1week") {
          title = "اشتراک پریمیوم یک هفته ربات";
          description = "خرید اشتراک بدون محدودیت یک هفته با 25 استارز تلگرام\n(Telegram Stars XTR)";
          label = "اشتراک یک هفته";
        } else if (duration === "1month") {
          title = "اشتراک پریمیوم یک ماهه ربات";
          description = "خرید اشتراک بدون محدودیت یک ماهه با 50 استارز تلگرام\n(Telegram Stars XTR)";
          label = "اشتراک یک ماهه";
        } else if (duration === "3months") {
          title = "اشتراک پریمیوم سه ماهه ربات";
          description = "خرید اشتراک بدون محدودیت سه ماهه با 150 استارز تلگرام\n(Telegram Stars XTR)";
          label = "اشتراک سه ماهه";
        } else {
          title = "اشتراک پریمیوم یک ساله ربات";
          description = "خرید اشتراک بدون محدودیت یک ساله با 600 استارز تلگرام\n(Telegram Stars XTR)";
          label = "اشتراک یک ساله";
        }
      } else if (lang === "ru") {
        payBtnText = `Оплатить ⭐️ ${starsAmount}`;
        backBtnText = "‹ Назад";
        if (duration === "1day") {
          title = "Премиум-подписка на бота (1 день)";
          description = "Покупка безлимитной подписки на 1 день за 1 Telegram Star\n(Telegram Stars XTR)";
          label = "Подписка на 1 день";
        } else if (duration === "1week") {
          title = "Премиум-подписка на бота (1 неделя)";
          description = "Покупка безлимитной подписки на 1 неделю за 25 Telegram Stars\n(Telegram Stars XTR)";
          label = "Подписка на 1 неделю";
        } else if (duration === "1month") {
          title = "Премиум-подписка на бота (1 месяц)";
          description = "Покупка безлимитной подписки на 1 месяц за 50 Telegram Stars\n(Telegram Stars XTR)";
          label = "Подписка на 1 месяц";
        } else if (duration === "3months") {
          title = "Премиум-подписка на бота (3 месяца)";
          description = "Покупка безлимитной подписки на 3 месяца за 150 Telegram Stars\n(Telegram Stars XTR)";
          label = "Подписка на 3 месяца";
        } else {
          title = "Премиум-подписка на бота (1 год)";
          description = "Покупка безлимитной подписки на 1 год за 600 Telegram Stars\n(Telegram Stars XTR)";
          label = "Подписка на 1 год";
        }
      } else {
        payBtnText = `Pay ⭐️ ${starsAmount}`;
        backBtnText = "‹ Back";
        if (duration === "1day") {
          title = "Bot Premium Subscription 1 Day";
          description = "Purchase unlimited subscription for 1 day with 1 Telegram Star\n(Telegram Stars XTR)";
          label = "1 Day Subscription";
        } else if (duration === "1week") {
          title = "Bot Premium Subscription 1 Week";
          description = "Purchase unlimited subscription for 1 week with 25 Telegram Stars\n(Telegram Stars XTR)";
          label = "1 Week Subscription";
        } else if (duration === "1month") {
          title = "Bot Premium Subscription 1 Month";
          description = "Purchase unlimited subscription for 1 month with 50 Telegram Stars\n(Telegram Stars XTR)";
          label = "1 Month Subscription";
        } else if (duration === "3months") {
          title = "Bot Premium Subscription 3 Months";
          description = "Purchase unlimited subscription for 3 months with 150 Telegram Stars\n(Telegram Stars XTR)";
          label = "3 Months Subscription";
        } else {
          title = "Bot Premium Subscription 1 Year";
          description = "Purchase unlimited subscription for 1 year with 600 Telegram Stars\n(Telegram Stars XTR)";
          label = "1 Year Subscription";
        }
      }

      // Delete the options menu
      await deleteTelegramMessage(baseUrl, chatId, messageId);

      const keyboard: any = {
        inline_keyboard: [
          [{ text: payBtnText, pay: true }],
          [{ text: backBtnText, callback_data: "menu:premium", style: "danger" }]
        ]
      };

      await sendTelegramInvoice(
        baseUrl,
        chatId,
        title,
        description,
        `stars_premium_${duration}_${chatId}`,
        "XTR",
        [{ label: label, amount: starsAmount }],
        keyboard
      );
      return;
    }

    if (data === "menu:referral") {
      const lang = await getUserLang(chatId);
      const rawUsername = (botUsername && botUsername.startsWith("@")) ? botUsername.slice(1) : (botUsername || "DL_FLOW_bot");
      const refData = await getReferralData(chatId);

      const referralText = {
        fa: `<b>دعوت از دوستان</b>\n\nبا معرفی ربات به دوستان خود، به ازای هر دعوت موفق ۳ روز اشتراک پریمیوم رایگان دریافت کنید\n\nلینک دعوت اختصاصی شما:\nhttps://t.me/${rawUsername}?start=ref_${chatId}\n\n› تعداد دعوت‌ها: ${refData.count} نفر\n› پاداش دریافتی: ${refData.days} روز پریمیوم\n\nلینک خود را با دوستانتان به اشتراک بگذارید و اشتراک پریمیوم رایگان دریافت کنید`,
        en: `<b>Invite Friends</b>\n\nBy introducing the bot to your friends, get 3 days of free premium subscription for each successful invite.\n\nYour Exclusive Invite Link:\nhttps://t.me/${rawUsername}?start=ref_${chatId}\n\n› Referrals count: ${refData.count} people\n› Reward received: ${refData.days} days Premium\n\nShare your link with friends and get free premium subscription!`,
        ru: `<b>Пригласить друзей</b>\n\nПриглашая друзей в бота, вы получаете 3 дня бесплатной премиум-подписки за каждое успешное приглашение.\n\nВаша эксклюзивная ссылка для приглашения:\nhttps://t.me/${rawUsername}?start=ref_${chatId}\n\n› Количество приглашений: ${refData.count} человек\n› Награда: ${refData.days} дн. Премиум\n\nПоделитесь ссылкой с друзьями и получите бесплатную премиум-подписку!`
      };

      const buttons = {
        fa: { share: "اشتراک‌گذاری لینک رفرال", back: "‹ بازگشت" },
        en: { share: "Share Referral Link", back: "‹ Back" },
        ru: { share: "Поделиться реферальной ссылкой", back: "‹ Назад" }
      };

      const btn = buttons[lang as "fa" | "en" | "ru"] || buttons.fa;
      const text = referralText[lang as "fa" | "en" | "ru"] || referralText.fa;

      const keyboard: any = {
        inline_keyboard: [
          [
            { text: btn.share, url: `https://t.me/share/url?url=https://t.me/${rawUsername}?start=ref_${chatId}`, style: "success" }
          ],
          [
            { text: btn.back, callback_data: "menu:profile", style: "danger" }
          ]
        ]
      };
      await editTelegramMessage(baseUrl, chatId, messageId, text, keyboard);
      return;
    }

    if (data === "menu:history" || data === "menu:clear_history") {
      if (data === "menu:clear_history") {
        await clearUserHistory(chatId);
      }
      
      const lang = await getUserLang(chatId);
      const userHistory = await getUserHistory(chatId);
      
      const backText = { fa: "‹ بازگشت به پروفایل", en: "‹ Back to Profile", ru: "‹ Назад в профиль" };
      
      if (userHistory.length === 0) {
        const historyText = {
          fa: "<b>تاریخچه دانلودهای شما</b>\n\nدر حال حاضر هیچ دانلودی در تاریخچه شما ثبت نشده است. لینک پست‌های یوتیوب یا اینستاگرام را بفرستید تا اولین دانلود ثبت شود!",
          en: "<b>Your Download History</b>\n\nThere are currently no downloads in your history. Send links to start downloading and build your history!",
          ru: "<b>История загрузок</b>\n\nНа данный момент в вашей истории нет загрузок. Отправляйте ссылки, чтобы начать скачивание!"
        };
        const text = historyText[lang as "fa" | "en" | "ru"] || historyText.fa;
        const keyboard: any = {
          inline_keyboard: [
            [{ text: backText[lang as "fa" | "en" | "ru"] || backText.fa, callback_data: "menu:profile", style: "danger" }]
          ]
        };
        await editTelegramMessage(baseUrl, chatId, messageId, text, keyboard);
        return;
      }

      let text = lang === 'fa' ? "<b>تاریخچه دانلودهای شما:</b>\n\n" : lang === 'en' ? "<b>Your Download History:</b>\n\n" : "<b>История загрузок:</b>\n\n";
      

      const inline_keyboard: any[][] = [];
      userHistory.forEach((item, index) => {
        let btnText = item.title || "Link";
        if (btnText.length > 30) btnText = btnText.substring(0, 30) + '...';
        inline_keyboard.push([{ text: `${index + 1}. ${btnText}`, callback_data: `hist_${item.id}` }]);
      });

      const clearText = { fa: "پاک کردن تاریخچه", en: "Clear History", ru: "Очистить историю" };

      inline_keyboard.push([{ text: clearText[lang as "fa" | "en" | "ru"] || clearText.fa, callback_data: "menu:clear_history" }]);
      inline_keyboard.push([{ text: backText[lang as "fa" | "en" | "ru"] || backText.fa, callback_data: "menu:profile", style: "danger" }]);

      const keyboard: any = { inline_keyboard };
      
      await editTelegramMessage(baseUrl, chatId, messageId, text, keyboard);
      return;
    }

    if (data.startsWith("hist_")) {
      const histId = parseInt(data.replace("hist_", ""), 10);
      if (!isNaN(histId)) {
        const h = await db.select().from(history).where(eq(history.id, histId)).limit(1);
        if (h.length > 0) {
          const url = h[0].url;
          await analyzeAndSendOptions(baseUrl, chatId, url);
        }
      }
      return;
    }

    if (data === "menu:support") {
      const lang = await getUserLang(chatId);
      const backBtnText = lang === "fa" ? "‹ بازگشت" : lang === "ru" ? "‹ Наزاد" : "‹ Back";
      const keyboard: any = {
        inline_keyboard: [
          [
            { text: backBtnText, callback_data: "menu:close_support", style: "danger" }
          ]
        ]
      };
      
      await setSupportState(chatId, true, []); // activate chat room
      
      await editTelegramMessage(baseUrl, chatId, messageId, botTranslations[lang].supportSection, keyboard);
      return;
    }

if (data === "menu:close_support") {
      const state = await getSupportState(chatId);
      if (state.active) {
        for (const msgId of state.messages) {
          try {
            await deleteTelegramMessage(baseUrl, chatId, msgId);
          } catch (err) {}
        }
        await setSupportState(chatId, false);
      }
      
      // Go back to main menu
      const lang = await getUserLang(chatId);
      const welcomeMessage = botTranslations[lang as "fa" | "en" | "ru"].welcome;
      const keyboard: any = {
        inline_keyboard: [
          [
            { text: botTranslations[lang as "fa" | "en" | "ru"].profile, callback_data: "menu:profile", style: "primary" },
            { text: botTranslations[lang as "fa" | "en" | "ru"].support, callback_data: "menu:support", style: "success" }
          ]
        ]
      };
      
      await editTelegramMessage(baseUrl, chatId, messageId, welcomeMessage, keyboard);
      return;
    }

    if (data === "menu:change_lang") {
      const lang = await getUserLang(chatId);
      const keyboard: any = {
        inline_keyboard: [
          [
            { text: (lang === "fa" ? "✓ " : "") + "فارسی 🇮🇷", callback_data: "lang:fa" },
            { text: (lang === "en" ? "✓ " : "") + "English 🇬🇧", callback_data: "lang:en" },
            { text: (lang === "ru" ? "✓ " : "") + "Русский 🇷🇺", callback_data: "lang:ru" }
          ],
          [
            { text: lang === "fa" ? "‹ بازگشت به پروفایل" : lang === "ru" ? "‹ Назад в профиль" : "‹ Back to Profile", callback_data: "menu:profile", style: "danger" }
          ]
        ]
      };
      await editTelegramMessage(baseUrl, chatId, messageId, botTranslations[lang].selectLang, keyboard);
      return;
    }

    if (data.startsWith("lang:")) {
      const selectedLang = data.split(":")[1];
      await setUserLang(chatId, selectedLang);
      
      const confirmMsg = botTranslations[selectedLang].langChanged.replace(/<\/?b>/g, "");
      fetch(`${baseUrl}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackQuery.id, text: confirmMsg, show_alert: false })
      }).catch(() => {});

      const lang = selectedLang;
      const isPremium = await getUserSub(chatId);
      const usedDownloads = await getDownloadStats(chatId);
      const remainingDownloads = Math.max(0, 5 - usedDownloads);
      
      let subText = "عادی";
      if (lang === "en") subText = isPremium ? "Premium" : `Normal (Remaining Downloads: ${remainingDownloads}/5)`;
      else if (lang === "ru") subText = isPremium ? "Премиум" : `Обычная (Осталось загрузок: ${remainingDownloads}/5)`;
      else subText = isPremium ? "پریمیوم" : `عادی (شارژ دانلود: ${remainingDownloads}/5)`;

      const profileText = botTranslations[lang as "fa" | "en" | "ru"].profileSection
        .replace("{chatId}", chatId.toString())
        .replace("{subscription}", subText);
      
      const buttons = {
        fa: { premium: "پریمیوم", referral: "رفرال", lang: "زبان", history: "تاریخچه", back: "‹ بازگشت" },
        en: { premium: "Premium", referral: "Referral", lang: "Language", history: "History", back: "‹ Back" },
        ru: { premium: "Премиум", referral: "Рефералы", lang: "Язык", history: "История", back: "‹ Назад" }
      };

      const btn = buttons[lang as "fa" | "en" | "ru"] || buttons.fa;

      const keyboard: any = {
        inline_keyboard: [
          [
            { text: btn.premium, callback_data: "menu:premium" },
            { text: btn.referral, callback_data: "menu:referral" }
          ],
          [
            { text: btn.history, callback_data: "menu:history" },
            { text: btn.lang, callback_data: "menu:change_lang" }
          ],
          [
            { text: btn.back, callback_data: "menu:start", style: "danger" }
          ]
        ]
      };
      await editTelegramMessage(baseUrl, chatId, messageId, profileText, keyboard);
      return;
    }

    if (data.startsWith("menu:select_video:")) {
      const urlId = data.split(":")[2];
      const cached = urlCache.get(urlId);
      const lang = await getUserLang(chatId);
      if (!cached) {
        await editTelegramMessage(baseUrl, chatId, messageId, botTranslations[lang].expiredSession);
        return;
      }

      // Build video quality menu exactly from available videoQualities
      const videoQualities = cached.videoQualities || [];
      const availableBtns = [];
      availableBtns.push({ text: botTranslations[lang].dlVideoBest || "Best", callback_data: `dl:video:best:${urlId}` });
      
      videoQualities.forEach((vq, index) => {
        let text = vq.label;
        availableBtns.push({ text: text, callback_data: `dl:video:${index}:${urlId}` });
      });

      // Group inline buttons by 2, except for best quality which spans full width
      const inline_keyboard = [];
      inline_keyboard.push([availableBtns[0]]);
      for (let i = 1; i < availableBtns.length; i += 2) {
        inline_keyboard.push(availableBtns.slice(i, i + 2));
      }

      inline_keyboard.push([{ text: botTranslations[lang].backBtn, callback_data: `menu:back_to_media:${urlId}`, style: "danger" }]);

      const keyboard: any = { inline_keyboard };

      await editTelegramMessage(baseUrl, chatId, messageId, botTranslations[lang].chooseVideoQuality, keyboard);
      return;
    }

    if (data.startsWith("menu:select_music:")) {
      const urlId = data.split(":")[2];
      const cached = urlCache.get(urlId);
      const lang = await getUserLang(chatId);
      if (!cached) {
        await editTelegramMessage(baseUrl, chatId, messageId, botTranslations[lang].expiredSession);
        return;
      }

      const keyboard: any = {
        inline_keyboard: [
          [
            { text: botTranslations[lang].music320, callback_data: `dl:audio:mp3-320:${urlId}` },
            { text: botTranslations[lang].music128, callback_data: `dl:audio:mp3-128:${urlId}` }
          ],
          [
            { text: botTranslations[lang].musicWav, callback_data: `dl:audio:wav:${urlId}` }
          ],
          [
            { text: botTranslations[lang].backBtn, callback_data: `menu:back_to_media:${urlId}`, style: "danger" }
          ]
        ]
      };

      await editTelegramMessage(baseUrl, chatId, messageId, botTranslations[lang].chooseMusicQuality, keyboard);
      return;
    }

    if (data.startsWith("menu:select_thumbnail:")) {
      const urlId = data.split(":")[2];
      const cached = urlCache.get(urlId);
      const lang = await getUserLang(chatId);
      if (!cached) {
        await editTelegramMessage(baseUrl, chatId, messageId, botTranslations[lang].expiredSession);
        return;
      }

      const keyboard: any = {
        inline_keyboard: [
          [
            { text: "JPG", callback_data: `dl:thumbnail:jpg:${urlId}` },
            { text: "PNG", callback_data: `dl:thumbnail:png:${urlId}` }
          ],
          [
            { text: "BMP", callback_data: `dl:thumbnail:bmp:${urlId}` }
          ]
        ]
      };

      keyboard.inline_keyboard.push([
        { text: botTranslations[lang].backBtn, callback_data: `menu:back_to_media:${urlId}`, style: "danger" }
      ]);

      await editTelegramMessage(baseUrl, chatId, messageId, botTranslations[lang].chooseThumbnailQuality, keyboard);
      return;
    }

    if (data.startsWith("menu:back_to_media:")) {
      const urlId = data.split(":")[2];
      const cached = urlCache.get(urlId);
      const lang = await getUserLang(chatId);
      if (!cached) {
        await editTelegramMessage(baseUrl, chatId, messageId, botTranslations[lang].expiredSession);
        return;
      }

      const keyboard: any = { inline_keyboard: [] };
      
      if (!cached.isImageOnly) {
        keyboard.inline_keyboard.push([
          { text: botTranslations[lang].videoMenu, callback_data: `menu:select_video:${urlId}` },
          { text: botTranslations[lang].musicMenu, callback_data: `menu:select_music:${urlId}` }
        ]);
      }

      if (cached.thumbnailBest) {
        keyboard.inline_keyboard.push([
          { text: botTranslations[lang].thumbnailMenu, callback_data: `menu:select_thumbnail:${urlId}` }
        ]);
      }

      const textToShow = cached.caption || botTranslations[lang].chooseCategory;
      await editTelegramMessage(baseUrl, chatId, messageId, textToShow, keyboard);
      return;
    }

    if (data.startsWith("dl:")) {
      const [_, type, formatId, urlId] = data.split(":");
      const cached = urlCache.get(urlId);

      const lang = await getUserLang(chatId);
      
      if (!cached) {
        await editTelegramMessage(baseUrl, chatId, messageId, botTranslations[lang].expiredSession);
        return;
      }

      if (!(await checkDownloadLimit(chatId))) {
        await editTelegramMessage(baseUrl, chatId, messageId, botTranslations[lang].dailyLimitReached);
        return;
      }
      
      await incrementDownloadCount(chatId);

      // Restore media info page on messageId
      const menuKeyboard: any = { inline_keyboard: [] };
      if (!cached.isImageOnly) {
        menuKeyboard.inline_keyboard.push([
          { text: botTranslations[lang].videoMenu, callback_data: `menu:select_video:${urlId}` },
          { text: botTranslations[lang].musicMenu, callback_data: `menu:select_music:${urlId}` }
        ]);
      }
      if (cached.thumbnailBest) {
        menuKeyboard.inline_keyboard.push([
          { text: botTranslations[lang].thumbnailMenu, callback_data: `menu:select_thumbnail:${urlId}` }
        ]);
      }
      const infoText = cached.caption || botTranslations[lang].chooseCategory;
      await editTelegramMessage(baseUrl, chatId, messageId, infoText, menuKeyboard);

      // Send a new message below for download progress
      const progressMsg = await sendTelegramMessage(baseUrl, chatId, botTranslations[lang].startingDownload);
      const progressMsgId = progressMsg?.result?.message_id;

      if (type === "thumbnail") {
        const thumUrl = cached.thumbnailBest || cached.thumbnailMedium;
        if (!thumUrl) {
          if (progressMsgId) {
            await editTelegramMessage(baseUrl, chatId, progressMsgId, "❌ Thumbnail not found!");
          }
          return;
        }

        try {
          if (progressMsgId) {
            await editTelegramMessage(baseUrl, chatId, progressMsgId, renderUploadProgress(lang, 0));
          }

          // Fetch the thumbnail
          const imgRes = await fetch(thumUrl);
          if (!imgRes.ok) throw new Error("Failed to fetch image");
          const buffer = await imgRes.arrayBuffer();

          let fileBuffer = Buffer.from(buffer);
          let ext = "jpg";
          
          try {
            if (formatId === "png") {
              const img = sharp(fileBuffer);
              fileBuffer = await img.png().toBuffer();
              ext = "png";
            } else if (formatId === "bmp") {
              const { Jimp } = await import('jimp');
              const pngBuffer = await sharp(fileBuffer).png().toBuffer();
              const img = await Jimp.read(pngBuffer);
              fileBuffer = await img.getBuffer("image/bmp");
              ext = "bmp";
            } else {
              const img = sharp(fileBuffer);
              fileBuffer = await img.jpeg().toBuffer();
            }
          } catch (err) {
            console.warn("Sharp/Jimp error in telegram thumbnail processing", err);
          }

          const blob = new Blob([fileBuffer]);
          const formData = new FormData();
          formData.append("chat_id", chatId.toString());
          formData.append("document", blob, `${cached.title || "thumbnail"}.${ext}`);
          formData.append("caption", botTranslations[lang].finalCaption.replace("{title}", cached.title || "Thumbnail").replace("{size}", (fileBuffer.length / (1024 * 1024)).toFixed(1)));

          const sendRes = await fetch(`${baseUrl}/sendDocument`, {
            method: "POST",
            body: formData,
          });
          const sendResult = await sendRes.json();

          if (sendResult.ok) {
            if (progressMsgId) {
              await deleteTelegramMessage(baseUrl, chatId, progressMsgId);
            }
          } else {
            throw new Error(sendResult.description || "Failed to upload");
          }
        } catch (err: any) {
          console.error("Error sending thumbnail:", err);
          if (progressMsgId) {
            await editTelegramMessage(baseUrl, chatId, progressMsgId, `❌ Error: ${err.message}`);
          }
        }
        return;
      }

      await startTelegramDownload(baseUrl, chatId, progressMsgId, cached.url, type, formatId, cached.title, urlId);
    }
  }

  // 4. Pre Checkout Query Update (Telegram Stars Payment Approver)
  if (update.pre_checkout_query) {
    const preCheckoutQuery = update.pre_checkout_query;
    try {
      await fetch(`${baseUrl}/answerPreCheckoutQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pre_checkout_query_id: preCheckoutQuery.id,
          ok: true,
        }),
      });
    } catch (err) {
      console.error("Error answering pre checkout query:", err);
    }
    return;
  }
}

// Send Message helper
async function sendTelegramMessage(baseUrl: string, chatId: number, text: string, replyMarkup?: any): Promise<any> {
  try {
    const body: any = {
      chat_id: chatId,
      text: text,
      parse_mode: "HTML",
    };
    if (replyMarkup) {
      body.reply_markup = replyMarkup;
    }

    const res = await fetch(`${baseUrl}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!json.ok) {
      console.warn(`[Telegram API Error] sendMessage failed for chat ${chatId}:`, json.description || json);
      // Fallback if HTML tags are malformed
      if (json.description && (json.description.includes("can't parse entities") || json.description.includes("tag"))) {
        delete body.parse_mode;
        const retryRes = await fetch(`${baseUrl}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        return await retryRes.json();
      }
    }
    return json;
  } catch (err) {
    console.error("Error sending Telegram message:", err);
  }
}

// Send Photo helper
async function sendTelegramPhoto(baseUrl: string, chatId: number, photoUrl: string, caption: string, replyMarkup?: any): Promise<any> {
  try {
    const body: any = {
      chat_id: chatId,
      photo: photoUrl,
      caption: caption,
      parse_mode: "HTML",
    };
    if (replyMarkup) {
      body.reply_markup = replyMarkup;
    }

    const res = await fetch(`${baseUrl}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!json.ok) {
      console.warn(`[Telegram API Error] sendPhoto failed for chat ${chatId}:`, json.description || json);
      if (json.description && (json.description.includes("can't parse entities") || json.description.includes("tag"))) {
        delete body.parse_mode;
        const retryRes = await fetch(`${baseUrl}/sendPhoto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        return await retryRes.json();
      }
    }
    return json;
  } catch (err) {
    console.error("Error sending Telegram photo:", err);
  }
}

// Delete Message helper
async function deleteTelegramMessage(baseUrl: string, chatId: number, messageId: number): Promise<any> {
  try {
    const res = await fetch(`${baseUrl}/deleteMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
    });
    return await res.json();
  } catch (err) {
    console.error("Error deleting Telegram message:", err);
  }
}

// Edit Message helper (handles both text messages and photo captions)
async function editTelegramMessage(baseUrl: string, chatId: number, messageId: number, text: string, replyMarkup?: any): Promise<any> {
  // Try editMessageText first (most messages edited during progress/menu are standard text messages)
  try {
    const res = await fetch(`${baseUrl}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: text,
        parse_mode: "HTML",
        reply_markup: replyMarkup
      }),
    });
    const data = await res.json();
    if (data.ok || (data.description && data.description.includes("message is not modified"))) {
      return data;
    }
  } catch (err) {}

  // Fallback to editMessageCaption for photo/video messages with a caption
  try {
    const res = await fetch(`${baseUrl}/editMessageCaption`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        caption: text,
        parse_mode: "HTML",
        reply_markup: replyMarkup
      }),
    });
    const data = await res.json();
    if (data.ok || (data.description && data.description.includes("message is not modified"))) {
      return data;
    }
  } catch (err) {}

  return null;
}

// Send Invoice helper
async function sendTelegramInvoice(
  baseUrl: string,
  chatId: number,
  title: string,
  description: string,
  payload: string,
  currency: string,
  prices: { label: string; amount: number }[],
  replyMarkup?: any
): Promise<any> {
  try {
    const body: any = {
      chat_id: chatId,
      title: title,
      description: description,
      payload: payload,
      provider_token: "", // Required to be empty for Telegram Stars
      currency: currency,
      prices: prices,
    };
    if (replyMarkup) {
      body.reply_markup = replyMarkup;
    }

    const res = await fetch(`${baseUrl}/sendInvoice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (err) {
    console.error("Error sending Telegram invoice:", err);
  }
}

// Analyze Link and Send Options
async function analyzeAndSendOptions(baseUrl: string, chatId: number, url: string) {
  const lang = await getUserLang(chatId);
  const statusMsg = await sendTelegramMessage(baseUrl, chatId, botTranslations[lang].analyzing);
  const statusMsgId = statusMsg?.result?.message_id;

  try {
    const cookiesFile = path.join(process.cwd(), "cookies.txt");
    const hasCookies = fs.existsSync(cookiesFile);

    const fetchOptions: any = {
      dumpSingleJson: true,
      noWarnings: true,
      noCheckCertificates: true,
      jsRuntimes: "node",
      ignoreNoFormatsError: true,
    };
    if (hasCookies) fetchOptions.cookies = cookiesFile;

    await ensureYtdlp();
    let info: any = null;
    try {
      info = await youtubedl(url, fetchOptions);
    } catch (ytError: any) {
      const isPinterest = url.includes("pinterest.com") || url.includes("pin.it");
      if (isPinterest) {
        try {
          const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } });
          const html = await res.text();
          const titleMatch = html.match(/property="og:title"[^>]*content="([^"]+)"/) || html.match(/content="([^"]+)"[^>]*property="og:title"/);
          const imageMatch = html.match(/property="og:image"[^>]*content="([^"]+)"/) || html.match(/content="([^"]+)"[^>]*property="og:image"/);
          
          if (imageMatch && imageMatch[1]) {
            info = {
              extractor: "pinterest",
              title: titleMatch ? titleMatch[1] : "Pinterest Image",
              thumbnail: imageMatch[1],
              thumbnails: [{ url: imageMatch[1] }],
              duration: 0,
              uploader: "Pinterest",
              is_image_only: true
            };
          } else {
            throw ytError;
          }
        } catch (fallbackErr) {
          throw ytError;
        }
      } else {
        throw ytError;
      }
    }

    const platform = detectPlatform(info.extractor, url);

    const videoQualities: any[] = [];
    if (info.formats) {
      const vFormats = info.formats.filter((f: any) => 
        f.vcodec && f.vcodec !== 'none' && 
        !f.vcodec.includes('mjpeg') && 
        !f.vcodec.includes('images') && 
        f.height && typeof f.height === 'number'
      );
      
      const resMap = new Map<string, any>();
      for (const f of vFormats) {
        const width = f.width || 0;
        const height = f.height || 0;
        const resKey = `${width}x${height}`;
        
        const existing = resMap.get(resKey);
        const hasAudio = !!(f.acodec && f.acodec !== 'none');
        
        if (!existing) {
          f.hasAudio = hasAudio;
          resMap.set(resKey, f);
        } else {
          const existingHasAudio = existing.hasAudio;
          if (hasAudio && !existingHasAudio) {
            f.hasAudio = hasAudio;
            resMap.set(resKey, f);
          } else if (hasAudio === existingHasAudio) {
             const tbr1 = f.tbr || 0;
             const tbr2 = existing.tbr || 0;
             if (tbr1 > tbr2) {
               f.hasAudio = hasAudio;
               resMap.set(resKey, f);
             }
          }
        }
      }

      const sortedFormats = Array.from(resMap.values()).sort((a, b) => {
        const pixelsA = (a.width || 0) * (a.height || 0);
        const pixelsB = (b.width || 0) * (b.height || 0);
        if (pixelsA !== pixelsB) return pixelsB - pixelsA;
        return (b.height || 0) - (a.height || 0);
      });

      for (const f of sortedFormats) {
        let label = "";
        if (f.width && f.height) {
          label = `${f.width}x${f.height}`;
        } else {
          label = `${f.height}p`;
        }
        videoQualities.push({
           width: f.width,
           height: f.height,
           label: label,
           formatId: f.format_id,
           hasAudio: f.hasAudio
        });
      }
    }

    if (platform === "pinterest") {
      info.is_image_only = true;
    }
    const title = info.title || "Media File";
    const duration = formatDuration(info.duration);
    const uploader = info.uploader || info.channel || info.author || "Unknown";

    // Check if we have a valid preview/thumbnail
    let thumbnailBest = info.thumbnail || "";
    let thumbnailMedium = "";
    if (info.thumbnails && info.thumbnails.length > 0) {
      thumbnailBest = info.thumbnails[info.thumbnails.length - 1].url || info.thumbnail || "";
      if (info.thumbnails.length > 1) {
        thumbnailMedium = info.thumbnails[Math.floor(info.thumbnails.length / 2)].url || "";
      } else {
        thumbnailMedium = info.thumbnails[0].url || "";
      }
    }
    const hasValidThumbnail = typeof thumbnailBest === "string" && (thumbnailBest.startsWith("http://") || thumbnailBest.startsWith("https://"));

    // Build the caption
    let caption = `
<b>${botTranslations[lang].mediaFound}</b>

<b>${botTranslations[lang].title}:</b> ${title}
<b>${botTranslations[lang].uploader}:</b> ${uploader}
<b>${botTranslations[lang].duration}:</b> ${duration || botTranslations[lang].unknown}
<b>${botTranslations[lang].platform}:</b> ${platform}

${botTranslations[lang].chooseCategory}
    `.trim();

    // Generate cache entry to keep callback_data under 64-bytes
    const urlId = crypto.randomUUID().substring(0, 8);
    urlCache.set(urlId, { 
      url, 
      title, 
      platform,
      thumbnailBest: hasValidThumbnail ? thumbnailBest : undefined,
      thumbnailMedium: (thumbnailMedium && thumbnailMedium.startsWith("http")) ? thumbnailMedium : undefined,
      caption: caption,
      isImageOnly: info.is_image_only,
      videoQualities: videoQualities
    });

    // Setup beautiful category selection buttons
    const keyboard: any = { inline_keyboard: [] };
    
    if (!info.is_image_only) {
      keyboard.inline_keyboard.push([
        { text: botTranslations[lang].videoMenu, callback_data: `menu:select_video:${urlId}` },
        { text: botTranslations[lang].musicMenu, callback_data: `menu:select_music:${urlId}` }
      ]);
    }

    // If there is a valid thumbnail, add the Thumbnail menu button!
    if (hasValidThumbnail) {
      keyboard.inline_keyboard.push([
        { text: botTranslations[lang].thumbnailMenu, callback_data: `menu:select_thumbnail:${urlId}` }
      ]);
    }

    let photoSent = false;
    if (hasValidThumbnail) {
      const sendPhotoRes = await sendTelegramPhoto(baseUrl, chatId, thumbnailBest, caption, keyboard);
      if (sendPhotoRes && sendPhotoRes.ok) {
        photoSent = true;
        if (statusMsgId) {
          await deleteTelegramMessage(baseUrl, chatId, statusMsgId);
        }
      }
    }

    if (!photoSent) {
      if (statusMsgId) {
        await editTelegramMessage(baseUrl, chatId, statusMsgId, caption, keyboard);
      } else {
        await sendTelegramMessage(baseUrl, chatId, caption, keyboard);
      }
    }

  } catch (error: any) {
    console.error(`Analyze failed for ${url}:`, error);
    let errorMessage = error?.stderr || error?.message || "";
    if (error?.code === "EACCES" || error?.code === "ENOENT") {
      errorMessage = `System error: Failed to execute yt-dlp (${error.code}). Please check file permissions.`;
    }
    if (!errorMessage) {
      errorMessage = "خطا در بررسی لینک (احتمالاً سایت مبدا دسترسی را مسدود کرده است).";
    }
    if (typeof errorMessage === "string") {
      errorMessage = errorMessage.replace(/Deprecated Feature: Support for Python version 3\.10 has been deprecated\. Please update to Python 3\.11 or above\n?/g, "").trim();
    }
    const friendly = getFriendlyError(url, errorMessage, lang);
    const failHeader = botTranslations[lang].analyzeFailed;
    
    if (statusMsgId) {
      await editTelegramMessage(baseUrl, chatId, statusMsgId, `${failHeader}\n\n${friendly}`);
    } else {
      await sendTelegramMessage(baseUrl, chatId, `${failHeader}\n\n${friendly}`);
    }
  }
}

function renderUploadProgress(lang: string, percent: number): string {
  const totalBlocks = 10;
  const filled = Math.min(10, Math.max(0, Math.round((percent / 100) * totalBlocks)));
  const empty = totalBlocks - filled;
  const bar = '⬢'.repeat(filled) + '⬡'.repeat(empty);

  const template = botTranslations[lang]?.uploadProgress || botTranslations.fa.uploadProgress;
  return template.replace("{bar}", bar).replace("{percent}", Math.round(percent).toString());
}

async function uploadFileToBotApiWithProgress(
  baseUrl: string,
  method: string,
  chatId: number,
  filePath: string,
  cleanTitle: string,
  captionText: string,
  extraFields: Record<string, string>,
  fileFieldName: string,
  onProgress?: (pct: number) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(`${baseUrl}/${method}`);
      const boundary = "----TelegramBotBoundary" + Math.random().toString(36).substring(2) + Date.now().toString(36);

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;

      let headerText = "";
      const fields: Record<string, string> = { chat_id: chatId.toString(), caption: captionText, ...extraFields };
      for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined && v !== null) {
          headerText += `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`;
        }
      }

      const ext = path.extname(cleanTitle).toLowerCase();
      let mime = "application/octet-stream";
      if (ext === ".mp4") mime = "video/mp4";
      else if (ext === ".mov") mime = "video/quicktime";
      else if (ext === ".mp3") mime = "audio/mpeg";
      else if (ext === ".wav") mime = "audio/wav";
      else if (ext === ".m4a") mime = "audio/mp4";
      else if (ext === ".jpg" || ext === ".jpeg") mime = "image/jpeg";
      else if (ext === ".png") mime = "image/png";

      headerText += `--${boundary}\r\nContent-Disposition: form-data; name="${fileFieldName}"; filename="${cleanTitle}"\r\nContent-Type: ${mime}\r\n\r\n`;

      const footerText = `\r\n--${boundary}--\r\n`;

      const headerBuf = Buffer.from(headerText, "utf8");
      const footerBuf = Buffer.from(footerText, "utf8");
      const totalLength = headerBuf.length + fileSize + footerBuf.length;

      const requestLib = urlObj.protocol === "https:" ? https : http;

      const req = requestLib.request(urlObj, {
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": totalLength,
        },
      }, (res) => {
        let responseData = "";
        res.on("data", (chunk) => { responseData += chunk; });
        res.on("end", () => {
          try {
            const parsed = JSON.parse(responseData);
            resolve(parsed);
          } catch (e) {
            reject(new Error("Invalid JSON response: " + responseData));
          }
        });
      });

      req.on("error", (err) => reject(err));

      let uploadedBytes = 0;
      let lastUpdate = Date.now();

      req.write(headerBuf);
      uploadedBytes += headerBuf.length;

      const fileStream = fs.createReadStream(filePath, { highWaterMark: 512 * 1024 });

      fileStream.on("data", (chunk: Buffer) => {
        uploadedBytes += chunk.length;
        req.write(chunk);

        if (onProgress) {
          const pct = Math.min(99, Math.round((uploadedBytes / totalLength) * 100));
          const now = Date.now();
          if (now - lastUpdate > 2000) {
            lastUpdate = now;
            onProgress(pct);
          }
        }
      });

      fileStream.on("end", () => {
        req.write(footerBuf);
        req.end();
        if (onProgress) onProgress(100);
      });

      fileStream.on("error", (err) => {
        req.destroy(err);
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}

// Handle download, progress updates, and file sending
async function startTelegramDownload(baseUrl: string, chatId: number, progressMsgId: number, url: string, type: string, formatId: string, title: string, urlId?: string) {
  const lang = await getUserLang(chatId);

  await addUserHistory(chatId, title, url);

  const downloadsDir = path.join(process.cwd(), "downloads");
  if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir);
  }

  const taskId = crypto.randomUUID();
  let targetExt = "mp4";
  if (type === "audio") {
    targetExt = formatId === "wav" ? "wav" : "mp3";
  }

  const filename = `${taskId}.${targetExt}`;
  const filePath = path.join(downloadsDir, filename);

  const cookiesFile = path.join(process.cwd(), "cookies.txt");
  const hasCookies = fs.existsSync(cookiesFile);

  const dlOptions: any = {
    output: filePath,
    noWarnings: true,
    noCheckCertificates: true,
    jsRuntimes: "node",
    ffmpegLocation: ffmpeg,
    concurrentFragments: 150,
    socketTimeout: 30,
    retries: 3,
  };
  if (hasCookies) dlOptions.cookies = cookiesFile;

  if (type === "video") {
    dlOptions.mergeOutputFormat = "mp4";
    if (formatId === "best") {
      dlOptions.format = "bestvideo+bestaudio/best";
      // removed insane postprocessor args
    } else {
      const index = parseInt(formatId);
      const cached = urlId ? urlCache.get(urlId) : null;
      if (cached && cached.videoQualities && cached.videoQualities[index]) {
        const vq = cached.videoQualities[index];
        if (vq.hasAudio) {
          dlOptions.format = `${vq.formatId}`;
        } else {
          dlOptions.format = `${vq.formatId}+bestaudio/best`;
        }
      } else {
        dlOptions.format = "bestvideo+bestaudio/best";
      }
    }
  } else if (type === "audio") {
    dlOptions.format = "bestaudio/best";
    dlOptions.extractAudio = true;
    if (targetExt === "wav") {
      dlOptions.audioFormat = "wav";
      // removed insane postprocessor args
    } else {
      dlOptions.audioFormat = "mp3";
      if (formatId === "mp3-320") {
        dlOptions.audioQuality = "320K";
      } else if (formatId === "mp3-128") {
        dlOptions.audioQuality = "128K";
      } else {
        dlOptions.audioQuality = "256K";
      }
    }
  }

  try {
    let lastUpdate = Date.now();
    let maxDownloadPercent = 0;
    let streamIndex = 0;
    let lastRawPercent = 0;

    await ensureYtdlp();
    const dlProcess = youtubedl.exec(url, dlOptions);

    dlProcess.stdout?.on("data", (data) => {
      const text = data.toString();
      const percentMatch = text.match(/\[download\]\s+([\d\.]+)%/);

      if (percentMatch) {
        const rawPercent = parseFloat(percentMatch[1]);
        if (rawPercent < lastRawPercent - 15) {
          streamIndex++;
        }
        lastRawPercent = rawPercent;

        let calculatedPercent = 0;
        if (streamIndex === 0) {
          calculatedPercent = rawPercent * 0.85;
        } else {
          calculatedPercent = 85 + (rawPercent * 0.15);
        }

        if (calculatedPercent > maxDownloadPercent) {
          maxDownloadPercent = calculatedPercent;
        }

        const displayPercent = Math.min(100, Math.round(maxDownloadPercent));

        if (Date.now() - lastUpdate > 2500 || displayPercent >= 100) {
          const totalBlocks = 10;
          const filled = Math.min(10, Math.max(0, Math.round((displayPercent / 100) * totalBlocks)));
          const empty = totalBlocks - filled;
          const bar = '⬢'.repeat(filled) + '⬡'.repeat(empty);

          const progressStr = (botTranslations[lang]?.downloadProgress || botTranslations.fa.downloadProgress)
            .replace("{bar}", bar)
            .replace("{percent}", displayPercent.toString());

          if (progressMsgId) {
            editTelegramMessage(baseUrl, chatId, progressMsgId, progressStr).catch(() => {});
          }
          lastUpdate = Date.now();
        }
      }
    });

    let dlError = "";
    dlProcess.stderr?.on("data", (data) => {
      dlError += data.toString();
    });

    dlProcess.on("close", async (code) => {
      if (code === 0) {
        if (progressMsgId) {
          await editTelegramMessage(baseUrl, chatId, progressMsgId, renderUploadProgress(lang, 0));
        }

        // Verify downloaded file name (sometimes extension can change dynamically due to merger/converter)
        const files = fs.readdirSync(downloadsDir);
        const downloadedFile = files.find(f => f.startsWith(taskId + "."));
        const finalFilePath = downloadedFile ? path.join(downloadsDir, downloadedFile) : filePath;
        const finalFilename = downloadedFile || filename;

        const serverHost = getServerHost();
        const directLink = serverHost ? `${serverHost}/downloads/${finalFilename}` : null;

        try {
          let stats = fs.statSync(finalFilePath);
          let sizeMB = stats.size / (1024 * 1024);

          // If file size is >= 50MB but < 150MB, compress it with ffmpeg to fit under 50MB
          if (sizeMB >= 50 && sizeMB < 150) {
            try {
              const fileExtension = finalFilename.split(".").pop()?.toLowerCase() || "mp4";
              const targetFile = finalFilePath + ".compressed." + fileExtension;
              const { execSync } = await import("child_process");
              if (fileExtension === "mp3" || fileExtension === "wav" || fileExtension === "m4a") {
                execSync(`"${ffmpeg}" -i "${finalFilePath}" -b:a 96k "${targetFile}"`, { stdio: "ignore" });
              } else {
                execSync(`"${ffmpeg}" -i "${finalFilePath}" -vcodec libx264 -crf 32 -preset ultrafast -acodec aac -b:a 96k "${targetFile}"`, { stdio: "ignore" });
              }
              if (fs.existsSync(targetFile)) {
                const compStats = fs.statSync(targetFile);
                const compSizeMB = compStats.size / (1024 * 1024);
                if (compSizeMB < 50) {
                  fs.unlinkSync(finalFilePath);
                  fs.renameSync(targetFile, finalFilePath);
                  stats = fs.statSync(finalFilePath);
                  sizeMB = compSizeMB;
                }
              }
            } catch (compErr) {
              console.error("Compression fallback error:", compErr);
            }
          }

          let uploadedSuccessfully = false;

          // Telegram standard bots are restricted to uploading 50MB files via HTTP API
          if (sizeMB < 50) {
            try {
              const fileExtension = finalFilename.split(".").pop()?.toLowerCase() || "bin";
              const safeTitle = (title || "Media").replace(/["']/g, "").replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").trim();
              const cleanTitle = `${safeTitle || "Media"}.${fileExtension}`;

              let method = "sendDocument";
              let fileFieldName = "document";
              const extraFields: Record<string, string> = {};

              let captionText = botTranslations[lang].finalCaption
                  .replace("{title}", title || "Media")
                  .replace("{size}", sizeMB.toFixed(1));
                  
              if (fileExtension === "mp4" || fileExtension === "mov") {
                method = "sendVideo";
                fileFieldName = "video";
                extraFields["supports_streaming"] = "true";
              } else if (fileExtension === "mp3" || fileExtension === "wav" || fileExtension === "m4a") {
                method = "sendAudio";
                fileFieldName = "audio";
                extraFields["title"] = safeTitle || "Media File";
              }

               let sendResult = await uploadFileToBotApiWithProgress(
                 baseUrl,
                 method,
                 chatId,
                 finalFilePath,
                 cleanTitle,
                 captionText,
                 extraFields,
                 fileFieldName,
                 (pct) => {
                   if (progressMsgId) {
                     editTelegramMessage(baseUrl, chatId, progressMsgId, renderUploadProgress(lang, pct)).catch(() => {});
                   }
                 }
               );

               if (!sendResult || !sendResult.ok) {
                 console.warn(`Method ${method} failed, falling back to sendDocument:`, sendResult);
                 method = "sendDocument";
                 fileFieldName = "document";
                 const docExtraFields: Record<string, string> = {};
                 sendResult = await uploadFileToBotApiWithProgress(
                   baseUrl,
                   method,
                   chatId,
                   finalFilePath,
                   cleanTitle,
                   captionText,
                   docExtraFields,
                   fileFieldName,
                   (pct) => {
                     if (progressMsgId) {
                       editTelegramMessage(baseUrl, chatId, progressMsgId, renderUploadProgress(lang, pct)).catch(() => {});
                     }
                   }
                 );
               }

               if (sendResult && sendResult.ok) {
                 uploadedSuccessfully = true;
                 if (progressMsgId) {
                   await deleteTelegramMessage(baseUrl, chatId, progressMsgId);
                 }
                 return;
               } else {
                 console.error("Failed to upload natively via Telegram Bot API. Falling back to MTProto.", sendResult);
               }
            } catch (fetchErr) {
              console.error("Bot API upload error, falling back to MTProto:", fetchErr);
            }
          }

          // File >= 50MB or standard Bot API upload failed. Use MTProto!
          if (!uploadedSuccessfully) {
            const botToken = getBotTokenFromUrl(baseUrl);
            let caption = botTranslations[lang].finalCaption.replace("{title}", title || "Media").replace("{size}", sizeMB.toFixed(1));

            let mtprotoError = "";
            try {
              uploadedSuccessfully = await sendLargeFileMTProto(baseUrl, botToken, chatId, finalFilePath, title, caption, (pct) => {
                if (progressMsgId) {
                  editTelegramMessage(baseUrl, chatId, progressMsgId, renderUploadProgress(lang, pct)).catch(() => {});
                }
              });
            } catch (err: any) {
              mtprotoError = err.message || String(err);
              uploadedSuccessfully = false;
            }

            if (uploadedSuccessfully) {
              if (progressMsgId) {
                await deleteTelegramMessage(baseUrl, chatId, progressMsgId);
              }
              return;
            } else if (mtprotoError) {
               await sendTelegramMessage(baseUrl, chatId, `⚠️ MTProto Upload Error:\n\`${mtprotoError}\``);
            }
          }

          // Fallback if file exceeds 50MB and MTProto also fails
          if (!uploadedSuccessfully) {
            if (progressMsgId) {
              let limitMessage = botTranslations[lang].fileTooLarge
                .replace("{size}", sizeMB.toFixed(1))
                .replace("{link}", directLink || "#");
              if (!directLink) {
                limitMessage = botTranslations[lang].domainNotSet.replace("{size}", sizeMB.toFixed(1));
              }
              await editTelegramMessage(baseUrl, chatId, progressMsgId, limitMessage);
            }
          }

        } catch (sendErr: any) {
          console.error("Error sending file to Telegram user:", sendErr);
          if (progressMsgId) {
            await editTelegramMessage(baseUrl, chatId, progressMsgId, `${botTranslations[lang].sendingError} ${sendErr.message}`);
          }
        }
      } else {
        let errorMessage = dlError || "Download failed.";
        errorMessage = errorMessage.replace(/Deprecated Feature: Support for Python version 3\.10 has been deprecated\. Please update to Python 3\.11 or above\n?/g, "").trim();
        const friendly = getFriendlyError(url, errorMessage, lang);
        if (progressMsgId) {
          await editTelegramMessage(baseUrl, chatId, progressMsgId, `${botTranslations[lang].downloadError}\n\n${friendly}`);
        }
      }
    });

  } catch (error: any) {
    console.error("Download execution error:", error);
    if (progressMsgId) {
      await editTelegramMessage(baseUrl, chatId, progressMsgId, `${botTranslations[lang].suddenError} ${error.message}`);
    }
  }
}

// Extract Bot Token from Telegram Base URL
function getBotTokenFromUrl(baseUrl: string): string {
  const tokenMatch = baseUrl.match(/\/bot([^/]+)/);
  if (tokenMatch) return tokenMatch[1];
  
  const tokenFile = path.join(process.cwd(), "telegram_token.txt");
  if (fs.existsSync(tokenFile)) {
    return fs.readFileSync(tokenFile, "utf-8").trim();
  }
  return process.env.TELEGRAM_BOT_TOKEN || "";
}

// Global MTProto Client cache
let mtprotoClient: any = null;
let pendingCodeResolve: ((code: string) => void) | null = null;
let pendingPasswordResolve: ((password: string) => void) | null = null;

async function getMTProtoClient(baseUrl: string, token: string) {
  if (mtprotoClient) {
    if (mtprotoClient.connected) {
      return mtprotoClient;
    }
    try {
      await mtprotoClient.connect();
      return mtprotoClient;
    } catch (e) {
      console.error("Error reconnecting MTProto client:", e);
      mtprotoClient = null;
    }
  }
  
  const apiId = process.env.TELEGRAM_API_ID ? parseInt(process.env.TELEGRAM_API_ID, 10) : 32151201;
  const apiHash = process.env.TELEGRAM_API_HASH || "3993838fa31ed8f0bc24c8fc109dfd5f";
  console.log(`Initializing MTProto client as BOT with API_ID: ${apiId}...`);
  
  try {
    const { TelegramClient } = await import("telegram");
    const { StringSession } = await import("telegram/sessions/index.js");
    const sessionFile = require("path").join(process.cwd(), "telegram_bot_session.txt");
    
    let sessionString = process.env.TELEGRAM_BOT_STRING_SESSION || "";
    if (!sessionString && fs.existsSync(sessionFile)) {
      sessionString = fs.readFileSync(sessionFile, "utf-8").trim();
    }
    
    const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, {
      connectionRetries: 5,
    });
    
    await client.start({
      botAuthToken: token,
    });
    
    const newSession = (client.session as any)?.save ? (client.session as any).save() : "";
    if (newSession) {
      fs.writeFileSync(sessionFile, String(newSession), "utf-8");
    }
    
    mtprotoClient = client;
    console.log("MTProto client authenticated as BOT successfully.");
    return mtprotoClient;
  } catch (err) {
    console.error("Failed to initialize MTProto client:", err);
    throw err;
  }
}

// MTProto file sending helper
async function sendLargeFileMTProto(baseUrl: string, token: string, chatId: number, filePath: string, title: string, caption: string, onProgress?: (progressPercent: number) => void): Promise<boolean> {
  let tempFilePath = "";
  try {
    const client = await getMTProtoClient(baseUrl, token);
    
    const fileExtension = filePath.split(".").pop()?.toLowerCase() || "bin";
    const safeTitle = (title || "Media").replace(/["']/g, "").replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").trim();
    const cleanTitle = `${safeTitle || "Media"}.${fileExtension}`;
    
    const originalDir = path.dirname(filePath);
    tempFilePath = path.join(originalDir, cleanTitle);
    
    // Rename file to keep the correct filename upon Telegram upload
    fs.renameSync(filePath, tempFilePath);
    
    console.log(`Uploading large file via MTProto: ${cleanTitle} (${tempFilePath})`);
    
    let lastUpdate = 0;

    let peer: any;
    try {
      const { Api } = await import("telegram");
      peer = new Api.InputPeerUser({ userId: BigInt(chatId) as any, accessHash: BigInt(0) as any });
    } catch (e) {
      peer = chatId.toString();
    }
    await client.sendFile(peer, {
      file: tempFilePath,
      caption: caption,
      parseMode: "html",
      forceDocument: false,
      workers: 160,
      partSize: 1024 * 1024,
      progressCallback: (progress: any, total?: any) => {
        if (!onProgress) return;
        let pct = 0;
        if (typeof total === "number" && total > 0) {
          pct = (Number(progress) / Number(total)) * 100;
        } else if (typeof progress === "number") {
          pct = progress <= 1 ? progress * 100 : progress;
        }
        const now = Date.now();
        if (now - lastUpdate > 2500 || pct >= 100) {
          lastUpdate = now;
          onProgress(Math.min(100, Math.max(0, Math.round(pct))));
        }
      },
    });
    
    try {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    } catch (e) {}
    
    return true;
  } catch (err: any) {
    console.error("Error sending large file via MTProto:", err);
    // Cleanup temporary file if renamed and still exists
    try {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    } catch (e) {}
    throw err;
  }
}
