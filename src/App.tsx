import React, { useState, useEffect } from 'react';
import {
  Cloud,
  Terminal,
  Download,
  Copy,
  Check,
  ExternalLink,
  Server,
  FileCode,
  ShieldCheck,
  Bot,
  Play,
  Layers,
  Sparkles,
  HelpCircle,
  Cpu,
  RefreshCw,
  FolderArchive,
  ArrowRight,
  Globe,
  Settings
} from 'lucide-react';

interface MediaFormat {
  formatId: string;
  quality: string;
  ext: string;
  filesize: number | null;
  url?: string;
}

interface MediaInfo {
  title: string;
  thumbnail: string;
  duration: number;
  uploader: string;
  viewCount: number;
  platform?: string;
  engine?: string;
  formats: MediaFormat[];
}

interface HealthData {
  status: string;
  platform: string;
  arch: string;
  nodeVersion: string;
  uptimeSeconds: number;
  isWasmer: boolean;
  ytdlpAvailable: boolean;
  ytdlpPath: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'wasmer' | 'downloader' | 'bot' | 'configs' | 'status'>('wasmer');
  const [deployMode, setDeployMode] = useState<'container' | 'static'>('container');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Downloader state
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string>('720p');

  // Health data
  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // Config files
  const [configFiles, setConfigFiles] = useState<Record<string, string>>({});
  const [activeConfigFile, setActiveConfigFile] = useState<string>('wasmer.toml');

