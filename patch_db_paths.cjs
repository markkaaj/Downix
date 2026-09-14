const fs = require('fs');

let code = fs.readFileSync('telegram.ts', 'utf8');

const regex = /path\.join\(process\.env\.NODE_ENV === 'production' \? '\/tmp' : process\.cwd\(\),\s*("telegram_[^"]+\.json")\)/g;

code = code.replace(regex, 'path.join(process.cwd(), "data", $1)');

fs.writeFileSync('telegram.ts', code);
