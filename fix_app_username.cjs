const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(
  'if (tgData.username) setTelegramBotUsername(tgData.username);',
  'if (tgData.botUsername) setTelegramBotUsername(tgData.botUsername);\n        else if (tgData.username) setTelegramBotUsername(tgData.username);'
);
fs.writeFileSync('src/App.tsx', app);
console.log('Fixed bot username in App.tsx');
