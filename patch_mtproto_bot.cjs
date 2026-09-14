const fs = require('fs');
let code = fs.readFileSync('telegram.ts', 'utf8');

const regex = /async function getMTProtoClient\(baseUrl: string, token: string\) \{[\s\S]*?return mtprotoClient;\s*\} catch \(err\) \{[\s\S]*?throw err;\s*\}\s*\}/;

const replacement = `async function getMTProtoClient(baseUrl: string, token: string) {
  if (mtprotoClient && mtprotoClient.connected) {
    return mtprotoClient;
  }
  const apiId = process.env.TELEGRAM_API_ID ? parseInt(process.env.TELEGRAM_API_ID, 10) : 32151201;
  const apiHash = process.env.TELEGRAM_API_HASH || "3993838fa31ed8f0bc24c8fc109dfd5f";
  
  console.log(\`Initializing MTProto client as BOT with API_ID: \${apiId}...\`);
  
  try {
    const { TelegramClient } = await import("telegram");
    const { StringSession } = await import("telegram/sessions/index.js");
    const sessionFile = require("path").join(process.cwd(), "telegram_bot_session.txt");
    let sessionString = process.env.TELEGRAM_STRING_SESSION || "";
    if (!sessionString && fs.existsSync(sessionFile)) {
      sessionString = fs.readFileSync(sessionFile, "utf-8").trim();
    }
    const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, {
      connectionRetries: 5,
    });
    
    // Login as bot
    await client.start({
      botAuthToken: token,
    });
    
    const newSession = (client.session as any).save();
    if (newSession) {
      fs.writeFileSync(sessionFile, String(newSession), "utf-8");
    }
    
    mtprotoClient = client;
    console.log("MTProto client authenticated as BOT successfully.");
    return mtprotoClient;
  } catch (err) {
    console.error("Failed to initialize MTProto client:", err);
    throw err;
  }
}`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('telegram.ts', code, 'utf8');
    console.log("Replaced getMTProtoClient");
} else {
    console.log("Regex not found!");
}
