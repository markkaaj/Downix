const fs = require('fs');
let code = fs.readFileSync('telegram.ts', 'utf8');

const brokenIndex = code.indexOf(`              if (fileExtension === "mp3" || fileExtension === "wav" || fileExtension === "m4a") {        const client = new TelegramClient`);
if (brokenIndex === -1) {
    console.log("NOT FOUND!");
    process.exit(1);
}

const endIndex = code.indexOf(` === "wav" || fileExtension === "m4a") {`, brokenIndex) + ` === "wav" || fileExtension === "m4a") {`.length;

if (endIndex <= brokenIndex + 50) {
    console.log("END NOT FOUND");
    process.exit(1);
}

const goodBlock = `              if (fileExtension === "mp3" || fileExtension === "wav" || fileExtension === "m4a") {
                execSync(\`"\${ffmpeg}" -i "\${finalFilePath}" -b:a 96k "\${targetFile}"\`, { stdio: "ignore" });
              } else {
                execSync(\`"\${ffmpeg}" -i "\${finalFilePath}" -vcodec libx264 -crf 32 -preset ultrafast -acodec aac -b:a 96k "\${targetFile}"\`, { stdio: "ignore" });
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
              const safeTitle = (title || "Media").replace(/["']/g, "").replace(/[<>:"/\\\\|?*\\x00-\\x1F]/g, "_").trim();
              const cleanTitle = \`\${safeTitle || "Media"}.\${fileExtension}\`;

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
              } else if (fileExtension === "mp3" || fileExtension === "wav" || fileExtension === "m4a") {`;

const newCode = code.slice(0, brokenIndex) + goodBlock + code.slice(endIndex);
fs.writeFileSync('telegram.ts', newCode, 'utf8');
console.log("FIXED!");
