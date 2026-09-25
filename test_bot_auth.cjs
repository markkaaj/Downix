require('dotenv').config();
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions/index.js");

async function run() {
  const apiId = 32151201;
  const apiHash = "3993838fa31ed8f0bc24c8fc109dfd5f";
  const fs = require('fs');
  const token = fs.readFileSync('telegram_token.txt', 'utf8').trim();
  const client = new TelegramClient(new StringSession(""), apiId, apiHash, { connectionRetries: 1 });
  
  try {
    await client.start({
      botAuthToken: token
    });
    console.log("LOGGED IN AS BOT:", (await client.getMe()).username);
  } catch(e) {
    console.error(e);
  }
}
run();
