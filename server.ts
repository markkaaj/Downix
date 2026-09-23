import { db, ensureDatabaseTables } from './src/db/index.js';
import { giftCodes, usedGiftCodes, users, subscriptions, history, referrals, usage } from './src/db/schema.js';
import { eq, desc, sql } from 'drizzle-orm';
import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import youtubedl, { ensureYtdlp } from "./ytdlp.js";
import ffmpeg from "ffmpeg-static";
import crypto from "crypto";
import { execSync } from "child_process";
import sharp from "sharp";
import { startTelegramBot, stopTelegramBot, getBotStatus } from "./telegram.js";
import {
  getCloudflareConfig,
  saveCloudflareConfig,
  removeCloudflareConfig,
  checkCloudflareStatus,
  listCloudflareDatabases,
  createCloudflareDatabase,
  initializeD1Tables,
  executeD1Query,
  fetchCloudflareAccounts,
  autoSetupCloudflare,
  pullAllFromCloudflare,
  syncToCloudflare
} from './src/db/cloudflare.js';

function getFriendlyError(url: string, rawError: string): string {
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
      return "این ویدیو یوتیوب نیاز به ورود به حساب دارد. لطفاً کوکی‌های یوتیوب معتبر خود را از منوی بالای صفحه (COOKIE SETTINGS) به‌روزرسانی کنید.";
    }
    if (isInstagram) {
      return "این ویدیو اینستاگرام نیاز به ورود یا احراز هویت دارد. به دلیل محدودیت‌های سرور، لطفاً کوکی‌های معتبر اینستاگرام را تنظیم کنید یا از لینک‌های عمومی‌تر استفاده نمایید.";
    }
    return "این رسانه برای دسترسی نیاز به لاگین یا احراز هویت دارد (محدودیت سرور). لطفاً لینک‌های عمومی‌تر را امتحان کنید یا کوکی‌های مربوطه را تنظیم کنید.";
  }

  if (errStr.includes("unsupported url")) {
    return "آدرس وارد شده پشتیبانی نمی‌شود. لطفاً یک لینک معتبر از یوتیوب، اینستاگرام یا تیک‌تاک وارد کنید.";
  }

  if (errStr.includes("could not resolve host") || errStr.includes("network")) {
    return "خطای شبکه سرور در برقراری ارتباط. لطفاً مجدداً تلاش کنید.";
  }

  return rawError || "خطای ناشناخته در فرآیند دانلود رخ داد.";
}

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

function detectPlatform(extractor: string | undefined, url: string): string {
  const extLower = (extractor || "").toLowerCase();
  const urlLower = url.toLowerCase();
  if (extLower.includes("youtube") || urlLower.includes("youtube.com") || urlLower.includes("youtu.be")) {
    return "youtube";
  }
  if (extLower.includes("instagram") || urlLower.includes("instagram.com")) {
    return "instagram";
  }
  if (extLower.includes("tiktok") || urlLower.includes("tiktok.com")) {
    return "tiktok";
  }
  if (extLower.includes("pinterest") || urlLower.includes("pinterest.com") || urlLower.includes("pin.it")) {
    return "pinterest";
  }
  return "other";
}

