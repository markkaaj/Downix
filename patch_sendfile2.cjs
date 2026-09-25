const fs = require('fs');
let code = fs.readFileSync('telegram.ts', 'utf8');

const oldSendFile = `    let peer;
    try {
      const { Api } = await import("telegram");
      peer = new Api.InputPeerUser({ user_id: BigInt(chatId), access_hash: BigInt(0) });
    } catch (e) {
      peer = chatId.toString();
    }`;

const newSendFile = `    let peer;
    try {
      const { Api } = await import("telegram");
      peer = new Api.InputPeerUser({ userId: BigInt(chatId), accessHash: BigInt(0) });
    } catch (e) {
      peer = chatId.toString();
    }`;

code = code.replace(oldSendFile, newSendFile);
fs.writeFileSync('telegram.ts', code, 'utf8');
console.log("Patched sendFile again");
