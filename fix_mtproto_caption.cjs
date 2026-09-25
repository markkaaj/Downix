const fs = require('fs');

let content = fs.readFileSync('telegram.ts', 'utf8');

const search = `const caption = botTranslations[lang].finalCaption.replace("{title}", title || "Media").replace("{size}", sizeMB.toFixed(1));`;
const replace = `let caption = botTranslations[lang].finalCaption.replace("{title}", title || "Media").replace("{size}", sizeMB.toFixed(1));
            if (directLink) {
              caption += "\\n\\n" + botTranslations[lang].directLink + "\\n" + directLink;
            }`;

content = content.replace(search, replace);
fs.writeFileSync('telegram.ts', content);
console.log('Fixed MTProto caption');
