const yt = require('youtube-dl-exec');
try {
  yt('http://test', { 
      extractAudio: true, 
      audioFormat: 'wav', 
      audioQuality: '0',
      postprocessorArgs: ['-ar', '192000', '-c:a', 'pcm_s24le'] 
  }).then(console.log).catch(e => console.log(e.command));
} catch (e) { console.log(e); }
