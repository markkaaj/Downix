const fs = require('fs');
let code = fs.readFileSync('telegram.ts', 'utf8');

const regex = /if \(fileExtension === "mp3" \|\| fileExtension === "wav" \|\| fileExtension === "m4a"\) \{\s*const client = new TelegramClient[\s\S]*?\} catch \(err\) \{ === "wav" \|\| fileExtension === "m4a"\) \{/;

if (!regex.test(code)) {
    console.log("Regex not matched!");
    process.exit(1);
}

const goodBlock = `if (fileExtension === "mp3" || fileExtension === "wav" || fileExtension === "m4a") {
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

code = code.replace(regex, goodBlock);
fs.writeFileSync('telegram.ts', code, 'utf8');
console.log("FIXED!");
