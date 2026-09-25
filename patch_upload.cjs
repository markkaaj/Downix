const fs = require('fs');
let code = fs.readFileSync('telegram.ts', 'utf8');

const brokenBlock = `              if (fileExtension === "mp3" || fileExtension === "wav" || fileExtension === "m4a") {        const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, {      connectionRetries: 5,    });    if (client.setLogLevel) client.setLogLevel("debug");        try {      await client.start({        phoneNumber: async () => process.env.TELEGRAM_PHONE || "+19429993274",        phoneCode: async () => {          console.log("MTProto login: requesting phone code");          await sendTelegramMessage(baseUrl, 7421504833, "⚠️ **MTProto Login Required**\\nPlease send the 5-digit login code you just received from Telegram using the command:\\n\`/code 12345\`");          return new Promise((resolve) => {            pendingCodeResolve = (code: string) => {              console.log("MTProto login: phone code received:", code);              pendingCodeResolve = null;              resolve(code);            };          });        },        password: async () => {          console.log("MTProto login: requesting password");          await sendTelegramMessage(baseUrl, 7421504833, "⚠️ **2FA Password Required**\\nPlease send your Two-Step Verification password using the command:\\n\`/pass your_password\`");          return new Promise((resolve) => {            pendingPasswordResolve = (pass: string) => {              console.log("MTProto login: password received");              pendingPasswordResolve = null;              resolve(pass);            };          });        },        onError: (err) => {          console.log("MTProto auth error:", err);          sendTelegramMessage(baseUrl, 7421504833, \`❌ **MTProto Auth Error:**\\n\${err.message}\`).catch(() => {});          return true; // return true to stop the loop instead of throwing        },      });      const newSession = (client.session as any).save();      fs.writeFileSync(sessionFile, String(newSession || ""), "utf-8");      console.log("MTProto session saved successfully.");      await sendTelegramMessage(baseUrl, 7421504833, \`✅ **MTProto Logged In Successfully!**\\n\\nYour session string is (save this in Railway as \\\`TELEGRAM_STRING_SESSION\\\`):\\n\\n\\\`\${newSession}\\\`\`);      mtprotoClient = client;      console.log("MTProto client authenticated and connected successfully.");      return mtprotoClient;    } catch (startErr: any) {      console.error("Failed to start MTProto client:", startErr);      await sendTelegramMessage(baseUrl, 7421504833, \`❌ **MTProto Start Error:**\\n\${startErr.message}\`).catch(() => {});      throw startErr;    }  } catch (err) { === "wav" || fileExtension === "m4a") {`;

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

code = code.replace(brokenBlock, goodBlock);
fs.writeFileSync('telegram.ts', code, 'utf8');
