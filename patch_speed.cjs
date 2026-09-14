const fs = require('fs');

let code = fs.readFileSync('telegram.ts', 'utf8');

code = code.replace(/concurrentFragments: 8,/g, 'concurrentFragments: 100,');
code = code.replace(/workers: 16,/g, 'workers: 100,');

fs.writeFileSync('telegram.ts', code);
