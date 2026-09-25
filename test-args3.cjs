const yt = require('youtube-dl-exec');
try {
const p = yt.exec('http://test', { 
    extractAudio: true, 
    audioFormat: 'wav', 
    postprocessorArgs: 'ExtractAudio:-ar 192000 -c:a pcm_s24le' 
});
console.log(p.spawnargs);
p.kill();
} catch (e) {
  console.log(e.spawnargs);
}
