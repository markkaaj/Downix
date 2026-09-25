import sharp from 'sharp';
async function test() {
  const fetchReq = await fetch('https://picsum.photos/200/300');
  const buffer = Buffer.from(await fetchReq.arrayBuffer());
  try {
    const img = sharp(buffer);
    const outBuffer = await img.toFormat('bmp').toBuffer();
    console.log("Success! BMP size:", outBuffer.length);
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
