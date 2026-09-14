const fs = require('fs');

let code = fs.readFileSync('telegram.ts', 'utf8');

const supportInterceptor = `
  // Support Room Interception
  if (update.message && update.message.chat) {
    const chatId = update.message.chat.id;
    
    // Admin replying to user
    if (chatId === 7421504833 && update.message.reply_to_message && update.message.text) {
      const replyMsgId = update.message.reply_to_message.message_id;
      const targetChatId = getUserChatIdFromAdminMessage(replyMsgId);
      
      if (targetChatId) {
        const sentToUser = await sendTelegramMessage(baseUrl, targetChatId, \`👨‍💻 <b>پاسخ پشتیبانی:</b>\\n\\n\${update.message.text}\`);
        if (sentToUser && sentToUser.result) {
          setSupportState(targetChatId, true, [sentToUser.result.message_id]);
        }
        return;
      }
      
      // Fallback: check text for message ID mapping
      const replyText = update.message.reply_to_message.text || update.message.reply_to_message.caption || "";
      const match = replyText.match(/پیام پشتیبانی از (\\d+)/);
      if (match) {
        const fallbackTargetChatId = parseInt(match[1]);
        const sentToUser = await sendTelegramMessage(baseUrl, fallbackTargetChatId, \`👨‍💻 <b>پاسخ پشتیبانی:</b>\\n\\n\${update.message.text}\`);
        if (sentToUser && sentToUser.result) {
          setSupportState(fallbackTargetChatId, true, [sentToUser.result.message_id]);
        }
        return;
      }
    }
    
    const supportState = getSupportState(chatId);
    if (supportState.active) {
      const msgId = update.message.message_id;
      const adminChatId = 7421504833;
      
      try {
        const copyRes = await fetch(\`\${baseUrl}/copyMessage\`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: adminChatId,
            from_chat_id: chatId,
            message_id: msgId
          })
        });
        const copyData = await copyRes.json();
        
        if (copyData && copyData.ok && copyData.result) {
          const adminCopiedMsgId = copyData.result.message_id;
          mapAdminMessageToUser(adminCopiedMsgId, chatId);
        }
        
        await setMessageReaction(baseUrl, chatId, msgId, "👀");
        
        setSupportState(chatId, true, [msgId]);
      } catch (err) {}
      
      return; // Intercepted
    }
  }

  // 2. Text Message Update
`;

code = code.replace(/\/\/ Support Room Interception[\s\S]*?\/\/ 2\. Text Message Update/, supportInterceptor.trim() + '\n\n  // 2. Text Message Update');

fs.writeFileSync('telegram.ts', code);
