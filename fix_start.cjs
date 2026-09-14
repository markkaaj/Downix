const fs = require('fs');
let content = fs.readFileSync('telegram.ts', 'utf8');

const search = `    // Process referral first if applicable
    if (text.startsWith("/start")) {
      const parts = text.split(" ");
      if (parts.length > 1 && parts[1].startsWith("ref_")) {
        const referrerId = parseInt(parts[1].replace("ref_", ""), 10);
        if (!isNaN(referrerId) && referrerId !== chatId) {
          // Check if this user was already invited or is a new user
          let isNewUser = true;
          try {
            const userCheck = await db.select().from(users).where(eq(users.chatId, chatId)).limit(1);
            if (userCheck.length > 0) {
              isNewUser = false;
            }
          } catch (e) {}
            
          if (isNewUser) {
            await addReferral(referrerId, chatId);
          }
        }
      }
    }`;

const replace = `    // Process referral or gift code
    if (text.startsWith("/start")) {
      const parts = text.split(" ");
      if (parts.length > 1) {
        const payload = parts[1];
        if (payload.startsWith("ref_")) {
          const referrerId = parseInt(payload.replace("ref_", ""), 10);
          if (!isNaN(referrerId) && referrerId !== chatId) {
            // Check if this user was already invited or is a new user
            let isNewUser = true;
            try {
              const userCheck = await db.select().from(users).where(eq(users.chatId, chatId)).limit(1);
              if (userCheck.length > 0) {
                isNewUser = false;
              }
            } catch (e) {}
              
            if (isNewUser) {
              await addReferral(referrerId, chatId);
            }
          }
        } else {
          // Gift code logic
          const giftCodeId = payload;
          try {
            const gift = await db.select().from(giftCodes).where(eq(giftCodes.id, giftCodeId)).limit(1);
            if (gift.length > 0) {
              if (gift[0].usedCount < gift[0].maxUsages) {
                 const hasUsed = await db.select().from(usedGiftCodes).where(and(eq(usedGiftCodes.codeId, giftCodeId), eq(usedGiftCodes.chatId, chatId))).limit(1);
                 if (hasUsed.length === 0) {
                   await db.update(giftCodes).set({ usedCount: gift[0].usedCount + 1 }).where(eq(giftCodes.id, giftCodeId));
                   await db.insert(usedGiftCodes).values({ codeId: giftCodeId, chatId });
                   
                   const currentSub = await db.select().from(subscriptions).where(eq(subscriptions.chatId, chatId)).limit(1);
                   let expiryToSet = Date.now() + (gift[0].durationDays * 24 * 60 * 60 * 1000);
                   if (currentSub.length > 0 && currentSub[0].expiry && currentSub[0].expiry > Date.now()) {
                     expiryToSet = currentSub[0].expiry + (gift[0].durationDays * 24 * 60 * 60 * 1000);
                   }
                   await db.insert(subscriptions).values({ chatId, isLifetime: false, expiry: expiryToSet }).onConflictDoUpdate({ target: subscriptions.chatId, set: { expiry: expiryToSet } });
                   
                   const lang = await getUserLang(chatId);
                   const msgs = {
                     en: "🎉 Your Premium subscription has been successfully activated!",
                     fa: "**به جمع پریمیومها خوش اومدی**\\nبهت **پریمیوم** " + gift[0].durationDays + " روزه **هدیه** داده M2\\n**حالا دیگه **همهجوره کنارتم^_-",
                     ru: "🎉 Ваша премиум подписка успешно активирована!"
                   };
                   await sendTelegramMessage(baseUrl, chatId, msgs[lang] || msgs.fa);
                 } else {
                   const lang = await getUserLang(chatId);
                   const msgs = {
                     en: "❌ You have already used this gift code.",
                     fa: "❌ شما قبلاً از این کد هدیه استفاده کرده‌اید.",
                     ru: "❌ Вы уже использовали этот подарочный код."
                   };
                   await sendTelegramMessage(baseUrl, chatId, msgs[lang] || msgs.fa);
                 }
              } else {
                 const lang = await getUserLang(chatId);
                 const msgs = {
                   en: "❌ This gift code has reached its maximum usage limit.",
                   fa: "❌ ظرفیت استفاده از این کد هدیه به پایان رسیده است.",
                   ru: "❌ Этот подарочный код достиг максимального лимита использований."
                 };
                 await sendTelegramMessage(baseUrl, chatId, msgs[lang] || msgs.fa);
              }
            }
          } catch(e) {
            console.error(e);
          }
        }
      }
    }`;

if (content.includes(search)) {
  content = content.replace(search, replace);
  fs.writeFileSync('telegram.ts', content);
  console.log("Patched start logic");
} else {
  console.log("Could not find start logic block");
}
