const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Remove Trash2 and HistoryIcon
code = code.replace(/, History as HistoryIcon, Trash2/g, '');

// 2. Remove History translations
const faRegex = /history: 'تاریخچه',\s+historyTitle: 'تاریخچه دانلودها',\s+historyDesc: 'لیست فایل‌هایی که قبلاً دانلود کرده‌اید\.',\s+noHistory: 'هیچ دانلودی در تاریخچه وجود ندارد\.',\s+clearHistory: 'پاک کردن تاریخچه',\s+downloadAgain: 'دانلود مجدد',\s+delete: 'حذف',\s+/g;
code = code.replace(faRegex, '');

const enRegex = /history: 'History',\s+historyTitle: 'Download History',\s+historyDesc: 'List of files you have downloaded previously\.',\s+noHistory: 'No downloads in history\.',\s+clearHistory: 'Clear History',\s+downloadAgain: 'Download Again',\s+delete: 'Delete',\s+/g;
code = code.replace(enRegex, '');

const ruRegex = /history: 'История',\s+historyTitle: 'История загрузок',\s+historyDesc: 'Список файлов, которые вы скачали ранее\.',\s+noHistory: 'В истории нет загрузок\.',\s+clearHistory: 'Очистить историю',\s+downloadAgain: 'Скачать снова',\s+delete: 'Удалить',\s+/g;
code = code.replace(ruRegex, '');

// 3. Remove HistoryItem interface and state
const historyInterfaceStateRegex = /interface HistoryItem {[\s\S]*?timestamp: number;\n}\n\nexport default function App\(\) {\n  const \[activeTab, setActiveTab\] = useState<'home' \| 'history' \| 'users' \| 'settings'>\('home'\);\n  const \[history, setHistory\] = useState<HistoryItem\[\]>\(\(\) => {\n    try {\n      const saved = localStorage\.getItem\('dl_flow_history'\);\n      return saved \? JSON\.parse\(saved\) : \[\];\n    } catch {\n      return \[\];\n    }\n  }\);\n/g;
code = code.replace(historyInterfaceStateRegex, `export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'users' | 'settings'>('home');\n`);

// 4. Remove storing history in task success
const storingHistoryRegex = /                const newHistoryItem: HistoryItem = {[\s\S]*?return updated;\n                }\);\n/g;
code = code.replace(storingHistoryRegex, '');

// 5. Remove History tab content
const historyTabContentRegex = /        {activeTab === 'history' && \([\s\S]*?<\/div>\n        \)}\n\n        {activeTab === 'users'/g;
code = code.replace(historyTabContentRegex, `        {activeTab === 'users'`);

// 6. Remove History bottom navigation button
const historyNavButtonRegex = /        <button\n          onClick={\(\) => setActiveTab\('history'\)}[\s\S]*?<span>\{tabTranslations\[lang\]\.history\}<\/span>\n        <\/button>\n\n        <button\n          onClick={\(\) => setActiveTab\('users'\)}/g;
code = code.replace(historyNavButtonRegex, `        <button\n          onClick={() => setActiveTab('users')}`);

fs.writeFileSync('src/App.tsx', code);
console.log('App.tsx patched');
