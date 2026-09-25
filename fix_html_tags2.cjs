const fs = require('fs');
let content = fs.readFileSync('telegram.ts', 'utf8');

const targetStr = `"**به جمع پریمیومها خوش اومدی**\nبهت **پریمیوم** " + gift[0].durationDays + " روزه **هدیه** داده M2\n**حالا دیگه **همهجوره کنارتم^_-"`;
const replacementStr = `"<b>به جمع پریمیومها خوش اومدی</b>\nبهت <b>پریمیوم</b> " + gift[0].durationDays + " روزه <b>هدیه</b> داده M2\n<b>حالا دیگه </b>همهجوره کنارتم^_-"`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync('telegram.ts', content);
  console.log("Patched HTML tags 2");
} else {
  console.log("Could not find the target string!");
}
