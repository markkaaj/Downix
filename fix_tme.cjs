const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

app = app.replace(
  'https://t.me/" + telegramBotUsername + "?start=" + data.id',
  'https://t.me/" + telegramBotUsername.replace("@", "") + "?start=" + data.id'
);

app = app.replace(
  'https://t.me/{telegramBotUsername}?start={gift.id}',
  'https://t.me/{telegramBotUsername.replace("@", "")}?start={gift.id}'
);

fs.writeFileSync('src/App.tsx', app);
console.log('Fixed t.me links');
