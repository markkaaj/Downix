const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Add gifts to activeTab
content = content.replace(
  "const [activeTab, setActiveTab] = useState<'home' | 'users' | 'settings'>('home');",
  "const [activeTab, setActiveTab] = useState<'home' | 'users' | 'gifts' | 'settings'>('home');"
);

content = content.replace(
  "settings: 'Settings',",
  "settings: 'Settings',\n    gifts: 'Gift Codes',"
);
content = content.replace(
  "settings: 'Настройки',",
  "settings: 'Настройки',\n    gifts: 'Подарочные коды',"
);
content = content.replace(
  "settings: 'تنظیمات',",
  "settings: 'تنظیمات',\n    gifts: 'کدهای هدیه',"
);

// We need to add the gifts tab UI. Let's find where settings starts.
const settingsStart = "{activeTab === 'settings' && (";
const giftsTabHTML = `
        {activeTab === 'gifts' && (
          <div className="md:col-span-12 flex flex-col gap-6 pb-24 text-right" dir={lang === 'fa' ? 'rtl' : 'ltr'}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Gift className="w-6 h-6 text-pink-500" />
                  {tabTranslations[lang].gifts}
                </h2>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5">
              <form onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target;
                const months = parseInt(form.durationMonths.value);
                const usages = parseInt(form.maxUsages.value);
                const res = await fetch('/api/gifts', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ durationMonths: months, maxUsages: usages })
                });
                const data = await res.json();
                if (data.success) {
                  alert("Gift Code created: " + data.id + "\\n\\nTelegram Link: https://t.me/" + telegramBotUsername + "?start=" + data.id);
                  loadGifts();
                }
              }} className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 w-full text-left" dir="ltr">
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Duration (Months)</label>
                  <input type="number" name="durationMonths" min="1" defaultValue="1" className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono text-slate-200" required />
                </div>
                <div className="flex-1 w-full text-left" dir="ltr">
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Max Usages</label>
                  <input type="number" name="maxUsages" min="1" defaultValue="1" className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono text-slate-200" required />
                </div>
                <button type="submit" className="w-full sm:w-auto px-6 py-3 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-xl transition-colors cursor-pointer">
                  Create Link
                </button>
              </form>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden shadow-lg mt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap" dir="ltr">
                  <thead>
                    <tr className="border-b border-slate-800/60 bg-slate-950/30">
                      <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Code</th>
                      <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Duration</th>
                      <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Usages</th>
                      <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                      <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {giftsList.map((gift) => (
                      <tr key={gift.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-5 py-4 text-sm font-mono text-pink-400 font-medium">https://t.me/{telegramBotUsername}?start={gift.id}</td>
                        <td className="px-5 py-4 text-sm font-mono text-slate-300">{gift.durationMonths} Mo</td>
                        <td className="px-5 py-4 text-sm font-mono text-slate-300">{gift.usedCount} / {gift.maxUsages}</td>
                        <td className="px-5 py-4 text-sm font-mono text-slate-500">{new Date(gift.createdAt).toLocaleDateString()}</td>
                        <td className="px-5 py-4 text-right">
                          <button onClick={async () => {
                            if(confirm('Are you sure you want to delete this gift code?')) {
                              await fetch('/api/gifts/' + gift.id, { method: 'DELETE' });
                              loadGifts();
                            }
                          }} className="text-red-400 hover:text-red-300 text-sm font-bold uppercase cursor-pointer">Delete</button>
                        </td>
                      </tr>
                    ))}
                    {giftsList.length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-5 py-8 text-center text-slate-500 text-sm">No gift codes found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
`;
content = content.replace(settingsStart, giftsTabHTML + '\n        ' + settingsStart);

// Add giftsList state
const stateInsert = "const [tasks, setTasks] = useState<Task[]>([]);";
content = content.replace(stateInsert, stateInsert + "\n  const [giftsList, setGiftsList] = useState<any[]>([]);\n  const [telegramBotUsername, setTelegramBotUsername] = useState<string>('your_bot');");

// Add loadGifts function
const effectInsert = "useEffect(() => {";
content = content.replace(effectInsert, `const loadGifts = async () => {
    try {
      const res = await fetch('/api/gifts');
      if (res.ok) {
        setGiftsList(await res.json());
      }
      const tgRes = await fetch('/api/telegram/status');
      if (tgRes.ok) {
        const tgData = await tgRes.json();
        if (tgData.username) setTelegramBotUsername(tgData.username);
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadGifts();
  }, []);\n\n  ` + effectInsert);


// Add gifts button to navbar
const usersButton = `        <button
          onClick={() => setActiveTab('users')}
          className={\`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer \${
            activeTab === 'users' 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 border border-indigo-500/50' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }\`}
        >
          <Users className="w-4 h-4" />
          <span>{tabTranslations[lang].users}</span>
        </button>`;
        
const giftsButton = `
        <button
          onClick={() => setActiveTab('gifts')}
          className={\`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer \${
            activeTab === 'gifts' 
              ? 'bg-pink-600 text-white shadow-lg shadow-pink-500/25 border border-pink-500/50' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }\`}
        >
          <Gift className="w-4 h-4" />
          <span>{tabTranslations[lang].gifts}</span>
        </button>`;
        
content = content.replace(usersButton, usersButton + giftsButton);

// We need to make sure Gift icon is imported
if (!content.includes('Gift,')) {
  content = content.replace('import { Download,', 'import { Download, Gift,');
}

fs.writeFileSync('src/App.tsx', content);
console.log('Fixed App.tsx gifts tab');
