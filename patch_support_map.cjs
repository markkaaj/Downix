const fs = require('fs');

let code = fs.readFileSync('telegram.ts', 'utf8');

const mapCode = `
const SUPPORT_MAP_FILE = path.join(process.env.NODE_ENV === 'production' ? '/tmp' : process.cwd(), "telegram_support_map.json");

function mapAdminMessageToUser(adminMessageId: number, userChatId: number) {
  try {
    let data: any = {};
    if (fs.existsSync(SUPPORT_MAP_FILE)) {
      data = JSON.parse(fs.readFileSync(SUPPORT_MAP_FILE, "utf-8"));
    }
    data[adminMessageId] = userChatId;
    fs.writeFileSync(SUPPORT_MAP_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {}
}

function getUserChatIdFromAdminMessage(adminMessageId: number): number | null {
  try {
    if (fs.existsSync(SUPPORT_MAP_FILE)) {
      const data = JSON.parse(fs.readFileSync(SUPPORT_MAP_FILE, "utf-8"));
      return data[adminMessageId] || null;
    }
  } catch (err) {}
  return null;
}
`;

code = code.replace(/const SUPPORT_STATE_FILE = [^\n]+;/, match => mapCode + '\n' + match);
fs.writeFileSync('telegram.ts', code);
