const formats = [
  { format_id: '1', height: 1080, width: 1920, vcodec: 'avc', acodec: 'none', tbr: 1000, fps: 30 },
  { format_id: '2', height: 1080, width: 1920, vcodec: 'avc', acodec: 'mp4a', tbr: 1200, fps: 30 },
  { format_id: '3', height: 1920, width: 1080, vcodec: 'avc', acodec: 'mp4a', tbr: 1200, fps: 30 },
  { format_id: '4', height: 27, width: 48, vcodec: 'mjpeg', acodec: 'none', tbr: 10, fps: 1 }, // thumbnail
  { format_id: '5', height: 480, width: 854, vcodec: 'avc', acodec: 'none', tbr: 500, fps: 30 },
];

const videoQualities = [];
const vFormats = formats.filter(f => 
  f.vcodec && f.vcodec !== 'none' && 
  !f.vcodec.includes('mjpeg') && 
  !f.vcodec.includes('images') && 
  f.height && typeof f.height === 'number'
);

const resMap = new Map();
for (const f of vFormats) {
  const width = f.width || 0;
  const height = f.height || 0;
  const resKey = `${width}x${height}`;
  
  const existing = resMap.get(resKey);
  const hasAudio = f.acodec && f.acodec !== 'none';
  
  if (!existing) {
    f.hasAudio = hasAudio;
    resMap.set(resKey, f);
  } else {
    const existingHasAudio = existing.hasAudio;
    if (hasAudio && !existingHasAudio) {
      f.hasAudio = hasAudio;
      resMap.set(resKey, f);
    } else if (hasAudio === existingHasAudio) {
       const tbr1 = f.tbr || 0;
       const tbr2 = existing.tbr || 0;
       if (tbr1 > tbr2) {
         f.hasAudio = hasAudio;
         resMap.set(resKey, f);
       }
    }
  }
}

const sortedFormats = Array.from(resMap.values()).sort((a, b) => {
  const pixelsA = (a.width || 0) * (a.height || 0);
  const pixelsB = (b.width || 0) * (b.height || 0);
  if (pixelsA !== pixelsB) return pixelsB - pixelsA;
  return (b.height || 0) - (a.height || 0);
});

for (const f of sortedFormats) {
  let label = "";
  if (f.width && f.height) {
    label = `${f.width}x${f.height}`;
  } else {
    label = `${f.height}p`;
  }
  if (f.fps && f.fps > 40) {
     label += ` (${f.fps}fps)`;
  }
  videoQualities.push({
     width: f.width,
     height: f.height,
     label: label,
     formatId: f.format_id,
     hasAudio: f.hasAudio
  });
}

console.log(JSON.stringify(videoQualities, null, 2));
