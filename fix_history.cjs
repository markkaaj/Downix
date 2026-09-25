const fs = require('fs');

let content = fs.readFileSync('telegram.ts', 'utf8');

// 1. Remove ⏳ from history empty text
content = content.replace(/"⏳ <b>تاریخچه/g, '"<b>تاریخچه');
content = content.replace(/"⏳ <b>Your/g, '"<b>Your');
content = content.replace(/"⏳ <b>История/g, '"<b>История');

// 2. Remove ⏳ from history list text
content = content.replace(/'fa' \? "⏳ <b>تاریخچه دانلودهای شما:<\/b>\\n\\n"/g, "'fa' ? \"<b>تاریخچه دانلودهای شما:</b>\\n\\n\"");
content = content.replace(/'en' \? "⏳ <b>Your Download History:<\/b>\\n\\n"/g, "'en' ? \"<b>Your Download History:</b>\\n\\n\"");
content = content.replace(/"⏳ <b>История загрузок:<\/b>\\n\\n"/g, "\"<b>История загрузок:</b>\\n\\n\"");

// 3. Remove text += `<b>${index + 1}.</b> <a href="${item.url}">${safeTitle}</a>\n`; and safeTitle logic
content = content.replace(/      const escapeHtml = \(str: string\) => str\.replace\(\/&\/g, '&amp;'\)\.replace\(\/<\/g, '&lt;'\)\.replace\(\/>\/g, '&gt;'\)\.replace\(\/"\/g, '&quot;'\);\n/g, '');
content = content.replace(/        let safeTitle = escapeHtml\(item\.title\);\n        if \(safeTitle\.length > 40\) safeTitle = safeTitle\.substring\(0, 40\) \+ '\.\.\.';\n        text \+= `<b>\$\{index \+ 1\}\.<\/b> <a href="\$\{item\.url\}">\$\{safeTitle\}<\/a>\\n`;\n/g, '');

// 4. Remove 🔗 from button text
content = content.replace(/`🔗 \$\{index \+ 1\}\. \$\{btnText\}`/g, '`${index + 1}. ${btnText}`');

// 5. Remove 🗑 from clear history text
content = content.replace(/fa: "🗑 پاک کردن تاریخچه"/g, 'fa: "پاک کردن تاریخچه"');
content = content.replace(/en: "🗑 Clear History"/g, 'en: "Clear History"');
content = content.replace(/ru: "🗑 Очистить историю"/g, 'ru: "Очистить историю"');

fs.writeFileSync('telegram.ts', content);
console.log('Fixed telegram.ts');