async function startServer() {
  // Ensure database tables exist automatically in background without blocking server startup
  const dbInitPromise = ensureDatabaseTables().catch(err => {
    console.warn("[Database] Background tables initialization notice:", err);
  });

  const app = express();
  // In AI Studio sandbox, PORT is strictly 3000 behind the reverse proxy.
  // In external deployments (Railway, Render, VPS, Docker), respect process.env.PORT if provided.
  const PORT = process.env.APPLET_ID ? 3000 : (Number(process.env.PORT) || 3000);

  app.use(express.json());

  // Ensure downloads directory exists
  const downloadsDir = path.join(process.cwd(), "downloads");
  if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir);
  }

  // Load and start Telegram Bot if token is saved or in env
  const tokenFile = path.join(process.cwd(), "telegram_token.txt");
  let savedToken = "";
  if (fs.existsSync(tokenFile)) {
    savedToken = fs.readFileSync(tokenFile, "utf-8").trim();
  } else if (process.env.TELEGRAM_BOT_TOKEN) {
    savedToken = process.env.TELEGRAM_BOT_TOKEN.trim();
  }

  if (savedToken) {
    console.log("Found saved Telegram Bot token, auto-initiating...");
    startTelegramBot(savedToken).catch(err => {
      console.error("Failed to auto-start Telegram bot on startup:", err);
    });
  }

  app.use("/downloads", express.static(downloadsDir));
  app.use("/downloads", (req, res) => {
    res.status(404).json({ error: "File not found" });
  });

  // Store tasks in memory (since we don't have Redis running in this environment)
  const tasks: Record<string, any> = {};

  // API Routes
  app.post("/api/analyze", async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

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

      console.log(`Analyzing URL: ${url}`);
      await ensureYtdlp();
      const info: any = await youtubedl(url, fetchOptions);

      const platform = detectPlatform(info.extractor, url);
      const title = info.title || "Media File";
      const uploader = info.uploader || info.channel || info.author || "Unknown";
      const duration = formatDuration(info.duration);
      let thumbnail = info.thumbnail || "";
      if (info.thumbnails && info.thumbnails.length > 0) {
        const bestThum = info.thumbnails[info.thumbnails.length - 1];
        if (bestThum && bestThum.url) {
          thumbnail = bestThum.url;
        }
      }

      // Parse formats
      const rawFormats = info.formats || [];
      const parsedFormats: any[] = [];

      for (const f of rawFormats) {
        if (f.acodec === "none" && f.vcodec === "none") continue;
        if (f.protocol && (f.protocol.includes("mhtml") || f.protocol.includes("manifest"))) continue;
        if (f.format_id && f.format_id.startsWith("sb")) continue;

        const hasVideo = f.vcodec && f.vcodec !== "none";
        const hasAudio = f.acodec && f.acodec !== "none";

        let type: "video" | "audio" | "mixed" = "mixed";
        if (hasVideo && !hasAudio) type = "video";
        else if (!hasVideo && hasAudio) type = "audio";

        let sizeBytes = f.filesize || f.filesize_approx || 0;
        let sizeStr = "";
        if (sizeBytes > 0) {
          const mb = sizeBytes / (1024 * 1024);
          sizeStr = `${mb.toFixed(1)} MB`;
        }

        let resolution = "";
        if (type === "video" || type === "mixed") {
          resolution = f.resolution || (f.width && f.height ? `${f.width}x${f.height}` : f.format_note || "ویدیو");
          if (resolution.includes("x")) {
            const parts = resolution.split("x");
            if (parts.length === 2 && !isNaN(parseInt(parts[1]))) {
              resolution = parts[1] + "p";
            }
          }
          if (f.fps) resolution += ` ${f.fps}fps`;
        } else {
          resolution = f.format_note || (f.abr ? `${Math.round(f.abr)}kbps` : "کیفیت استاندارد");
        }

        parsedFormats.push({
          formatId: f.format_id,
          ext: f.ext || "mp4",
          resolution,
          type,
          sizeBytes,
          sizeStr,
          vcodec: f.vcodec,
          acodec: f.acodec,
        });
      }

      const uniqueFormats = parsedFormats.filter((f, index, self) =>
        index === self.findIndex((t) => t.formatId === f.formatId)
      );

      const videoFormats = uniqueFormats.filter(f => f.type === "video" || f.type === "mixed");
      const audioFormats = uniqueFormats.filter(f => f.type === "audio");

      videoFormats.sort((a, b) => (b.sizeBytes || 0) - (a.sizeBytes || 0));
      audioFormats.sort((a, b) => (b.sizeBytes || 0) - (a.sizeBytes || 0));

      if (platform !== "pinterest") {
        if (videoFormats.length === 0) {
          videoFormats.push({
            formatId: "best",
            ext: "mp4",
            resolution: "بهترین کیفیت (Best)",
            type: "mixed",
            sizeBytes: 0,
            sizeStr: "",
            vcodec: "unknown",
            acodec: "unknown"
          });
        }
        if (audioFormats.length === 0) {
          audioFormats.push({
            formatId: "bestaudio/best",
            ext: "mp3",
            resolution: "بهترین کیفیت صوتی",
            type: "audio",
            sizeBytes: 0,
            sizeStr: "",
            vcodec: "none",
            acodec: "unknown"
          });
        }
      }

      res.json({
        url,
        title,
        uploader,
        duration,
        thumbnail,
        platform,
        videoFormats,
        audioFormats,
      });

    } catch (error: any) {
      console.error(`Analyze failed for ${url}:`, error);
      let errorMessage = error?.stderr || error?.message || (typeof error === "string" ? error : "");
      if (error?.code === "EACCES" || error?.code === "ENOENT") {
         errorMessage = `System error: Failed to execute yt-dlp (${error.code}). Please check file permissions.`;
      }
      if (!errorMessage) {
         errorMessage = "خطا در بررسی لینک (احتمالاً سایت مبدا دسترسی را مسدود کرده است).";
      }
      if (typeof errorMessage === "string") {
        errorMessage = errorMessage.replace(/Deprecated Feature: Support for Python version 3\.10 has been deprecated\. Please update to Python 3\.11 or above\n?/g, "").trim();
      }
      res.status(500).json({ error: getFriendlyError(url, errorMessage) });
    }
  });

  app.post("/api/download-thumbnail", async (req, res) => {
    const { url, format = "jpg" } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });
    try {
      const fetchReq = await fetch(url);
      if (!fetchReq.ok) throw new Error("Failed to fetch image");
      
      const arrayBuffer = await fetchReq.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      let outBuffer = buffer;
      let contentType = fetchReq.headers.get("content-type") || "image/jpeg";
      let ext = "jpg";

      try {
        if (format === 'png') {
          const img = sharp(buffer);
          outBuffer = await img.png().toBuffer();
          contentType = 'image/png';
          ext = 'png';
        } else if (format === 'bmp') {
          const { Jimp } = await import('jimp');
          const pngBuffer = await sharp(buffer).png().toBuffer();
          const img = await Jimp.read(pngBuffer);
          outBuffer = await img.getBuffer("image/bmp");
          contentType = 'image/bmp';
          ext = 'bmp';
        } else {
          // default jpg
          const img = sharp(buffer);
          outBuffer = await img.jpeg().toBuffer();
          contentType = 'image/jpeg';
          ext = 'jpg';
        }
      } catch (err) {
        console.warn("Sharp/Jimp processing failed, falling back to original buffer", err);
      }

      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="thumbnail.${ext}"`);
      res.send(outBuffer);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to download thumbnail" });
    }
  });

  app.post("/api/download", async (req, res) => {
    const { url, formatId, title, type, ext } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    const taskId = crypto.randomUUID();
    tasks[taskId] = {
      id: taskId,
      status: "downloading",
      progress: 0,
      title: title || "Media File",
      url,
      size: "Unknown",
      speed: "0 MB/s",
    };

    res.json({ taskId });

    try {
      const cookiesFile = path.join(process.cwd(), "cookies.txt");
      const hasCookies = fs.existsSync(cookiesFile);

      let targetExt = "mp4";
      if (type === "audio") {
        targetExt = (formatId === "wav" || ext === "wav") ? "wav" : "mp3";
      }

      const filename = `${taskId}.${targetExt}`;
      const filePath = path.join(downloadsDir, filename);

      let formatArg = formatId || "best";
      const dlOptions: any = {
        output: filePath,
        noWarnings: true,
        noCheckCertificates: true,
        jsRuntimes: "node",
        ffmpegLocation: ffmpeg,
      };
      if (hasCookies) dlOptions.cookies = cookiesFile;

      if (type === "video") {
        dlOptions.recodeVideo = "mp4";
        dlOptions.mergeOutputFormat = "mp4";
        if (formatId === "4k") {
          dlOptions.format = "bestvideo[height<=2160]+bestaudio/best";
          console.log(`Starting custom 4K download for task ${taskId}: format=${dlOptions.format}`);
        } else {
          if (formatId && formatId !== "best") {
            formatArg = `${formatId}+bestaudio/best`;
          }
          dlOptions.format = formatArg;
          console.log(`Starting standard video download for task ${taskId}: format=${formatArg}`);
        }
      } else if (type === "audio") {
        dlOptions.format = "bestaudio/best";
        dlOptions.extractAudio = true;
        if (targetExt === "wav") {
          dlOptions.audioFormat = "wav";
          console.log(`Starting audio download (WAV) for task ${taskId}`);
        } else {
          dlOptions.audioFormat = "mp3";
          if (formatId === "mp3-320") {
            dlOptions.audioQuality = "320K";
          } else if (formatId === "mp3-128") {
            dlOptions.audioQuality = "128K";
          } else {
            dlOptions.audioQuality = "256K"; // high standard quality
          }
          console.log(`Starting audio download (MP3) for task ${taskId}: quality=${dlOptions.audioQuality || "standard"}`);
        }
      }

      await ensureYtdlp();
      const dlProcess = youtubedl.exec(url, dlOptions);

      dlProcess.stdout?.on("data", (data) => {
        const text = data.toString();
        const percentMatch = text.match(/\[download\]\s+([\d\.]+)%/);
        const sizeMatch = text.match(/of\s+([~]?[\d\.]+[a-zA-Z]+)/);
        const speedMatch = text.match(/at\s+([\d\.]+[a-zA-Z]+\/s)/);

        if (percentMatch) tasks[taskId].progress = parseFloat(percentMatch[1]);
        if (sizeMatch) tasks[taskId].size = sizeMatch[1].replace("~", "");
        if (speedMatch) tasks[taskId].speed = speedMatch[1];
      });

      let dlError = "";
      dlProcess.stderr?.on("data", (data) => {
        dlError += data.toString();
      });

      dlProcess.on("close", (code) => {
        if (code === 0) {
          tasks[taskId].status = "success";
          tasks[taskId].progress = 100;

          const files = fs.readdirSync(downloadsDir);
          const downloadedFile = files.find(f => f.startsWith(taskId + "."));

          if (downloadedFile) {
            tasks[taskId].fileUrl = `/downloads/${downloadedFile}`;
            tasks[taskId].downloadName = `${title || "Media File"}.${downloadedFile.split('.').pop()}`;
          } else {
            tasks[taskId].fileUrl = `/downloads/${filename}`;
            tasks[taskId].downloadName = `${title || "Media File"}.${targetExt}`;
          }
        } else {
          tasks[taskId].status = "error";
          let errorMessage = dlError || "Download process exited with an error.";
          errorMessage = errorMessage.replace(/Deprecated Feature: Support for Python version 3\.10 has been deprecated\. Please update to Python 3\.11 or above\n?/g, "").trim();
          tasks[taskId].error = getFriendlyError(url, errorMessage);
        }
      });
    } catch (error: any) {
      tasks[taskId].status = "error";
      let errorMessage = error?.stderr || error?.message || "Failed to download.";
      if (typeof errorMessage === "string") {
        errorMessage = errorMessage.replace(/Deprecated Feature: Support for Python version 3\.10 has been deprecated\. Please update to Python 3\.11 or above\n?/g, "").trim();
      }
      console.log(`Task ${taskId} failed:`, errorMessage);
      tasks[taskId].error = getFriendlyError(url, errorMessage);
    }
  });

  app.get("/api/tasks", (req, res) => {
    // Return all tasks for the queue display
    res.json(Object.values(tasks).reverse());
  });

  app.get("/api/status/:taskId", (req, res) => {
    const task = tasks[req.params.taskId];
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json(task);
  });

  app.get("/api/cookies", (req, res) => {
    const cookiesFile = path.join(process.cwd(), "cookies.txt");
    if (fs.existsSync(cookiesFile)) {
      const content = fs.readFileSync(cookiesFile, "utf-8");
      res.json({ content });
    } else {
      res.json({ content: "" });
    }
  });

  app.post("/api/cookies", (req, res) => {
    const { content } = req.body;
    const cookiesFile = path.join(process.cwd(), "cookies.txt");
    try {
      fs.writeFileSync(cookiesFile, content || "", "utf-8");
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Telegram Bot Endpoints
  
  
  app.get("/api/users/dashboard", async (req, res) => {
    try {
      const [{ count: totalUsers }] = await db.select({ count: sql`count(*)` }).from(users);
      const [{ count: premiumUsers }] = await db.select({ count: sql`count(*)` })
        .from(subscriptions)
        .where(sql`expiry > ${Date.now()}`);
      const [{ count: activeUsers }] = await db.select({ count: sql`count(distinct chat_id)` })
        .from(history)
        .where(sql`date > ${Date.now() - 24 * 60 * 60 * 1000}`);

      const usersList = await db.select({
        id: users.chatId,
        username: users.username,
        isPremium: sql<boolean>`CASE WHEN ${subscriptions.expiry} > ${Date.now()} THEN true ELSE false END`,
        lastActivity: sql<number>`(SELECT MAX(date) FROM history WHERE history.chat_id = users.chat_id)`,
        lastUrl: sql<string>`(SELECT url FROM history WHERE history.chat_id = users.chat_id ORDER BY date DESC LIMIT 1)`
      })
      .from(users)
      .leftJoin(subscriptions, eq(users.chatId, subscriptions.chatId))
      .orderBy(desc(sql`(SELECT MAX(date) FROM history WHERE history.chat_id = users.chat_id)`))
      .limit(20);

      res.json({
        totalUsers: Number(totalUsers) || 0,
        premiumUsers: Number(premiumUsers) || 0,
        activeUsers: Number(activeUsers) || 0,
        users: usersList.map(u => ({
          id: u.id.toString(),
          username: u.username ? "@" + u.username : "User " + u.id.toString().slice(-4),
          status: u.isPremium ? "premium" : "standard",
          lastActivity: u.lastActivity ? new Date(Number(u.lastActivity)).toLocaleDateString() + ' ' + new Date(Number(u.lastActivity)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "None",
          lastUrl: u.lastUrl || "None"
        }))
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  });

  
  app.post("/api/users/premium", async (req, res) => {
    const { chatId, days } = req.body;
    if (!chatId || !days) return res.status(400).json({ error: "Missing fields" });
    try {
      const durationDays = Number(days);
      const current = await db.select().from(subscriptions).where(eq(subscriptions.chatId, Number(chatId))).limit(1);
      const currentExpiry = (current[0] && current[0].expiry && current[0].expiry > Date.now()) ? current[0].expiry : Date.now();
      const expiry = currentExpiry + (durationDays * 24 * 60 * 60 * 1000);

      await db.insert(subscriptions).values({ chatId: Number(chatId), expiry, isLifetime: false })
        .onConflictDoUpdate({ target: subscriptions.chatId, set: { expiry, isLifetime: false } });

      syncToCloudflare('subscriptions', 'upsert', { chatId: Number(chatId), expiry, isLifetime: false }).catch(() => {});

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to activate premium" });
    }
  });

  app.get("/api/gifts", async (req, res) => {
    try {
      const allGifts = await db.select().from(giftCodes).orderBy(desc(giftCodes.createdAt));
      res.json(allGifts);
    } catch (e) {
      res.status(500).json({ error: "Failed to load gifts" });
    }
  });

  app.post("/api/gifts", async (req, res) => {
    const { durationDays, maxUsages } = req.body;
    if (!durationDays || !maxUsages) return res.status(400).json({ error: "Missing fields" });
    try {
      const crypto = await import("crypto");
      const id = crypto.randomUUID().split("-")[0];
      const newGift = {
        id,
        durationDays,
        maxUsages,
        usedCount: 0,
        createdAt: Date.now()
      };
      await db.insert(giftCodes).values(newGift);
      syncToCloudflare('gift_codes', 'insert', newGift).catch(() => {});
      res.json({ success: true, id });
    } catch (e) {
      res.status(500).json({ error: "Failed to create gift" });
    }
  });

  app.delete("/api/gifts/:id", async (req, res) => {
    try {
      await db.delete(giftCodes).where(eq(giftCodes.id, req.params.id));
      syncToCloudflare('gift_codes', 'delete', { id: req.params.id }).catch(() => {});
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to delete gift" });
    }
  });
  
  app.get("/api/telegram/status", (req, res) => {
    res.json(getBotStatus());
  });

  app.post("/api/telegram/config", async (req, res) => {
    const { token } = req.body;
    const tokenFile = path.join(process.cwd(), "telegram_token.txt");
    try {
      if (!token || token.trim().length === 0) {
        await stopTelegramBot();
        if (fs.existsSync(tokenFile)) {
          fs.unlinkSync(tokenFile);
        }
        return res.json({ success: true, message: "Telegram Bot stopped and token removed." });
      }

      const cleanToken = token.trim();
      fs.writeFileSync(tokenFile, cleanToken, "utf-8");
      
      await startTelegramBot(cleanToken);
      
      const status = getBotStatus();
      if (status.running) {
        res.json({ success: true, status });
      } else {
        res.status(400).json({ error: status.error || "خطا در اتصال به ربات تلگرام. توکن خود را بررسی کنید." });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Cloudflare D1 Database Endpoints
  app.get("/api/cloudflare/status", async (req, res) => {
    try {
      const status = await checkCloudflareStatus();
      const config = getCloudflareConfig();
      res.json({
        ...status,
        hasConfig: !!config,
        maskedToken: config?.apiToken ? `${config.apiToken.slice(0, 4)}••••••••${config.apiToken.slice(-4)}` : ''
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/cloudflare/accounts", async (req, res) => {
    const { apiToken } = req.body;
    if (!apiToken) {
      return res.status(400).json({ error: "Missing Cloudflare API Token" });
    }
    const result = await fetchCloudflareAccounts(apiToken);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json({ error: result.error });
    }
  });

  app.post("/api/cloudflare/auto-setup", async (req, res) => {
    const { apiToken, databaseName, migrateData } = req.body;
    if (!apiToken) {
      return res.status(400).json({ error: "Missing Cloudflare API Token" });
    }

    try {
      const result = await autoSetupCloudflare(apiToken, databaseName || "telegram_bot_db");
      if (!result.success || !result.config) {
        return res.status(400).json({ error: result.error || "Auto-setup failed" });
      }

      // Migrate existing local data to Cloudflare D1 if requested
      let migratedCount = 0;
      if (migrateData !== false) {
        try {
          await ensureDatabaseTables();
          const allUsers = await db.select().from(users).catch(() => []);
          for (const u of allUsers) {
            await executeD1Query(
              `INSERT INTO users (chat_id, lang, username) VALUES (?, ?, ?)
               ON CONFLICT(chat_id) DO UPDATE SET lang = excluded.lang, username = excluded.username`,
              [u.chatId, u.lang, u.username],
              result.config
            );
            migratedCount++;
          }

          const allSubs = await db.select().from(subscriptions).catch(() => []);
          for (const s of allSubs) {
            await executeD1Query(
              `INSERT INTO subscriptions (chat_id, is_lifetime, expiry) VALUES (?, ?, ?)
               ON CONFLICT(chat_id) DO UPDATE SET is_lifetime = excluded.is_lifetime, expiry = excluded.expiry`,
              [s.chatId, s.isLifetime ? 1 : 0, s.expiry],
              result.config
            );
          }

          const allGifts = await db.select().from(giftCodes).catch(() => []);
          for (const g of allGifts) {
            await executeD1Query(
              `INSERT INTO gift_codes (id, duration_days, max_usages, used_count, created_at) VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET used_count = excluded.used_count`,
              [g.id, g.durationDays, g.maxUsages, g.usedCount, g.createdAt],
              result.config
            );
          }
        } catch (migErr) {
          console.warn("[Cloudflare D1 Auto-Migration] Notice:", migErr);
        }
      }

      const status = await checkCloudflareStatus();
      res.json({
        success: true,
        message: result.isNewDatabase
          ? `دیتابیس ابری ${result.database?.name} با موفقیت ساخته شد و متصل گردید!`
          : `با موفقیت به دیتابیس ابری ${result.database?.name} متصل شد!`,
        account: result.account,
        database: result.database,
        isNewDatabase: result.isNewDatabase,
        status,
        migratedRecords: migratedCount
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/cloudflare/list-dbs", async (req, res) => {
    const { apiToken, accountId } = req.body;
    if (!apiToken || !accountId) {
      return res.status(400).json({ error: "Missing Cloudflare API Token or Account ID" });
    }
    const result = await listCloudflareDatabases(apiToken, accountId);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json({ error: result.error });
    }
  });

  app.post("/api/cloudflare/create-db", async (req, res) => {
    const { apiToken, accountId, databaseName } = req.body;
    if (!apiToken || !accountId) {
      return res.status(400).json({ error: "Missing Cloudflare API Token or Account ID" });
    }
    const result = await createCloudflareDatabase(apiToken, accountId, databaseName || "telegram_bot_db");
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json({ error: result.error });
    }
  });

  app.post("/api/cloudflare/config", async (req, res) => {
    const { apiToken, accountId, databaseId, databaseName, migrateData } = req.body;
    if (!apiToken || !accountId || !databaseId) {
      return res.status(400).json({ error: "Missing required Cloudflare connection parameters" });
    }

    try {
      const config = {
        apiToken: apiToken.trim(),
        accountId: accountId.trim(),
        databaseId: databaseId.trim(),
        databaseName: databaseName ? databaseName.trim() : "telegram_bot_db",
        enabled: true,
        autoSync: true
      };

      // 1. Initialize tables on Cloudflare D1
      const initRes = await initializeD1Tables(config);
      if (!initRes.success) {
        return res.status(400).json({ error: `Cloudflare D1 initialization failed: ${initRes.error}` });
      }

      // 2. Save config
      saveCloudflareConfig(config);

      // 3. Automatically pull existing data from Cloudflare D1 into local database
      await pullAllFromCloudflare(config).catch(() => {});

      // 4. Migrate existing local data to Cloudflare D1 if requested
      let migratedCount = 0;
      if (migrateData) {
        try {
          await ensureDatabaseTables();
          const allUsers = await db.select().from(users).catch(() => []);
          for (const u of allUsers) {
            await executeD1Query(
              `INSERT INTO users (chat_id, lang, username) VALUES (?, ?, ?)
               ON CONFLICT(chat_id) DO UPDATE SET lang = excluded.lang, username = excluded.username`,
              [u.chatId, u.lang, u.username],
              config
            );
            migratedCount++;
          }

          const allSubs = await db.select().from(subscriptions).catch(() => []);
          for (const s of allSubs) {
            await executeD1Query(
              `INSERT INTO subscriptions (chat_id, is_lifetime, expiry) VALUES (?, ?, ?)
               ON CONFLICT(chat_id) DO UPDATE SET is_lifetime = excluded.is_lifetime, expiry = excluded.expiry`,
              [s.chatId, s.isLifetime ? 1 : 0, s.expiry],
              config
            );
          }

          const allGifts = await db.select().from(giftCodes).catch(() => []);
          for (const g of allGifts) {
            await executeD1Query(
              `INSERT INTO gift_codes (id, duration_days, max_usages, used_count, created_at) VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET used_count = excluded.used_count`,
              [g.id, g.durationDays, g.maxUsages, g.usedCount, g.createdAt],
              config
            );
          }
        } catch (migErr) {
          console.warn("[Cloudflare D1 Migration] Notice:", migErr);
        }
      }

      const status = await checkCloudflareStatus();
      res.json({
        success: true,
        message: "Cloudflare D1 Database connected and synced successfully!",
        status,
        migratedRecords: migratedCount
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/cloudflare/config", async (req, res) => {
    try {
      removeCloudflareConfig();
      res.json({ success: true, message: "Cloudflare database configuration removed." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/cloudflare/sync", async (req, res) => {
    try {
      const config = getCloudflareConfig();
      if (!config || !config.enabled) {
        return res.status(400).json({ error: "Cloudflare database is not configured" });
      }

      await ensureDatabaseTables();
      // 1. Pull from Cloudflare D1 first
      const pullRes = await pullAllFromCloudflare(config);

      // 2. Push any local records
      const allUsers = await db.select().from(users).catch(() => []);
      const allSubs = await db.select().from(subscriptions).catch(() => []);
      const allGifts = await db.select().from(giftCodes).catch(() => []);
      const allHistory = await db.select().from(history).orderBy(desc(history.date)).limit(100).catch(() => []);

      for (const u of allUsers) {
        await executeD1Query(
          `INSERT INTO users (chat_id, lang, username) VALUES (?, ?, ?)
           ON CONFLICT(chat_id) DO UPDATE SET lang = excluded.lang, username = COALESCE(excluded.username, users.username)`,
          [u.chatId, u.lang, u.username],
          config
        );
      }

      for (const s of allSubs) {
        await executeD1Query(
          `INSERT INTO subscriptions (chat_id, is_lifetime, expiry) VALUES (?, ?, ?)
           ON CONFLICT(chat_id) DO UPDATE SET is_lifetime = excluded.is_lifetime, expiry = excluded.expiry`,
          [s.chatId, s.isLifetime ? 1 : 0, s.expiry],
          config
        );
      }

      const allRefs = await db.select().from(referrals).catch(() => []);
      for (const r of allRefs) {
        await executeD1Query(
          `INSERT INTO referrals (chat_id, count, days) VALUES (?, ?, ?)
           ON CONFLICT(chat_id) DO UPDATE SET count = excluded.count, days = excluded.days`,
          [r.chatId, r.count, r.days],
          config
        );
      }

      for (const g of allGifts) {
        await executeD1Query(
          `INSERT INTO gift_codes (id, duration_days, max_usages, used_count, created_at) VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET used_count = excluded.used_count`,
          [g.id, g.durationDays, g.maxUsages, g.usedCount, g.createdAt],
          config
        );
      }

      res.json({
        success: true,
        pull: pullRes,
        synced: {
          users: allUsers.length,
          subscriptions: allSubs.length,
          giftCodes: allGifts.length,
          history: allHistory.length
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Auto-pull existing data on boot if Cloudflare D1 is configured
  const cfConfig = getCloudflareConfig();
  if (cfConfig && cfConfig.enabled && cfConfig.databaseId) {
    dbInitPromise.then(() => pullAllFromCloudflare(cfConfig)).then(r => {
      if (r && r.success) {
        console.log('[Startup] Cloudflare D1 database state restored successfully:', r.importedCounts);
      }
    }).catch(err => {
      console.warn('[Startup] Cloudflare D1 restore notice:', err);
    });
  }

  // Catch-all handler for unmatched /api routes to prevent returning HTML index.html
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `Endpoint not found: ${req.method} ${req.path}` });
  });

  // Global API error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith("/api")) {
      console.error("[API Error]", err);
      res.status(500).json({ error: err?.message || "Internal server error" });
      return;
    }
    next(err);
  });

  // Vite middleware for development
  const isProduction = process.env.NODE_ENV === "production";
  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: ["**/data/**", "**/downloads/**", "**/*.txt", "**/*.pid", "**/dist/**"]
        }
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT} (${isProduction ? "production" : "development"})`);
  });

  server.on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      console.error(`[Server Notice] Port ${PORT} is already in use by an existing process.`);
    } else {
      console.error("[Server Error]", err);
    }
  });
}

startServer();
