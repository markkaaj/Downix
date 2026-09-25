const fs = require('fs');
let code = fs.readFileSync('telegram.ts', 'utf8');

// replace path.join(process.env.NODE_ENV === 'production' ? '/tmp' : process.cwd(), ...)
code = code.replace(/path\.join\(process\.env\.NODE_ENV === 'production' \? '\/tmp' : process\.cwd\(\),\s*([^)]+)\)/g, 'path.join(process.cwd(), $1)');

fs.writeFileSync('telegram.ts', code);
