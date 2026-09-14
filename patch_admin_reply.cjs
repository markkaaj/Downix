const fs = require('fs');

let code = fs.readFileSync('telegram.ts', 'utf8');

const adminReplyCode = `
    // Admin replying to user
    if (chatId === 7421504833 && update.message.reply_to_message) {
      const replyMsgId = update.message.reply_to_message.message_id;
      const targetChatId = getUserChatIdFromAdminMessage(replyMsgId);
      
      let finalTargetChatId = targetChatId;
      
      // Fallback
      if (!finalTargetChatId) {
        const replyText = update.message.reply_to_message.text || update.message.reply_to_message.caption || "";
        const match = replyText.match(/پیام پشتیبانی از (\\d+)/);
        if (match) {
          finalTargetChatId = parseInt(match[1]);
        }
      }
      
      if (finalTargetChatId) {
        if (update.message.text) {
          const sentToUser = await sendTelegramMessage(baseUrl, finalTargetChatId, \`👨‍💻 <b>پاسخ پشتیبانی:</b>\\n\\n\${update.message.text}\`);
          if (sentToUser && sentToUser.result) {
            setSupportState(finalTargetChatId, true, [sentToUser.result.message_id]);
          }
        } else {
          // If the admin sent a photo/video/sticker, we can copy it to the user
          try {
             const copyRes = await fetch(\`\${baseUrl}/copyMessage\`, {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({
                 chat_id: finalTargetChatId,
                 from_chat_id: chatId,
                 message_id: update.message.message_id,
                 caption: (update.message.caption || "") + "\\n\\n👨‍💻 <b>پاسخ پشتیبانی</b>"
               })
             });
             const copyData = await copyRes.json();
             if (copyData && copyData.ok && copyData.result) {
               setSupportState(finalTargetChatId, true, [copyData.result.message_id]);
             }
          } catch (err) {}
        }
        return;
      }
    }
`;

code = code.replace(/    \/\/ Admin replying to user[\s\S]*?    const supportState = getSupportState\(chatId\);/, adminReplyCode.trim() + '\n    \n    const supportState = getSupportState(chatId);');

fs.writeFileSync('telegram.ts', code);
