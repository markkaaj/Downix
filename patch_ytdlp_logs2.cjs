const fs = require('fs');
let code = fs.readFileSync('ytdlp.ts', 'utf8');

code = code.replace(/Valid yt-dlp_linux found in process\.cwd\(\)/g, "Valid yt-dlp_linux found in /tmp");
code = code.replace(/already in process\.cwd\(\) and of valid/g, "already in /tmp and of valid");
code = code.replace(/from workspace root to process\.cwd\(\)/g, "from workspace root to /tmp");
code = code.replace(/Downloading from GitHub to process\.cwd\(\)/g, "Downloading from GitHub to /tmp");

fs.writeFileSync('ytdlp.ts', code);
