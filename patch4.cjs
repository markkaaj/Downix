const fs = require('fs');
let code = fs.readFileSync('telegram.ts', 'utf8');

const regex = /if \(client\.setLogLevel\) client\.setLogLevel\("debug"\); await client\.start\(\{[\s\S]*?\} catch \(err\) \{/

const replacement = `if (client.setLogLevel) client.setLogLevel("debug");
    
    try {
      await client.start({
        phoneNumber: async () => process.env.TELEGRAM_PHONE || "+19429993274",
        phoneCode: async () => {
          console.log("MTProto login: requesting phone code");
          await sendTelegramMessage(baseUrl, 7421504833, "⚠️ **MTProto Login Required**\\nPlease send the 5-digit login code you just received from Telegram using the command:\\n\`/code 12345\`");
          return new Promise((resolve) => {
            pendingCodeResolve = (code) => {
              console.log("MTProto login: phone code received:", code);
              pendingCodeResolve = null;
              resolve(code);
            };
          });
        },
        password: async () => {
          console.log("MTProto login: requesting password");
          await sendTelegramMessage(baseUrl, 7421504833, "⚠️ **2FA Password Required**\\nPlease send your Two-Step Verification password using the command:\\n\`/pass your_password\`");
          return new Promise((resolve) => {
            pendingPasswordResolve = (pass) => {
              console.log("MTProto login: password received");
              pendingPasswordResolve = null;
              resolve(pass);
            };
          });
        },
        onError: (err) => {
          console.log("MTProto auth error:", err);
          sendTelegramMessage(baseUrl, 7421504833, \`❌ **MTProto Auth Error:**\\n\${err.message}\`).catch(() => {});
          return true;
        },
      });

      const newSession = (client.session).save();
      fs.writeFileSync(sessionFile, String(newSession || ""), "utf-8");
      console.log("MTProto session saved successfully.");
      await sendTelegramMessage(baseUrl, 7421504833, \`✅ **MTProto Logged In Successfully!**\\n\\nYour session string is (save this in Railway as \\\`TELEGRAM_STRING_SESSION\\\`):\\n\\n\\\`\${newSession}\\\`\`);

      mtprotoClient = client;
      console.log("MTProto client authenticated and connected successfully.");
      return mtprotoClient;
    } catch (startErr: any) {
      console.error("Failed to start MTProto client:", startErr);
      await sendTelegramMessage(baseUrl, 7421504833, \`❌ **MTProto Start Error:**\\n\${startErr.message}\`).catch(() => {});
      throw startErr;
    }
  } catch (err) {`;

code = code.replace(regex, replacement);
fs.writeFileSync('telegram.ts', code, 'utf8');
console.log("FIXED!");
