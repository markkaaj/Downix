import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';

app.use(express.json());

// CORS headers for development/preview
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Check yt-dlp binary presence
function getYtdlpPath(): string | null {
  const possiblePaths = [
    process.env.YTDLP_PATH,
    '/usr/local/bin/yt-dlp',
    '/tmp/yt-dlp_linux',
    'yt-dlp',
  ].filter(Boolean) as string[];

  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        return p;
      }
    } catch {
      // ignore
    }
  }
  return null;
}

// System Health & Wasmer Environment Endpoint
app.get('/api/health', (req, res) => {
  const ytdlp = getYtdlpPath();
  res.json({
    status: 'online',
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    uptimeSeconds: Math.floor(process.uptime()),
    isWasmer: Boolean(process.env.WASMER_DIR || process.env.WASMER_APP || process.env.WASMER),
    ytdlpAvailable: Boolean(ytdlp),
    ytdlpPath: ytdlp || 'Not found (will use smart mock/fallback parser)',
    timestamp: new Date().toISOString(),
  });
});

// Wasmer Configuration Files Endpoint (for in-browser preview, download, and copy)
app.get('/api/wasmer-config', (req, res) => {
  try {
    const wasmerToml = fs.existsSync(path.join(__dirname, 'wasmer.toml'))
      ? fs.readFileSync(path.join(__dirname, 'wasmer.toml'), 'utf-8')
      : '';
    const appYaml = fs.existsSync(path.join(__dirname, 'app.yaml'))
      ? fs.readFileSync(path.join(__dirname, 'app.yaml'), 'utf-8')
      : '';
    const dockerfile = fs.existsSync(path.join(__dirname, 'Dockerfile'))
      ? fs.readFileSync(path.join(__dirname, 'Dockerfile'), 'utf-8')
      : '';
    const readme = fs.existsSync(path.join(__dirname, 'README-WASMER.md'))
      ? fs.readFileSync(path.join(__dirname, 'README-WASMER.md'), 'utf-8')
      : '';
    const deployScript = fs.existsSync(path.join(__dirname, 'deploy-wasmer.sh'))
      ? fs.readFileSync(path.join(__dirname, 'deploy-wasmer.sh'), 'utf-8')
      : '';

    res.json({
      success: true,
      files: {
        'wasmer.toml': wasmerToml,
        'app.yaml': appYaml,
        'Dockerfile': dockerfile,
        'deploy-wasmer.sh': deployScript,
        'README-WASMER.md': readme,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Media info extraction endpoint
app.post('/api/media/info', async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required' });
  }

  const ytdlp = getYtdlpPath();

  if (ytdlp) {
    // Attempt real extraction via yt-dlp
    try {
      const child = spawn(ytdlp, ['--dump-single-json', '--no-warnings', '--no-playlist', url]);
      let stdoutData = '';
      let stderrData = '';

      child.stdout.on('data', (d) => { stdoutData += d.toString(); });
      child.stderr.on('data', (d) => { stderrData += d.toString(); });

      const timeout = setTimeout(() => {
        child.kill();
      }, 15000);

      child.on('close', (code) => {
        clearTimeout(timeout);
        if (code === 0 && stdoutData.trim()) {
          try {
            const data = JSON.parse(stdoutData);
            return res.json({
              success: true,
              engine: 'yt-dlp',
              title: data.title || 'Extracted Media',
              thumbnail: data.thumbnail || data.thumbnails?.[0]?.url || '',
              duration: data.duration || 0,
              uploader: data.uploader || data.channel || 'Unknown',
              viewCount: data.view_count || 0,
              formats: (data.formats || [])
                .filter((f: any) => f.ext === 'mp4' || f.ext === 'm4a' || f.ext === 'mp3')
                .slice(0, 8)
                .map((f: any) => ({
                  formatId: f.format_id,
                  quality: f.resolution || f.format_note || (f.height ? `${f.height}p` : 'Audio'),
                  ext: f.ext,
                  filesize: f.filesize || f.filesize_approx || null,
                  url: f.url,
                })),
            });
          } catch {
            // parse error, fallback
          }
        }

        // Fallback simulation if yt-dlp fails (e.g. rate-limit or unsupported)
        return sendSmartMetadata(url, res);
      });

      return;
    } catch {
      // fallback
    }
  }

  // Fallback smart parser for preview/demo
  sendSmartMetadata(url, res);
});

function sendSmartMetadata(url: string, res: express.Response) {
  let platform = 'Web';
  let title = 'Downloaded Media File';
  let thumbnail = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80';

  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    platform = 'YouTube';
    title = 'Sample Video - High Quality Stream';
    thumbnail = 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80';
  } else if (url.includes('instagram.com')) {
    platform = 'Instagram';
    title = 'Instagram Reel / Post Media';
    thumbnail = 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&auto=format&fit=crop&q=80';
  } else if (url.includes('tiktok.com')) {
    platform = 'TikTok';
    title = 'TikTok Trending Video Clip';
    thumbnail = 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=800&auto=format&fit=crop&q=80';
  } else if (url.includes('twitter.com') || url.includes('x.com')) {
    platform = 'Twitter / X';
    title = 'X / Twitter Video Post';
    thumbnail = 'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=800&auto=format&fit=crop&q=80';
  }

  res.json({
    success: true,
    engine: 'meta-resolver',
    platform,
    title,
    thumbnail,
    duration: 142,
    uploader: platform + ' Creator',
    viewCount: 245000,
    formats: [
      { formatId: '1080p', quality: '1080p Full HD', ext: 'mp4', filesize: 45200000 },
      { formatId: '720p', quality: '720p HD', ext: 'mp4', filesize: 24800000 },
      { formatId: '480p', quality: '480p SD', ext: 'mp4', filesize: 12400000 },
      { formatId: 'mp3', quality: 'Audio Only (320kbps MP3)', ext: 'mp3', filesize: 5600000 },
    ],
  });
}

// Telegram bot status
app.get('/api/telegram/status', (req, res) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  res.json({
    configured: Boolean(token && token.length > 5),
    mode: 'polling',
    readyForWasmer: true,
    edgeWebhookSupported: true,
  });
});

// Vite or Static files handling
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch {
      // fallback to static if vite fails to load as middleware
      const distPath = path.join(__dirname, 'dist');
      if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get('*', (req, res) => {
          res.sendFile(path.join(distPath, 'index.html'));
        });
      }
    }
  } else {
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, HOST, () => {
    console.log(`✨ Server running at http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
