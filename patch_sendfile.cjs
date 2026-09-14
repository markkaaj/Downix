const fs = require('fs');
let code = fs.readFileSync('telegram.ts', 'utf8');

const oldSendFile = `    await client.sendFile(chatId.toString(), {
      file: tempFilePath,
      caption: caption,`;
const newSendFile = `    let peer;
    try {
      const { Api } = await import("telegram");
      peer = new Api.InputPeerUser({ user_id: BigInt(chatId), access_hash: BigInt(0) });
    } catch (e) {
      peer = chatId.toString();
    }
    await client.sendFile(peer, {
      file: tempFilePath,
      caption: caption,`;

code = code.replace(oldSendFile, newSendFile);
fs.writeFileSync('telegram.ts', code, 'utf8');
console.log("Patched sendFile");
