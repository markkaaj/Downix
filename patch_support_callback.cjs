const fs = require('fs');

let code = fs.readFileSync('telegram.ts', 'utf8');

const replacement = `
    if (data === "menu:support") {
      const lang = getUserLang(chatId);
      const backBtnText = lang === "fa" ? "‹ بازگشت" : lang === "ru" ? "‹ Назад" : "‹ Back";
      const keyboard: any = {
        inline_keyboard: [
          [
            { text: backBtnText, callback_data: "menu:close_support" }
          ]
        ]
      };
      
      setSupportState(chatId, true, []); // activate chat room
      
      await editTelegramMessage(baseUrl, chatId, messageId, botTranslations[lang].supportSection, keyboard);
      return;
    }

    if (data === "menu:close_support") {
      const state = getSupportState(chatId);
      if (state.active) {
        for (const msgId of state.messages) {
          try {
            await deleteTelegramMessage(baseUrl, chatId, msgId);
          } catch (err) {}
        }
        setSupportState(chatId, false);
      }
      
      // Go back to profile
      const lang = getUserLang(chatId);
      const isPremium = getUserSub(chatId);
      const usedDownloads = getDownloadStats(chatId);
      const remainingDownloads = Math.max(0, 5 - usedDownloads);
      
      let subText = "عادی";
      if (lang === "en") subText = isPremium ? "Premium" : \`Normal (Remaining Downloads: \${remainingDownloads}/5)\`;
      else if (lang === "ru") subText = isPremium ? "Премиум" : \`Обычная (Осталось загрузок: \${remainingDownloads}/5)\`;
      else subText = isPremium ? "پریمیوم" : \`عادی (شارژ دانلود: \${remainingDownloads}/5)\`;

      const profileText = botTranslations[lang as "fa" | "en" | "ru"].profileSection
        .replace("{chatId}", chatId.toString())
        .replace("{subscription}", subText);
      
      const buttons = {
        fa: { premium: "پریمیوم", referral: "رفرال", lang: "زبان", history: "تاریخچه", back: "‹ بازگشت" },
        en: { premium: "Premium", referral: "Referral", lang: "Language", history: "History", back: "‹ Back" },
        ru: { premium: "Премиум", referral: "Рефералы", lang: "Язык", history: "История", back: "‹ Назад" }
      };

      const btn = buttons[lang as "fa" | "en" | "ru"] || buttons.fa;

      const keyboard: any = {
        inline_keyboard: [
          [
            { text: btn.premium, callback_data: "menu:premium" },
            { text: btn.referral, callback_data: "menu:referral" }
          ],
          [
            { text: btn.history, callback_data: "menu:history" },
            { text: btn.lang, callback_data: "menu:change_lang" }
          ],
          [
            { text: btn.back, callback_data: "menu:start" }
          ]
        ]
      };
      
      await editTelegramMessage(baseUrl, chatId, messageId, profileText, keyboard);
      return;
    }
`;

// Replace from `if (data === "menu:support") {` to `return;\n    }` 
code = code.replace(/if \(data === "menu:support"\) \{[\s\S]*?botTranslations\[lang\]\.supportSection, keyboard\);\n      return;\n    \}/, replacement.trim());

fs.writeFileSync('telegram.ts', code);
