const fs = require('fs');
let code = fs.readFileSync('telegram.ts', 'utf8');

// 1. In analyzeAndSendOptions, add videoQualities generation
const analyzeRegex = /    const availableHeights = new Set<number>\(\);\n    if \(info\.formats\) \{\n      for \(const f of info\.formats\) \{\n        if \(f\.height\) availableHeights\.add\(f\.height\);\n      \}\n    \}\n    const heights = Array\.from\(availableHeights\);/;

const analyzeReplacement = `    const videoQualities: any[] = [];
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
        const resKey = \`\${width}x\${height}\`;
        
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
          label = \`\${f.width}x\${f.height}\`;
        } else {
          label = \`\${f.height}p\`;
        }
        if (f.fps && f.fps > 40) {
           label += \` (\${f.fps}fps)\`;
        }
        videoQualities.push({
           width: f.width,
           height: f.height,
           label: label,
           formatId: f.format_id,
           hasAudio: f.hasAudio
        });
      }
    }`;

code = code.replace(analyzeRegex, analyzeReplacement);

// Update cached object to store videoQualities instead of availableHeights
const urlCacheUpdateRegex = /      caption: finalCaption,\n      isImageOnly: info\.is_image_only,\n      availableHeights: heights\n    \}\);/;

const urlCacheUpdateReplacement = `      caption: finalCaption,\n      isImageOnly: info.is_image_only,\n      videoQualities: videoQualities\n    });`;

code = code.replace(urlCacheUpdateRegex, urlCacheUpdateReplacement);

// 2. In select_video menu generation
const selectVideoRegex = /      \/\/ Build video quality menu dynamically exactly from available heights[\s\S]*?\/\/ Group inline buttons by 2, except for best quality which spans full width/;

const selectVideoReplacement = `      // Build video quality menu exactly from available videoQualities
      const videoQualities = cached.videoQualities || [];
      const availableBtns = [];
      availableBtns.push({ text: botTranslations[lang].dlVideoBest || "Best Quality", callback_data: \`dl:video:best:\${urlId}\` });
      
      videoQualities.forEach((vq, index) => {
        availableBtns.push({ text: vq.label, callback_data: \`dl:video:\${index}:\${urlId}\` });
      });

      // Group inline buttons by 2, except for best quality which spans full width`;

code = code.replace(selectVideoRegex, selectVideoReplacement);

// 3. In startTelegramDownload
const startDownloadRegex = /    if \(formatId === "best"\) \{[\s\S]*?\} else if \(type === "audio"\)/;

const startDownloadReplacement = `    if (formatId === "best") {
      dlOptions.format = "bestvideo+bestaudio/best";
    } else {
      const index = parseInt(formatId);
      const cached = urlCache.get(urlId); // We need cached to read videoQualities
      // Wait, we don't have urlId here? No, startTelegramDownload takes url but not urlId!
      // But we can just use cached.videoQualities? No, urlCache is not directly passed.
      // Actually, we must pass videoQualities to startTelegramDownload or retrieve it.
      // Let's modify startTelegramDownload to take urlId instead of just url? No, it's easier to find urlId or pass videoQualities.`;

// Wait! startTelegramDownload doesn't have urlId!
console.log("WAIT, startTelegramDownload signature:");
