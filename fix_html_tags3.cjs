const fs = require('fs');
let content = fs.readFileSync('telegram.ts', 'utf8');

// Replace ** with <b> and </b>
// But easier to just do it via replace manually on the exact substring parts.
content = content.replace(/\*\*به جمع پریمیومها خوش اومدی\*\*/g, '<b>به جمع پریمیومها خوش اومدی</b>');
content = content.replace(/بهت \*\*پریمیوم\*\*/g, 'بهت <b>پریمیوم</b>');
content = content.replace(/\*\*هدیه\*\*/g, '<b>هدیه</b>');
content = content.replace(/\*\*حالا دیگه \*\*/g, '<b>حالا دیگه </b>');

fs.writeFileSync('telegram.ts', content);
console.log("Replaced asterisks with HTML tags.");
