const fs = require('fs');

// 1. Patch schema.ts
let schema = fs.readFileSync('src/db/schema.ts', 'utf8');
schema = schema.replace("durationMonths: integer('duration_months')", "durationDays: integer('duration_days')");
fs.writeFileSync('src/db/schema.ts', schema);

// 2. Patch server.ts
let server = fs.readFileSync('server.ts', 'utf8');
server = server.replace(/durationMonths/g, 'durationDays');
fs.writeFileSync('server.ts', server);

// 3. Patch telegram.ts
let telegram = fs.readFileSync('telegram.ts', 'utf8');
telegram = telegram.replace(/durationMonths \* 30/g, 'durationDays');
fs.writeFileSync('telegram.ts', telegram);

// 4. Patch App.tsx
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(/Duration \(Months\)/g, 'Duration (Days)');
app = app.replace(/name="durationMonths"/g, 'name="durationDays"');
app = app.replace(/durationMonths:/g, 'durationDays:');
app = app.replace(/durationMonths/g, 'durationDays');
app = app.replace(/\{gift\.durationDays\} Mo/g, '{gift.durationDays} Days');
fs.writeFileSync('src/App.tsx', app);

console.log("Patched all files");
