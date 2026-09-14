const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

if (!content.includes("import { db }")) {
  content = `import { db } from './src/db/index.js';
import { giftCodes, usedGiftCodes } from './src/db/schema.js';
import { eq, desc } from 'drizzle-orm';
` + content;
  fs.writeFileSync('server.ts', content);
  console.log("Fixed server.ts imports");
}