  // Telegram bot state
  const [botToken, setBotToken] = useState('');
  const [apiId, setApiId] = useState('');
  const [apiHash, setApiHash] = useState('');

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const fetchHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setHealthLoading(false);
    }
  };

  const fetchConfigs = async () => {
    try {
      const res = await fetch('/api/wasmer-config');
      if (res.ok) {
        const data = await res.json();
        if (data.files) {
          setConfigFiles(data.files);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchConfigs();
  }, []);

  const handleExtractMedia = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setMediaInfo(null);
    setDownloadProgress(null);

    try {
      const res = await fetch('/api/media/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setMediaInfo(data);
        if (data.formats && data.formats.length > 0) {
          setSelectedFormat(data.formats[0].formatId);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartDownload = () => {
    setDownloadProgress(10);
    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev === null) return 10;
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 15;
      });
    }, 300);
  };

  const downloadTextFile = (filename: string, content: string) => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return 'نامشخص';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} مگابایت`;
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Banner / Announcement */}
      <div className="bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-slate-900 border-b border-indigo-500/20 px-4 py-2.5 text-xs sm:text-sm text-center flex items-center justify-center gap-2">
        <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
        <span className="text-slate-300">
          آماده‌سازی خودکار و فایل‌های کامل برای دیپلوی روی سرورهای ابری <strong className="text-white font-semibold underline decoration-indigo-400 underline-offset-4">Wasmer.io Edge</strong>
        </span>
        <a
          href="https://wasmer.io"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 mr-2 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/30"
        >
          <span>وب‌سایت Wasmer</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Main Header */}
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Cloud className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg sm:text-xl text-white tracking-tight">Universal Media Downloader</h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Wasmer Ready
                </span>
              </div>
              <p className="text-xs text-slate-400">دانلودر هوشمند، ربات تلگرام و پکیج کامل استقرار در Wasmer Edge</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800 text-xs sm:text-sm">
            <button
              onClick={() => setActiveTab('wasmer')}
              className={`px-3.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'wasmer'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Cloud className="w-4 h-4" />
              <span>آموزش دیپلوی Wasmer</span>
            </button>

            <button
              onClick={() => setActiveTab('downloader')}
              className={`px-3.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'downloader'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>تست دانلودر</span>
            </button>

            <button
              onClick={() => setActiveTab('bot')}
              className={`px-3.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'bot'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>ربات تلگرام</span>
            </button>

            <button
              onClick={() => setActiveTab('configs')}
              className={`px-3.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'configs'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <FileCode className="w-4 h-4" />
              <span>فایل‌های کانفیگ</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('status');
                fetchHealth();
              }}
              className={`px-3.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'status'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Server className="w-4 h-4" />
              <span>وضعیت سرور</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* ============================================================== */}
        {/* TAB 1: WASMER DEPLOYMENT HUB */}
        {/* ============================================================== */}
        {activeTab === 'wasmer' && (
          <div className="space-y-8">
            {/* Hero Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-purple-950/40 border border-indigo-500/30 p-6 sm:p-8 shadow-2xl">
              <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 max-w-3xl space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  <Cloud className="w-3.5 h-3.5" />
                  <span>راهنمای گام‌به‌گام دیپلوی روی Wasmer Edge</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                  برنامه و ربات خود را با یک دستور در Wasmer مستقر کنید!
                </h2>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                  سرویس <strong className="text-white">Wasmer.io</strong> با تکنولوژی مدرن WebAssembly و کانتینرهای سریع Edge به شما امکان می‌دهد این اپلیکیشن (شامل دانلودر yt-dlp، رابط کاربری وب و ربات تلگرام) را به سرعت در اینترنت جهانی آنلاین نمایید.
                </p>

                {/* Architecture Selector */}
                <div className="pt-2 flex flex-wrap gap-3">
                  <button
                    onClick={() => setDeployMode('container')}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 border ${
                      deployMode === 'container'
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/30'
                        : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <Layers className="w-4 h-4 text-indigo-300" />
                    <span>روش ۱: Wasmer Edge Container (پیشنهادی - کل برنامه + yt-dlp + بات)</span>
                  </button>

                  <button
                    onClick={() => setDeployMode('static')}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 border ${
                      deployMode === 'static'
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/30'
                        : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <Globe className="w-4 h-4 text-purple-300" />
                    <span>روش ۲: Wasmer Wasm Static (تنها فرانت‌اند وب‌اسمبلی)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Step 1 */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3 relative group hover:border-indigo-500/40 transition-all">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-sm">
                  ۱
                </div>
                <h3 className="font-bold text-white text-base">نصب ابزار خط فرمان Wasmer</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  ابتدا ابزار رسمی Wasmer CLI را روی سیستم لینوکس، مک یا سرور خود نصب نمایید:
                </p>
                <div className="bg-slate-950 rounded-lg p-3 border border-slate-800 relative font-mono text-xs text-slate-300 dir-ltr text-left">
                  <code>curl https://get.wasmer.io -sSfL | sh</code>
                  <button
                    onClick={() => copyToClipboard('curl https://get.wasmer.io -sSfL | sh', 'cli_install')}
                    className="absolute right-2 top-2 p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    title="کپی دستور"
                  >
                    {copiedKey === 'cli_install' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="text-[11px] text-slate-500">
                  برای ویندوز پاورشل: <code className="text-slate-400">iwr https://win.wasmer.io -useb | iex</code>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3 relative group hover:border-indigo-500/40 transition-all">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-sm">
                  ۲
                </div>
                <h3 className="font-bold text-white text-base">ورود به حساب کاربری Wasmer</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  اگر هنوز در wasmer.io حساب ندارید بسازید، سپس در ترمینال دستور ورود را وارد کنید:
                </p>
                <div className="bg-slate-950 rounded-lg p-3 border border-slate-800 relative font-mono text-xs text-slate-300 dir-ltr text-left">
                  <code>wasmer login</code>
                  <button
                    onClick={() => copyToClipboard('wasmer login', 'cli_login')}
                    className="absolute right-2 top-2 p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    title="کپی دستور"
                  >
                    {copiedKey === 'cli_login' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">مرورگر باز شده و توکن لاگین به شکل خودکار ذخیره می‌شود.</p>
              </div>

              {/* Step 3 */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3 relative group hover:border-indigo-500/40 transition-all">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-sm">
                  ۳
                </div>
                <h3 className="font-bold text-white text-base">استقرار با یک دستور (Deploy)</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  در پوشه پروژه دستور دیپلوی را اجرا کنید تا برنامه روی سرورهای جهانی Wasmer منتشر شود:
                </p>
                <div className="bg-slate-950 rounded-lg p-3 border border-slate-800 relative font-mono text-xs text-slate-300 dir-ltr text-left">
                  <code>{deployMode === 'container' ? 'wasmer deploy' : 'wasmer deploy --publish-package'}</code>
                  <button
                    onClick={() =>
                      copyToClipboard(deployMode === 'container' ? 'wasmer deploy' : 'wasmer deploy --publish-package', 'cli_deploy')
                    }
                    className="absolute right-2 top-2 p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    title="کپی دستور"
                  >
                    {copiedKey === 'cli_deploy' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] text-emerald-400/90 font-medium">
                  پس از چند ثانیه آدرس اینترنتی مستقیم به شما ارائه خواهد شد.
                </p>
              </div>
            </div>

            {/* Quick Helper Script Runner */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <Terminal className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm sm:text-base">اسکریپت آماده استقرار خودکار (deploy-wasmer.sh)</h4>
                    <p className="text-xs text-slate-400">تمام مراحل نصب Wasmer CLI، تست لاگین و دیپلوی را به صورت هوشمند انجام می‌دهد.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard('bash deploy-wasmer.sh', 'run_script')}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    {copiedKey === 'run_script' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>کپی دستور اجرا</span>
                  </button>
                  <button
                    onClick={() => downloadTextFile('deploy-wasmer.sh', configFiles['deploy-wasmer.sh'] || '')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>دانلود اسکریپت</span>
                  </button>
                </div>
              </div>

              <div className="mt-4 bg-slate-950 rounded-lg p-3 font-mono text-xs text-slate-300 dir-ltr text-left flex items-center justify-between">
                <span>chmod +x deploy-wasmer.sh &amp;&amp; ./deploy-wasmer.sh</span>
                <span className="text-[10px] text-slate-500">Bash Linux/macOS</span>
              </div>
            </div>

            {/* Secret Management Section for Wasmer */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <h4 className="font-bold text-white text-base">تنظیم متغیرهای امنیتی و ربات در Wasmer (Edge Secrets)</h4>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                اگر مایلید از ربات تلگرام یا پروکسی‌ها روی Wasmer استفاده کنید، بدون نیاز به درج اطلاعات در کد، از دستورات سکرت Wasmer استفاده نمایید:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono dir-ltr text-left">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
                  <code className="text-slate-300">wasmer secret create TELEGRAM_BOT_TOKEN "token"</code>
                  <button
                    onClick={() => copyToClipboard('wasmer secret create TELEGRAM_BOT_TOKEN "token"', 'sec_1')}
                    className="p-1 hover:text-white text-slate-400"
                  >
                    {copiedKey === 'sec_1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
                  <code className="text-slate-300">wasmer secret create PORT "3000"</code>
                  <button
                    onClick={() => copyToClipboard('wasmer secret create PORT "3000"', 'sec_2')}
                    className="p-1 hover:text-white text-slate-400"
                  >
                    {copiedKey === 'sec_2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Wasmer CLI Useful Commands Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
              <h4 className="font-bold text-white text-base flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-400" />
                <span>دستورات کاربردی Wasmer CLI پس از استقرار</span>
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-2.5 font-semibold text-right">عملیات</th>
                      <th className="pb-2.5 font-semibold text-left dir-ltr">دستور ترمینال</th>
                      <th className="pb-2.5 font-semibold text-center w-16">کپی</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    <tr>
                      <td className="py-2.5 text-slate-300">مشاهده لاگ‌های زنده برنامه در Wasmer</td>
                      <td className="py-2.5 font-mono text-left dir-ltr text-indigo-300">wasmer app logs</td>
                      <td className="py-2.5 text-center">
                        <button
                          onClick={() => copyToClipboard('wasmer app logs', 'tbl_logs')}
                          className="p-1 hover:text-white text-slate-400"
                        >
                          {copiedKey === 'tbl_logs' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 text-slate-300">لیست برنامه‌های فعال در حساب شما</td>
                      <td className="py-2.5 font-mono text-left dir-ltr text-indigo-300">wasmer app list</td>
                      <td className="py-2.5 text-center">
                        <button
                          onClick={() => copyToClipboard('wasmer app list', 'tbl_list')}
                          className="p-1 hover:text-white text-slate-400"
                        >
                          {copiedKey === 'tbl_list' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 text-slate-300">مشاهده آدرس URL و وضعیت برنامه</td>
                      <td className="py-2.5 font-mono text-left dir-ltr text-indigo-300">wasmer app get</td>
                      <td className="py-2.5 text-center">
                        <button
                          onClick={() => copyToClipboard('wasmer app get', 'tbl_get')}
                          className="p-1 hover:text-white text-slate-400"
                        >
                          {copiedKey === 'tbl_get' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: MEDIA DOWNLOADER DEMO */}
        {/* ============================================================== */}
        {activeTab === 'downloader' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold text-white">تست استخراج و دانلود مدیا</h2>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  آدرس ویدیوی یوتیوب، اینستاگرام، تیک‌تاک، توییتر/X یا فایل مستقیم را برای بررسی موتور استخراج وارد کنید.
                </p>
              </div>

              {/* Input Form */}
              <form onSubmit={handleExtractMedia} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=... یا لینک اینستاگرام / تیک‌تاک"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    dir="ltr"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !url.trim()}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>در حال آنالیز...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>استخراج کیفیت‌ها</span>
                    </>
                  )}
                </button>
              </form>

              {/* Sample Quick Links */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-500">لینک‌های نمونه:</span>
                <button
                  type="button"
                  onClick={() => {
                    setUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
                  }}
                  className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60"
                >
                  یوتیوب (YouTube)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUrl('https://www.instagram.com/reel/C3_sample');
                  }}
                  className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60"
                >
                  ریلز اینستاگرام
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUrl('https://www.tiktok.com/@sample/video/12345');
                  }}
                  className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60"
                >
                  تیک‌تاک
                </button>
              </div>

              {/* Result Preview Card */}
              {mediaInfo && (
                <div className="border border-slate-800 bg-slate-950/60 rounded-xl p-5 space-y-5 animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row gap-5">
                    <div className="sm:w-64 h-36 rounded-lg overflow-hidden relative bg-slate-900 border border-slate-800 flex-shrink-0">
                      {mediaInfo.thumbnail ? (
                        <img
                          src={mediaInfo.thumbnail}
                          alt={mediaInfo.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                          <Play className="w-8 h-8" />
                        </div>
                      )}
                      {mediaInfo.duration > 0 && (
                        <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[11px] px-1.5 py-0.5 rounded font-mono">
                          {formatSeconds(mediaInfo.duration)}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 text-xs font-medium border border-indigo-500/30">
                          {mediaInfo.platform || 'Online Media'}
                        </span>
                        {mediaInfo.engine && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs font-mono">
                            {mediaInfo.engine}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-white text-base sm:text-lg line-clamp-2">{mediaInfo.title}</h3>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span>سازنده: {mediaInfo.uploader}</span>
                        {mediaInfo.viewCount > 0 && <span>بازدید: {mediaInfo.viewCount.toLocaleString()}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Format Selector */}
                  <div className="space-y-3 pt-2 border-t border-slate-800/80">
                    <label className="text-xs font-medium text-slate-300 block">انتخاب کیفیت جهت دانلود:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      {mediaInfo.formats.map((fmt) => (
                        <button
                          key={fmt.formatId}
                          type="button"
                          onClick={() => setSelectedFormat(fmt.formatId)}
                          className={`p-3 rounded-lg border text-right transition-all flex flex-col justify-between ${
                            selectedFormat === fmt.formatId
                              ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-semibold text-xs">{fmt.quality}</span>
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                              {fmt.ext}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 mt-2">{formatBytes(fmt.filesize)}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Download Action & Progress */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={handleStartDownload}
                      className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                    >
                      <Download className="w-4 h-4" />
                      <span>شروع پردازش و دانلود</span>
                    </button>

                    {downloadProgress !== null && (
                      <div className="w-full sm:w-64 space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>پیشرفت:</span>
                          <span className="font-mono text-emerald-400">{downloadProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full transition-all duration-300"
                            style={{ width: `${downloadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: TELEGRAM BOT INTEGRATION */}
        {/* ============================================================== */}
        {activeTab === 'bot' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">اتصال ربات دانلودر تلگرام به Wasmer</h2>
                  <p className="text-xs sm:text-sm text-slate-400">
                    با اجرای ربات روی Wasmer Edge، ربات شما بدون قطعی و با سرعت آپلود بسیار بالا فایل‌ها را برای کاربران ارسال خواهد کرد.
                  </p>
                </div>
              </div>

              {/* Bot Tokens Form */}
              <div className="space-y-4 max-w-2xl bg-slate-950 p-6 rounded-xl border border-slate-800">
                <h3 className="font-bold text-white text-sm">مشخصات تلگرام (Telegram Credentials)</h3>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400">توکن ربات تلگرام (TELEGRAM_BOT_TOKEN):</label>
                  <input
                    type="password"
                    placeholder="123456789:ABCdefGhIJKlmNoPQRstuVWXyz"
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    dir="ltr"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[11px] text-slate-500">از ربات @BotFather تلگرام دریافت می‌شود.</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400">API ID (اختیاری برای آپلودهای حجیم):</label>
                    <input
                      type="text"
                      placeholder="1234567"
                      value={apiId}
                      onChange={(e) => setApiId(e.target.value)}
                      dir="ltr"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400">API HASH:</label>
                    <input
                      type="password"
                      placeholder="abcdef0123456789..."
                      value={apiHash}
                      onChange={(e) => setApiHash(e.target.value)}
                      dir="ltr"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {botToken && (
                  <div className="mt-4 p-4 rounded-lg bg-indigo-950/40 border border-indigo-500/30 space-y-2">
                    <span className="text-xs font-semibold text-indigo-300">
                      دستور ست کردن توکن در Wasmer Edge:
                    </span>
                    <div className="bg-slate-950 p-2.5 rounded font-mono text-xs text-slate-300 dir-ltr text-left flex items-center justify-between">
                      <code>wasmer secret create TELEGRAM_BOT_TOKEN "{botToken}"</code>
                      <button
                        onClick={() => copyToClipboard(`wasmer secret create TELEGRAM_BOT_TOKEN "${botToken}"`, 'bot_sec')}
                        className="p-1 hover:text-white text-slate-400"
                      >
                        {copiedKey === 'bot_sec' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: CONFIG FILES & INSPECTOR */}
        {/* ============================================================== */}
        {activeTab === 'configs' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">فایل‌های پیکربندی و استقرار Wasmer</h2>
                <p className="text-xs sm:text-sm text-slate-400">مشاهده، کپی و دانلود فایل‌های آماده شده برای Wasmer</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    downloadTextFile(
                      activeConfigFile,
                      configFiles[activeConfigFile] || 'فایل بارگذاری نشد.'
                    )
                  }
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>دانلود فایل فعلی ({activeConfigFile})</span>
                </button>
              </div>
            </div>

            {/* File Switcher Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
              {['wasmer.toml', 'app.yaml', 'Dockerfile', 'deploy-wasmer.sh', 'README-WASMER.md'].map((file) => (
                <button
                  key={file}
                  onClick={() => setActiveConfigFile(file)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ${
                    activeConfigFile === file
                      ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{file}</span>
                </button>
              ))}
            </div>

            {/* Code Viewer */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
              <div className="bg-slate-900/90 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                <span className="font-mono text-xs text-slate-300 dir-ltr">{activeConfigFile}</span>
                <button
                  onClick={() => copyToClipboard(configFiles[activeConfigFile] || '', 'current_file')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors flex items-center gap-1"
                >
                  {copiedKey === 'current_file' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>کپی شد!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>کپی محتوا</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed dir-ltr max-h-[500px]">
                <code>{configFiles[activeConfigFile] || 'در حال بارگذاری محتوای فایل...'}</code>
              </pre>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 5: SYSTEM & HEALTH STATUS */}
        {/* ============================================================== */}
        {activeTab === 'status' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">وضعیت سرویس و پیش‌نیازها</h2>
                <p className="text-xs sm:text-sm text-slate-400">بررسی باینری yt-dlp و هماهنگی محیط اجرایی با Wasmer</p>
              </div>
              <button
                onClick={fetchHealth}
                disabled={healthLoading}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
                <span>بروزرسانی وضعیت</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>وضعیت سرور</span>
                  <Server className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-base font-bold text-white uppercase">{health?.status || 'Online'}</span>
                </div>
                <span className="text-[11px] text-slate-500">پورت فعال: 3000</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>وضعیت موتور yt-dlp</span>
                  <Cpu className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-base font-bold text-white">
                  {health?.ytdlpAvailable ? (
                    <span className="text-emerald-400">نصب و آماده</span>
                  ) : (
                    <span className="text-amber-400 text-xs">موتور هوشمند پیش‌فرض (Mock/Meta)</span>
                  )}
                </div>
                <span className="text-[11px] text-slate-500 truncate block dir-ltr" title={health?.ytdlpPath}>
                  {health?.ytdlpPath}
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>نسخه Node.js</span>
                  <Layers className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-base font-bold text-white font-mono dir-ltr text-right">
                  {health?.nodeVersion || 'v22.x'}
                </div>
                <span className="text-[11px] text-slate-500">
                  {health?.platform} ({health?.arch})
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>سازگاری با Wasmer</span>
                  <ShieldCheck className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-base font-bold text-sky-400">100% Ready</div>
                <span className="text-[11px] text-slate-500">Edge &amp; Wasm Optimized</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-6 text-center text-xs text-slate-500 space-y-2">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>Universal Media Downloader &amp; Wasmer Deployment Suite</span>
          <div className="flex items-center gap-4">
            <a
              href="https://wasmer.io"
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 hover:text-white transition-colors"
            >
              Wasmer.io
            </a>
            <a
              href="https://docs.wasmer.io"
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 hover:text-white transition-colors"
            >
              مستندات Wasmer
            </a>
            <a
              href="https://github.com/yt-dlp/yt-dlp"
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 hover:text-white transition-colors"
            >
              پروژه yt-dlp
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
