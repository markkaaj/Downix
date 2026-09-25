const fs = require('fs');
let code = fs.readFileSync('telegram.ts', 'utf8');

// Change sendLargeFileMTProto to throw error
const oldFunc = `  } catch (err) {
    console.error("Error sending large file via MTProto:", err);
    // Cleanup temporary file if renamed and still exists
    try {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    } catch (e) {}
    return false;
  }`;
const newFunc = `  } catch (err: any) {
    console.error("Error sending large file via MTProto:", err);
    // Cleanup temporary file if renamed and still exists
    try {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    } catch (e) {}
    throw err;
  }`;
code = code.replace(oldFunc, newFunc);

const oldCall = `            uploadedSuccessfully = await sendLargeFileMTProto(baseUrl, botToken, chatId, finalFilePath, title, caption, (pct) => {
              if (progressMsgId) {
                editTelegramMessage(baseUrl, chatId, progressMsgId, renderUploadProgress(lang, pct)).catch(() => {});
              }
            });

            if (uploadedSuccessfully) {
              if (progressMsgId) {
                await deleteTelegramMessage(baseUrl, chatId, progressMsgId);
              }
              return;
            }
          }`;

const newCall = `            let mtprotoError = "";
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
               await sendTelegramMessage(baseUrl, chatId, \`⚠️ MTProto Upload Error:\\n\\\`\${mtprotoError}\\\`\`);
            }
          }`;

code = code.replace(oldCall, newCall);
fs.writeFileSync('telegram.ts', code, 'utf8');
