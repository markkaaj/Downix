const { Api } = require("telegram");
const peer = new Api.InputPeerUser({ user_id: 123456n, access_hash: 0n });
console.log(peer);
