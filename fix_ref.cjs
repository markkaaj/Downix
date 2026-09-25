const fs = require('fs');
let code = fs.readFileSync('telegram.ts', 'utf-8');
const search = `          let isNewUser = true;
          try {
            if (fs.existsSync(LANG_FILE)) {
              const langData = JSON.parse(fs.readFileSync(LANG_FILE, "utf-8"));
              if (langData[chatId]) {
                isNewUser = false;
              }
            }
          } catch (e) {}`;
const replace = `          let isNewUser = true;
          try {
            const userCheck = await db.select().from(users).where(eq(users.chatId, chatId)).limit(1);
            if (userCheck.length > 0) {
              isNewUser = false;
            }
          } catch (e) {}`;
code = code.replace(search, replace);
fs.writeFileSync('telegram.ts', code);
