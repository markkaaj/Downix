import 'dotenv/config';
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";

async function run() {
  const apiId = 32151201;
  const apiHash = "3993838fa31ed8f0bc24c8fc109dfd5f";
  const client = new TelegramClient(new StringSession(""), apiId, apiHash, { connectionRetries: 1 });
  client.setLogLevel("debug");
  try {
    await client.start({
      phoneNumber: async () => "+19429993274",
      phoneCode: async () => {
        console.log("SENDING CODE");
        return "11111"; // fake code
      },
      onError: err => { console.log("ON_ERROR:", err.message); return true; }
    });
    console.log("DONE");
  } catch (e) {
    console.log("CAUGHT EXCEPTION:", e.message);
  }
}
run().then(() => process.exit(0)).catch(() => process.exit(1));
