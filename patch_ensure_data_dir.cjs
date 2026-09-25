const fs = require('fs');

let code = fs.readFileSync('telegram.ts', 'utf8');

const ensureDirCode = `
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
`;

// Insert it right after imports
code = code.replace(/import [^\n]+;\n\n/, match => match + ensureDirCode + '\n');

fs.writeFileSync('telegram.ts', code);
