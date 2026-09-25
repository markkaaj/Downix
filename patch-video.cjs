const fs = require('fs');
let code = fs.readFileSync('telegram.ts', 'utf8');

// 1. Replace menu:select_video dynamically building
const selectVideoRegex = /if \(data\.startsWith\("menu:select_video:"\)\) \{[\s\S]*?\/\/ Group inline buttons by 2, except for best quality which spans full width/;

const selectVideoReplacement = `if (data.startsWith("menu:select_video:")) {
      const urlId = data.split(":")[2];
      const cached = urlCache.get(urlId);
      const lang = getUserLang(chatId);
      if (!cached) {
        await sendTelegramMessage(baseUrl, chatId, botTranslations[lang].expiredSession);
        return;
      }

      // Build video quality menu dynamically exactly from available heights
      let heights = cached.availableHeights || [];
      heights = Array.from(new Set(heights)).filter(h => typeof h === "number" && h > 0).sort((a, b) => b - a);

      const availableBtns = [];
      availableBtns.push({ text: botTranslations[lang].dlVideoBest || "Best Quality", callback_data: \`dl:video:best:\${urlId}\` });
      
      for (const h of heights) {
        let label = \`\${h}p\`;
        if (h === 2160) label = "2160p (4K)";
        if (h === 1440) label = "1440p (2K)";
        if (h === 4320) label = "4320p (8K)";
        availableBtns.push({ text: label, callback_data: \`dl:video:\${h}:\${urlId}\` });
      }

      // Group inline buttons by 2, except for best quality which spans full width`;

code = code.replace(selectVideoRegex, selectVideoReplacement);

// 2. Replace yt-dlp dlOptions.format logic in startTelegramDownload
const formatRegex = /if \(type === "video"\) \{[\s\S]*?dlOptions\.format = "bestvideo\+bestaudio\/best";\n    \}\n  \} else if \(type === "audio"\)/;

const formatReplacement = `if (type === "video") {
    dlOptions.recodeVideo = "mp4";
    dlOptions.mergeOutputFormat = "mp4";
    if (formatId === "best") {
      dlOptions.format = "bestvideo+bestaudio/best";
    } else {
      const h = parseInt(formatId);
      if (!isNaN(h)) {
        dlOptions.format = \`bestvideo[height=\${h}]+bestaudio/best[height=\${h}]/bestvideo[height<=\${h}]+bestaudio/best\`;
      } else {
        dlOptions.format = "bestvideo+bestaudio/best";
      }
    }
  } else if (type === "audio")`;

code = code.replace(formatRegex, formatReplacement);

fs.writeFileSync('telegram.ts', code);
console.log('Video quality logic patched');
