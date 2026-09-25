const fs = require('fs');

let code = fs.readFileSync('telegram.ts', 'utf8');

const supportCode = `
const SUPPORT_STATE_FILE = path.join(process.env.NODE_ENV === 'production' ? '/tmp' : process.cwd(), "telegram_support.json");

function getSupportState(chatId: number): { active: boolean, messages: number[] } {
  try {
    if (fs.existsSync(SUPPORT_STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(SUPPORT_STATE_FILE, "utf-8"));
      return data[chatId] || { active: false, messages: [] };
    }
  } catch (err) {}
  return { active: false, messages: [] };
}

function setSupportState(chatId: number, active: boolean, newMessages: number[] = []) {
  try {
    let data: any = {};
    if (fs.existsSync(SUPPORT_STATE_FILE)) {
      data = JSON.parse(fs.readFileSync(SUPPORT_STATE_FILE, "utf-8"));
    }
    const currentState = data[chatId] || { active: false, messages: [] };
    
    if (!active) {
      delete data[chatId];
    } else {
      data[chatId] = { active: true, messages: [...currentState.messages, ...newMessages] };
    }
    fs.writeFileSync(SUPPORT_STATE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {}
}

async function setMessageReaction(baseUrl: string, chatId: number, messageId: number, emoji: string) {
  try {
    await fetch(\`\${baseUrl}/setMessageReaction\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        reaction: [{ type: "emoji", emoji: emoji }]
      })
    });
  } catch (err) {}
}
`;

// Insert after the other file helpers (like LANG_FILE or USAGE_FILE)
code = code.replace(/const USAGE_FILE = [^\n]+;/, match => match + '\n' + supportCode);

fs.writeFileSync('telegram.ts', code);
