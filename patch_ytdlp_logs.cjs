const fs = require('fs');
let code = fs.readFileSync('ytdlp.ts', 'utf8');

code = code.replace(/process\.cwd\(\)/g, '"/tmp"');
// wait, if I replace process.cwd() with "/tmp" globally, localBinPath will also change, which might be wrong!
// localBinPath should be process.cwd()!
fs.writeFileSync('ytdlp.ts', code);
