const yt = require('youtube-dl-exec');
console.log(yt.exec('http://test', { 
    extractAudio: true, 
    audioFormat: 'wav', 
    audioQuality: '0',
    postprocessorArgs: ['-ar', '192000', '-c:a', 'pcm_s24le'] 
}).command);
