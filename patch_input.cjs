const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(
  'name="durationDays" min="1" defaultValue="1"',
  'name="durationDays" min="1" max="365" defaultValue="30"'
);
fs.writeFileSync('src/App.tsx', app);
console.log("Patched input min/max");
