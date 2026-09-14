const fs = require('fs');
let code = fs.readFileSync('ytdlp.ts', 'utf8');

code = code.replace(/const binPath = path\.join\(process\.cwd\(\), "yt-dlp_linux"\);/, 'const binPath = path.join("/tmp", "yt-dlp_linux");');

fs.writeFileSync('ytdlp.ts', code);
