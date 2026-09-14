const fs = require('fs');

let content = fs.readFileSync('telegram.ts', 'utf8');

const search = /const captionText = botTranslations\[lang\].finalCaption\s*\.replace\("\{title\}", title \|\| "Media"\)\s*\.replace\("\{size\}", sizeMB\.toFixed\(1\)\);/;
const replace = `let captionText = botTranslations[lang].finalCaption
                  .replace("{title}", title || "Media")
                  .replace("{size}", sizeMB.toFixed(1));
                  
if (directLink) {
  captionText += "\\n\\n" + botTranslations[lang].directLink + "\\n" + directLink;
}`;

content = content.replace(search, replace);
fs.writeFileSync('telegram.ts', content);
console.log('Fixed direct link');
