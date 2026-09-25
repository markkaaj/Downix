const fs = require('fs');
let code = fs.readFileSync('telegram.ts', 'utf-8');

// 1. Thumbnail start message
code = code.replace(
  'await editTelegramMessage(baseUrl, chatId, messageId, botTranslations[lang].startingDownload);',
  'const captionBase = cached?.caption ? `${cached.caption.replace(botTranslations[lang].chooseCategory, "").trim()}\\n\\n` : "";\n        await editTelegramMessage(baseUrl, chatId, messageId, captionBase + botTranslations[lang].startingDownload);'
);

// 2. Thumbnail processingDone message
code = code.replace(
  'await editTelegramMessage(baseUrl, chatId, progressMsgId, botTranslations[lang].processingDone);',
  'await editTelegramMessage(baseUrl, chatId, progressMsgId, captionBase + botTranslations[lang].processingDone);'
);

// 3. Thumbnail caption on send
code = code.replace(
  'formData.append("document", blob, `${cached.title || "thumbnail"}.${ext}`);',
  'formData.append("document", blob, `${cached.title || "thumbnail"}.${ext}`);\n          formData.append("caption", botTranslations[lang].finalCaption.replace("{title}", cached.title || "Thumbnail").replace("{size}", (fileBuffer.length / (1024 * 1024)).toFixed(1)));'
);

// 4. startTelegramDownload start message
code = code.replace(
  'async function startTelegramDownload(baseUrl: string, chatId: number, messageId: number, url: string, type: string, formatId: string, title: string, urlId?: string) {\n  const lang = getUserLang(chatId);\n  await editTelegramMessage(baseUrl, chatId, messageId, botTranslations[lang].startingDownload);',
  'async function startTelegramDownload(baseUrl: string, chatId: number, messageId: number, url: string, type: string, formatId: string, title: string, urlId?: string) {\n  const lang = getUserLang(chatId);\n  const cached = urlId ? urlCache.get(urlId) : null;\n  const captionBase = cached?.caption ? `${cached.caption.replace(botTranslations[lang].chooseCategory, "").trim()}\\n\\n` : "";\n  await editTelegramMessage(baseUrl, chatId, messageId, captionBase + botTranslations[lang].startingDownload);'
);

// 5. dlProcess.stdout on data (replace entire if block)
const oldProgressStr = `        let progressStr = botTranslations[lang].downloadSource;
        if (percentMatch) progressStr += \`\${botTranslations[lang].progress} \${percentMatch[1]}%\\n\`;
        if (sizeMatch) progressStr += \`\${botTranslations[lang].totalSize} \${sizeMatch[1].replace("~", "")}\\n\`;
        if (speedMatch) progressStr += \`\${botTranslations[lang].speed} \${speedMatch[1]}\\n\`;
        progressStr += botTranslations[lang].progressFooter;

        if (progressMsgId) {
          editTelegramMessage(baseUrl, chatId, progressMsgId, progressStr).catch(() => {});
        }`;

const newProgressStr = `        if (percentMatch) {
          const percent = parseFloat(percentMatch[1]);
          const total = 10;
          const filled = Math.round((percent / 100) * total);
          const empty = total - filled;
          const bar = '⬢'.repeat(filled) + '⬡'.repeat(empty);
          
          const progressStr = captionBase + botTranslations[lang].downloadProgress
              .replace("{bar}", bar)
              .replace("{percent}", percentMatch[1]);

          if (progressMsgId) {
            editTelegramMessage(baseUrl, chatId, progressMsgId, progressStr).catch(() => {});
          }
        }`;

code = code.replace(oldProgressStr, newProgressStr);

// 6. startTelegramDownload processingDone (close code 0)
// There might be another processingDone replacement needed here, let's just do it directly.
code = code.replace(
  '        if (progressMsgId) {\n          await editTelegramMessage(baseUrl, chatId, progressMsgId, botTranslations[lang].processingDone);\n        }',
  '        if (progressMsgId) {\n          await editTelegramMessage(baseUrl, chatId, progressMsgId, captionBase + botTranslations[lang].processingDone);\n        }'
);

// 7. Small files caption
const smallFileCaptionOld = `            if (fileExtension === "mp4" || fileExtension === "mov") {
              method = "sendVideo";
              formData.append("video", blob, cleanTitle);
              formData.append("supports_streaming", "true");
            } else if (fileExtension === "mp3" || fileExtension === "wav" || fileExtension === "m4a") {
              method = "sendAudio";
              formData.append("audio", blob, cleanTitle);
              formData.append("title", title || "Media File");
            } else {
              formData.append("document", blob, cleanTitle);
            }`;

const smallFileCaptionNew = `            const captionText = botTranslations[lang].finalCaption
                .replace("{title}", title || "Media")
                .replace("{size}", sizeMB.toFixed(1));
                
            if (fileExtension === "mp4" || fileExtension === "mov") {
              method = "sendVideo";
              formData.append("video", blob, cleanTitle);
              formData.append("supports_streaming", "true");
              formData.append("caption", captionText);
            } else if (fileExtension === "mp3" || fileExtension === "wav" || fileExtension === "m4a") {
              method = "sendAudio";
              formData.append("audio", blob, cleanTitle);
              formData.append("title", title || "Media File");
              formData.append("caption", captionText);
            } else {
              formData.append("document", blob, cleanTitle);
              formData.append("caption", captionText);
            }`;

code = code.replace(smallFileCaptionOld, smallFileCaptionNew);

// 8. MTProto caption
const mtprotoCaptionOld = 'const caption = `${botTranslations[lang].fileSentSuccess}\\n\\n📌 <b>${botTranslations[lang].title}:</b> ${title}\\n📦 <b>${botTranslations[lang].size}:</b> ${sizeMB.toFixed(1)} MB`;';
const mtprotoCaptionNew = 'const caption = botTranslations[lang].finalCaption.replace("{title}", title || "Media").replace("{size}", sizeMB.toFixed(1));';

code = code.replace(mtprotoCaptionOld, mtprotoCaptionNew);

fs.writeFileSync('telegram.ts', code);
console.log("Patched!");
