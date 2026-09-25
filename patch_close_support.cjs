const fs = require('fs');

let code = fs.readFileSync('telegram.ts', 'utf8');

const newCloseSupport = `
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
      
      // Go back to main menu
      const lang = getUserLang(chatId);
      const welcomeMessage = botTranslations[lang as "fa" | "en" | "ru"].welcome;
      const keyboard: any = {
        inline_keyboard: [
          [
            { text: botTranslations[lang as "fa" | "en" | "ru"].profile, callback_data: "menu:profile" },
            { text: botTranslations[lang as "fa" | "en" | "ru"].support, callback_data: "menu:support" }
          ]
        ]
      };
      
      await editTelegramMessage(baseUrl, chatId, messageId, welcomeMessage, keyboard);
      return;
    }
`;

code = code.replace(/    if \(data === "menu:close_support"\) \{[\s\S]*?await editTelegramMessage\(baseUrl, chatId, messageId, profileText, keyboard\);\n      return;\n    \}/, newCloseSupport.trim());

fs.writeFileSync('telegram.ts', code);
