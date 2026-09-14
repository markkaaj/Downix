const ytdl = require('youtube-dl-exec');
const args = ytdl.exec('https://example.com', {
  format: 'best',
  postprocessorArgs: 'VideoConvertor:-s 15360x8640 -r 1000000 -pix_fmt rgb48le -b:v 10000G -c:v rawvideo'
});
console.log(args.spawnargs);
