const express = require('express');
const sharp = require('sharp');
async function test() {
  const fetchReq = await fetch('https://picsum.photos/200/300');
  const arrayBuffer = await fetchReq.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  try {
    const img = sharp(buffer);
    const outBuffer = await img.png().toBuffer();
    console.log("Success! PNG size:", outBuffer.length);
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
