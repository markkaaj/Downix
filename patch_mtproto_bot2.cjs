const fs = require('fs');
let code = fs.readFileSync('telegram.ts', 'utf8');

const startIndex = code.indexOf(`async function getMTProtoClient(baseUrl: string, token: string) {`);
const endFuncStr = `// MTProto file sending helper`;
const endIndex = code.indexOf(endFuncStr);

if (startIndex !== -1 && endIndex !== -1) {
    const replacement = `async function getMTProtoClient(baseUrl: string, token: string) {
  if (mtprotoClient) {
    if (mtprotoClient.connected) {
      return mtprotoClient;
    }
    try {
      await mtprotoClient.connect();
      return mtprotoClient;
    } catch (e) {
      console.error("Error reconnecting MTProto client:", e);
      mtprotoClient = null;
    }
  }
  
  const apiId = process.env.TELEGRAM_API_ID ? parseInt(process.env.TELEGRAM_API_ID, 10) : 32151201;
  const apiHash = process.env.TELEGRAM_API_HASH || "3993838fa31ed8f0bc24c8fc109dfd5f";
  console.log(\`Initializing MTProto client as BOT with API_ID: \${apiId}...\`);
  
  try {
    const { TelegramClient } = await import("telegram");
    const { StringSession } = await import("telegram/sessions/index.js");
    const sessionFile = require("path").join(process.cwd(), "telegram_bot_session.txt");
    
    let sessionString = process.env.TELEGRAM_BOT_STRING_SESSION || "";
    if (!sessionString && fs.existsSync(sessionFile)) {
      sessionString = fs.readFileSync(sessionFile, "utf-8").trim();
    }
    
    const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, {
      connectionRetries: 5,
    });
    
    await client.start({
      botAuthToken: token,
    });
    
    const newSession = (client.session).save();
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
}

`;
    code = code.substring(0, startIndex) + replacement + code.substring(endIndex);
    fs.writeFileSync('telegram.ts', code, 'utf8');
    console.log("SUCCESS!");
} else {
    console.log("FAIL!");
}
