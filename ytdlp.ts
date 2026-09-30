import fs from "fs";
import path from "path";
import https from "https";
import youtubeDlExec from "youtube-dl-exec";

const binPath = path.join("/tmp", "yt-dlp_linux");
const localBinPath = path.join(process.cwd(), "yt-dlp_linux");

let initPromise: Promise<string> | null = null;

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Delete target if it already exists to avoid issues
    if (fs.existsSync(dest)) {
      try {
        fs.unlinkSync(dest);
      } catch (e) {
        // ignore
      }
    }

    const file = fs.createWriteStream(dest);
    
    const request = (targetUrl: string) => {
      https.get(targetUrl, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          if (response.headers.location) {
            request(response.headers.location);
          } else {
            reject(new Error(`Redirect status ${response.statusCode} without location header`));
          }
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: Status Code ${response.statusCode}`));
          return;
        }

        response.pipe(file);

        file.on("finish", () => {
          file.close();
          resolve();
        });
      }).on("error", (err) => {
        fs.unlink(dest, () => {}); // delete partial file
        reject(err);
      });
    };

    request(url);
  });
}

async function runInit(): Promise<string> {
  // 1. Check if the binary is already in /tmp and of valid size
  if (fs.existsSync(binPath)) {
    try {
      const stats = fs.statSync(binPath);
      if (stats.size >= 30000000) {
        fs.chmodSync(binPath, 0o755);
        console.log("Valid yt-dlp_linux found in /tmp.");
        return binPath;
      }
    } catch (err) {
      console.error("Error inspecting yt-dlp_linux:", err);
    }
  }

  // 2. Try copying from workspace root
  if (fs.existsSync(localBinPath)) {
    console.log("Copying yt-dlp_linux from workspace root to /tmp...");
    try {
      fs.copyFileSync(localBinPath, binPath);
      fs.chmodSync(binPath, 0o755);
      console.log("Successfully copied and chmodded yt-dlp_linux from workspace root.");
      return binPath;
    } catch (err) {
      console.error("Failed to copy yt-dlp_linux from workspace root:", err);
    }
  }

  // 3. Fallback: Download using native https module
  console.log("Standalone yt-dlp binary not found locally. Downloading from GitHub to /tmp natively...");
  try {
    await downloadFile("https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux", binPath);
    fs.chmodSync(binPath, 0o755);
    console.log("Successfully downloaded and chmodded yt-dlp_linux natively.");
    return binPath;
  } catch (err) {
    console.error("Failed to download yt-dlp_linux fallback natively:", err);
    throw new Error(`Failed to initialize yt-dlp binary: ${err.message}`);
  }
}

export function ensureYtdlp(): Promise<string> {
  if (initPromise) {
    return initPromise;
  }
  
  initPromise = (async () => {
    try {
      const path = await runInit();
      return path;
    } catch (err) {
      initPromise = null; // reset so next request can retry
      throw err;
    }
  })();
  
  return initPromise;
}

// Proactive initialization at startup, but don't block module export
ensureYtdlp().catch((err) => {
  console.error("Proactive yt-dlp initialization failed:", err);
});

const youtubedl = youtubeDlExec.create(binPath);
export default youtubedl;
