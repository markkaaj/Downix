const fs = require('fs');
let code = fs.readFileSync('ytdlp.ts', 'utf8');

code = code.replace(/path\.join\("\/tmp",/g, 'path.join(process.cwd(),');
code = code.replace(/\/tmp\/yt-dlp_linux/g, 'yt-dlp_linux');
code = code.replace(/\/tmp/g, 'process.cwd()');

fs.writeFileSync('ytdlp.ts', code);
