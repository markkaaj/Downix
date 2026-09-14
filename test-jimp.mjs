import { Jimp } from 'jimp';
async function test() {
  const fetchReq = await fetch('https://picsum.photos/200/300');
  const buffer = Buffer.from(await fetchReq.arrayBuffer());
  try {
    const img = await Jimp.read(buffer);
    const outBuffer = await img.getBuffer("image/bmp");
    console.log("Success! BMP size:", outBuffer.length);
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
