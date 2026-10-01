const fs = require('fs');
const https = require('https');
const path = require('path');

const p = path.join(process.cwd(), 'yt-dlp_linux');

if (!fs.existsSync(p) || fs.statSync(p).size < 30000000) {
  console.log('Downloading yt-dlp_linux for build...');
  const file = fs.createWriteStream(p);
  const req = (url) => {
    https.get(url, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        req(res.headers.location);
        return;
      }
      if (res.statusCode !== 200) {
        console.error(`Failed to download yt-dlp: Status ${res.statusCode}`);
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        try {
          fs.chmodSync(p, '755');
          console.log('yt-dlp downloaded and chmodded successfully.');
        } catch (e) {
          console.error('Error setting chmod:', e);
        }
      });
    }).on('error', err => {
      console.error('Download error:', err);
    });
  };
  req('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux');
} else {
  console.log('yt-dlp_linux already exists.');
}
