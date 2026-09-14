import React, { useState, useEffect } from 'react';
import { Download, Gift, Link as LinkIcon, Loader2, Youtube, Instagram, Music2, CheckCircle2, AlertCircle, Cookie, X, Save, Video, Globe, Send, HelpCircle, Home, Users, Settings, Activity, UserCheck, Image as ImageIcon, Database, Cloud, RefreshCw, Check, ExternalLink, HardDrive, Sparkles, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Language, translations } from './translations';

const tabTranslations = {
  fa: {
    home: 'خانه',
    users: 'کاربران',
    settings: 'تنظیمات',
    gifts: 'کدهای هدیه',
    changeLang: 'تغییر زبان سیستم',
    manageCookies: 'تنظیمات کوکی سرور',
    manageTelegram: 'پیکربندی ربات تلگرام',
    manageCloudflare: 'تنظیمات دیتابیس کلودفلر',
    cookieDesc: 'تنظیم کوکی‌های نت‌اسکیپ جهت دور زدن محدودیت‌های دانلودی اینستاگرام و یوتیوب.',
    tgDesc: 'اتصال مستقیم ربات تلگرامی به سرور دانلودر شما جهت دانلود مستقیم رسانه از تلگرام.',
    cloudflareDesc: 'اتصال ربات تلگرام به دیتابیس ابری بدون سرور کلودفلر (Cloudflare D1) جهت ذخیره‌سازی ابری و پایدار.',
    usersTitle: 'آمار و وضعیت کاربران ربات تلگرام',
    totalUsers: 'کل کاربران ربات',
    premiumUsers: 'کاربران پریمیوم (Stars)',
    activeUsers: 'کاربران فعال امروز',
    recentActivity: 'آخرین فعالیت‌های کاربران ربات تلگرام',
    username: 'نام کاربری',
    userId: 'شناسه کاربر',
    action: 'آخرین فعالیت',
    status: 'وضعیت',
    time: 'زمان',
    premium: 'پریمیوم (Stars) 👑',
    standard: 'معمولی 👤',
    noActivity: 'فعالیتی ثبت نشده است.',
    langActive: 'زبان فعال برنامه:',
    cookieConfigured: 'کوکی سرور پیکربندی شده است ✅',
    cookieNotConfigured: 'کوکی سرور پیکربندی نشده است ❌',
    tgStatusRunning: 'ربات در حال اجرا است ✅',
    tgStatusStopped: 'ربات غیرفعال است ❌',
    cfStatusConnected: 'دیتابیس کلودفلر متصل است ✅',
    cfStatusDisconnected: 'دیتابیس کلودفلر متصل نیست ❌',
    telegramActiveTitle: 'ربات تلگرام فعال شد',
    telegramInactiveTitle: 'ربات تلگرام غیرفعال شد'
  },
  en: {
    home: 'Home',
    users: 'Users',
    settings: 'Settings',
    gifts: 'Gift Codes',
    changeLang: 'Change System Language',
    manageCookies: 'Server Cookie Settings',
    manageTelegram: 'Telegram Bot Configuration',
    manageCloudflare: 'Cloudflare D1 Settings',
    cookieDesc: 'Configure Netscape cookies to bypass download restrictions on Instagram and YouTube.',
    tgDesc: 'Directly connect a Telegram Bot to your downloader server to download media from Telegram.',
    cloudflareDesc: 'Connect Telegram bot to Cloudflare D1 serverless database for resilient, fast cloud data storage.',
    usersTitle: 'Telegram Bot User Analytics & Status',
    totalUsers: 'Total Bot Users',
    premiumUsers: 'Premium Users (Stars)',
    activeUsers: 'Active Today',
    recentActivity: 'Recent Telegram Bot User Activity',
    username: 'Username',
    userId: 'User ID',
    action: 'Latest Action',
    status: 'Status',
    time: 'Time',
    premium: 'Premium (Stars) 👑',
    standard: 'Standard 👤',
    noActivity: 'No activity recorded.',
    langActive: 'Active Language:',
    cookieConfigured: 'Server Cookies configured ✅',
    cookieNotConfigured: 'Server Cookies not configured ❌',
    tgStatusRunning: 'Bot is running ✅',
    tgStatusStopped: 'Bot is stopped ❌',
    cfStatusConnected: 'Cloudflare D1 is Connected ✅',
    cfStatusDisconnected: 'Cloudflare D1 is Disconnected ❌',
    telegramActiveTitle: 'Telegram Bot is Active',
    telegramInactiveTitle: 'Telegram Bot is Inactive'
  },
  ru: {
    home: 'Главная',
    users: 'Пользователи',
    settings: 'Настройки',
    gifts: 'Подарочные коды',
    changeLang: 'Изменить язык системы',
    manageCookies: 'Настройки куки сервера',
    manageTelegram: 'Настройка Telegram-бота',
    manageCloudflare: 'Настройки Cloudflare D1',
    cookieDesc: 'Настройте файлы куки Netscape для обхода ограничений скачивания в Instagram и YouTube.',
    tgDesc: 'Подключите Telegram-бота к вашему серверу для скачивания напрямую через Telegram.',
    cloudflareDesc: 'Подключите Telegram-бота к бессерверной базе данных Cloudflare D1 для надежного хранения данных.',
    usersTitle: 'Аналитика и статус пользователей бота',
    totalUsers: 'Всего пользователей',
    premiumUsers: 'Премиум-пользователи',
    activeUsers: 'Активно сегодня',
    recentActivity: 'Последняя активность пользователей бота',
    username: 'Имя пользователя',
    userId: 'ID пользователя',
    action: 'Действие',
    status: 'Статус',
    time: 'Время',
    premium: 'Премиум (Stars) 👑',
    standard: 'Стандарт 👤',
    noActivity: 'Активность не зарегистрирована.',
    langActive: 'Активный язык:',
    cookieConfigured: 'Серверные куки настроены ✅',
    cookieNotConfigured: 'Серверные куки не настроены ❌',
    tgStatusRunning: 'Бот запущен ✅',
    tgStatusStopped: 'Бот остановлен ❌',
    cfStatusConnected: 'Cloudflare D1 подключен ✅',
    cfStatusDisconnected: 'Cloudflare D1 не подключен ❌',
    telegramActiveTitle: 'Telegram-бот активен',
    telegramInactiveTitle: 'Telegram-бот остановлен'
  }
};


interface Task {
  id: string;
  status: 'fetching' | 'downloading' | 'success' | 'error';
  progress: number;
  title: string;
  url: string;
  size?: string;
  speed?: string;
  fileUrl?: string;
  downloadName?: string;
  error?: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'users' | 'settings'>('home');
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('dl_flow_lang');
    return (saved === 'fa' || saved === 'en' || saved === 'ru') ? saved : 'fa';
  });
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

  const handleSetLang = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('dl_flow_lang', newLang);
    setIsLangDropdownOpen(false);
  };

  const t = (key: keyof typeof translations['fa']) => {
    return translations[lang][key] || translations['fa'][key];
  };

  const [url, setUrl] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [giftsList, setGiftsList] = useState<any[]>([]);
  const [telegramBotUsername, setTelegramBotUsername] = useState<string>('your_bot');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isCookieModalOpen, setIsCookieModalOpen] = useState(false);
  const [cookieContent, setCookieContent] = useState('');
  const [isSavingCookies, setIsSavingCookies] = useState(false);
  const [cookieStatus, setCookieStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Telegram Bot State
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramStatus, setTelegramStatus] = useState<{
    running: boolean;
    botName: string | null;
    botUsername: string | null;
    tokenConfigured: boolean;
    error: string | null;
  } | null>(null);
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);
  const [telegramSaveStatus, setTelegramSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Cloudflare D1 Database State
  const [isCloudflareModalOpen, setIsCloudflareModalOpen] = useState(false);
  const [cfApiToken, setCfApiToken] = useState('');
  const [cfAccountId, setCfAccountId] = useState('');
  const [cfDatabaseId, setCfDatabaseId] = useState('');
  const [cfDatabaseName, setCfDatabaseName] = useState('telegram_bot_db');
  const [cfMigrateData, setCfMigrateData] = useState(true);
  const [cfStatus, setCfStatus] = useState<{
    enabled: boolean;
    connected: boolean;
    accountId?: string;
    databaseId?: string;
    databaseName?: string;
    latencyMs?: number;
    tablesCount?: number;
    error?: string | null;
    hasConfig?: boolean;
    maskedToken?: string;
  } | null>(null);
  const [isTestingCf, setIsTestingCf] = useState(false);
  const [cfSaveStatus, setCfSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [cfAvailableDbs, setCfAvailableDbs] = useState<Array<{ uuid: string; name: string; num_tables?: number }>>([]);
  const [isFetchingDbs, setIsFetchingDbs] = useState(false);
  const [isCreatingDb, setIsCreatingDb] = useState(false);
  const [isSyncingCf, setIsSyncingCf] = useState(false);
  const [cfSyncSuccess, setCfSyncSuccess] = useState<string | null>(null);
  const [showCfAdvanced, setShowCfAdvanced] = useState(false);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [usersDashboardData, setUsersDashboardData] = useState<{
    totalUsers: number;
    premiumUsers: number;
    activeUsers: number;
    users: { id: string; username: string; status: 'premium' | 'standard'; lastActivity: string; lastUrl?: string; }[];
  } | null>(null);
  const [openUserMenu, setOpenUserMenu] = useState<string | null>(null);
  const [selectedUserActivity, setSelectedUserActivity] = useState<{ username: string; lastActivity: string; lastUrl?: string; } | null>(null);

  useEffect(() => {
    if (activeTab === 'users') {
      fetch('/api/users/dashboard')
        .then(res => res.json())
        .then(data => setUsersDashboardData(data))
        .catch(console.error);
    }
  }, [activeTab]);

  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{
    url: string;
    title: string;
    uploader: string;
    duration: string;
    thumbnail: string;
    platform: 'youtube' | 'instagram' | 'tiktok' | 'other';
    videoFormats: Array<{
      formatId: string;
      ext: string;
      resolution: string;
      type: 'video' | 'mixed';
      sizeBytes: number;
      sizeStr: string;
    }>;
    audioFormats: Array<{
      formatId: string;
      ext: string;
      resolution: string;
      type: 'audio';
      sizeBytes: number;
      sizeStr: string;
    }>;
  } | null>(null);

  const loadGifts = async () => {
    try {
      const res = await fetch('/api/gifts');
      if (res.ok) {
        setGiftsList(await res.json());
      }
      const tgRes = await fetch('/api/telegram/status');
      if (tgRes.ok) {
        const tgData = await tgRes.json();
        if (tgData.botUsername) setTelegramBotUsername(tgData.botUsername);
        else if (tgData.username) setTelegramBotUsername(tgData.username);
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadGifts();
  }, []);

  useEffect(() => {
    if (isCookieModalOpen) {
      fetch('/api/cookies')
        .then(res => res.json())
        .then(data => {
          setCookieContent(data.content || '');
          setCookieStatus(null);
        })
        .catch(err => {
          console.error('Error fetching cookies:', err);
        });
    }
  }, [isCookieModalOpen]);

  const handleSaveCookies = async () => {
    setIsSavingCookies(true);
    setCookieStatus(null);
    try {
      const res = await fetch('/api/cookies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: cookieContent })
      });
      if (res.ok) {
        setCookieStatus({ type: 'success', message: 'کوکی‌ها با موفقیت ذخیره شدند.' });
        setTimeout(() => {
          setIsCookieModalOpen(false);
          setCookieStatus(null);
        }, 1500);
      } else {
        const data = await res.json();
        setCookieStatus({ type: 'error', message: data.error || 'خطا در ذخیره‌سازی کوکی‌ها.' });
      }
    } catch (err: any) {
      setCookieStatus({ type: 'error', message: err.message || 'خطا در اتصال به سرور.' });
    } finally {
      setIsSavingCookies(false);
    }
  };

  // Telegram Status fetching and configurations
  const fetchTelegramStatus = async () => {
    try {
      const res = await fetch('/api/telegram/status');
      if (res.ok) {
        const data = await res.json();
        setTelegramStatus(data);
      }
    } catch (err) {
      // Quietly ignore transient errors during dev server restarts
    }
  };

  useEffect(() => {
    fetchTelegramStatus();
    const interval = setInterval(fetchTelegramStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isTelegramModalOpen) {
      fetchTelegramStatus();
      setTelegramSaveStatus(null);
    }
  }, [isTelegramModalOpen]);

  const handleSaveTelegram = async () => {
    setIsSavingTelegram(true);
    setTelegramSaveStatus(null);
    try {
      const res = await fetch('/api/telegram/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: telegramToken })
      });
      const data = await res.json();
      if (res.ok) {
        setTelegramSaveStatus({ 
          type: 'success', 
          message: telegramToken.trim() ? 'ربات تلگرام با موفقیت فعال و متصل شد! 🎉' : 'ربات تلگرام غیرفعال و خاموش شد.' 
        });
        fetchTelegramStatus();
        setTimeout(() => {
          setIsTelegramModalOpen(false);
          setTelegramSaveStatus(null);
        }, 1800);
      } else {
        setTelegramSaveStatus({ type: 'error', message: data.error || 'خطا در راه‌اندازی ربات تلگرام.' });
      }
    } catch (err: any) {
      setTelegramSaveStatus({ type: 'error', message: err.message || 'خطا در اتصال به سرور.' });
    } finally {
      setIsSavingTelegram(false);
    }
  };

  // Cloudflare Status & Operations
  const fetchCloudflareStatus = async () => {
    try {
      const res = await fetch('/api/cloudflare/status');
      if (res.ok) {
        const data = await res.json();
        setCfStatus(data);
        if (data.accountId && !cfAccountId) setCfAccountId(data.accountId);
        if (data.databaseId && !cfDatabaseId) setCfDatabaseId(data.databaseId);
        if (data.databaseName && !cfDatabaseName) setCfDatabaseName(data.databaseName);
      }
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    fetchCloudflareStatus();
    const interval = setInterval(fetchCloudflareStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isCloudflareModalOpen) {
      fetchCloudflareStatus();
      setCfSaveStatus(null);
    }
  }, [isCloudflareModalOpen]);

  const handleFetchDatabases = async () => {
    if (!cfApiToken || !cfAccountId) {
      setCfSaveStatus({ type: 'error', message: 'لطفاً ابتدا توکن API و شناسه اکانت (Account ID) را وارد کنید.' });
      return;
    }
    setIsFetchingDbs(true);
    setCfSaveStatus(null);
    try {
      const res = await fetch('/api/cloudflare/list-dbs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiToken: cfApiToken, accountId: cfAccountId })
      });
      const data = await res.json();
      if (res.ok && data.databases) {
        setCfAvailableDbs(data.databases);
        if (data.databases.length > 0 && !cfDatabaseId) {
          setCfDatabaseId(data.databases[0].uuid);
          setCfDatabaseName(data.databases[0].name);
        }
        setCfSaveStatus({ type: 'success', message: `${data.databases.length} دیتابیس در اکانت کلودفلر شما یافت شد.` });
      } else {
        setCfSaveStatus({ type: 'error', message: data.error || 'خطا در دریافت لیست دیتابیس‌ها. توکن و شناسه اکانت را بررسی نمایید.' });
      }
    } catch (err: any) {
      setCfSaveStatus({ type: 'error', message: err.message || 'خطا در ارتباط با کلودفلر.' });
    } finally {
      setIsFetchingDbs(false);
    }
  };

  const handleCreateDatabase = async () => {
    if (!cfApiToken || !cfAccountId) {
      setCfSaveStatus({ type: 'error', message: 'لطفاً ابتدا توکن API و شناسه اکانت را وارد کنید.' });
      return;
    }
    setIsCreatingDb(true);
    setCfSaveStatus(null);
    try {
      const res = await fetch('/api/cloudflare/create-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiToken: cfApiToken,
          accountId: cfAccountId,
          databaseName: cfDatabaseName || 'telegram_bot_db'
        })
      });
      const data = await res.json();
      if (res.ok && data.database) {
        setCfDatabaseId(data.database.uuid);
        setCfDatabaseName(data.database.name);
        setCfSaveStatus({ type: 'success', message: `دیتابیس ${data.database.name} با موفقیت در کلودفلر ساخته شد! شناسه اختصاص داده شد.` });
        handleFetchDatabases();
      } else {
        setCfSaveStatus({ type: 'error', message: data.error || 'خطا در ساخت دیتابیس در کلودفلر.' });
      }
    } catch (err: any) {
      setCfSaveStatus({ type: 'error', message: err.message || 'خطا در ساخت دیتابیس.' });
    } finally {
      setIsCreatingDb(false);
    }
  };

  const handleAutoSetupCloudflare = async () => {
    if (!cfApiToken) {
      setCfSaveStatus({
        type: 'error',
        message: lang === 'fa' ? 'لطفاً توکن اختصاصی کلودفلر (API Token) را وارد کنید.' : 'Please enter your Cloudflare API Token.'
      });
      return;
    }
    setIsTestingCf(true);
    setCfSaveStatus(null);
    try {
      const res = await fetch('/api/cloudflare/auto-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiToken: cfApiToken,
          databaseName: cfDatabaseName || 'telegram_bot_db',
          migrateData: cfMigrateData
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCfSaveStatus({
          type: 'success',
          message: lang === 'fa'
            ? `پایگاه داده کلودفلر با موفقیت متصل و راه‌اندازی شد! 🎉 ${data.isNewDatabase ? '(دیتابیس جدید ساخته شد)' : ''} ${data.migratedRecords ? `(${data.migratedRecords} رکورد منتقل شد)` : ''}`
            : `Cloudflare D1 connected & setup completed! 🎉 ${data.migratedRecords ? `(${data.migratedRecords} records migrated)` : ''}`
        });
        fetchCloudflareStatus();
        setTimeout(() => {
          setIsCloudflareModalOpen(false);
          setCfSaveStatus(null);
        }, 2200);
      } else {
        setCfSaveStatus({
          type: 'error',
          message: data.error || (lang === 'fa' ? 'خطا در اتصال خودکار کلودفلر. توکن را بررسی نمایید.' : 'Cloudflare auto-setup failed. Please verify token.')
        });
      }
    } catch (err: any) {
      setCfSaveStatus({
        type: 'error',
        message: err.message || (lang === 'fa' ? 'خطا در ارتباط با سرور.' : 'Server communication error.')
      });
    } finally {
      setIsTestingCf(false);
    }
  };

  const handleSaveCloudflare = async () => {
    if (!cfApiToken || !cfAccountId || !cfDatabaseId) {
      setCfSaveStatus({ type: 'error', message: 'لطفاً همه فیلدهای الزامی (توکن، شناسه اکانت و شناسه دیتابیس) را وارد کنید.' });
      return;
    }
    setIsTestingCf(true);
    setCfSaveStatus(null);
    try {
      const res = await fetch('/api/cloudflare/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiToken: cfApiToken,
          accountId: cfAccountId,
          databaseId: cfDatabaseId,
          databaseName: cfDatabaseName,
          migrateData: cfMigrateData
        })
      });
      const data = await res.json();
      if (res.ok) {
        setCfSaveStatus({
          type: 'success',
          message: `اتصال به دیتابیس کلودفلر با موفقیت برقرار شد! 🎉 ${data.migratedRecords ? `(${data.migratedRecords} رکورد منتقل شد)` : ''}`
        });
        fetchCloudflareStatus();
        setTimeout(() => {
          setIsCloudflareModalOpen(false);
          setCfSaveStatus(null);
        }, 2000);
      } else {
        setCfSaveStatus({ type: 'error', message: data.error || 'خطا در اتصال به دیتابیس کلودفلر.' });
      }
    } catch (err: any) {
      setCfSaveStatus({ type: 'error', message: err.message || 'خطا در ارتباط با سرور.' });
    } finally {
      setIsTestingCf(false);
    }
  };

  const handleDisconnectCloudflare = async () => {
    if (!confirm(lang === 'fa' ? 'آیا از قطع اتصال دیتابیس کلودفلر اطمینان دارید؟' : 'Are you sure you want to disconnect Cloudflare Database?')) return;
    try {
      const res = await fetch('/api/cloudflare/config', { method: 'DELETE' });
      if (res.ok) {
        setCfStatus(null);
        setCfApiToken('');
        setCfAccountId('');
        setCfDatabaseId('');
        setIsCloudflareModalOpen(false);
      }
    } catch (err) {}
  };

  const handleSyncCloudflareNow = async () => {
    setIsSyncingCf(true);
    setCfSyncSuccess(null);
    try {
      const res = await fetch('/api/cloudflare/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setCfSyncSuccess(lang === 'fa' ? 'همگام‌سازی اطلاعات با کلودفلر با موفقیت انجام شد ✅' : 'Cloudflare sync completed successfully ✅');
        fetchCloudflareStatus();
        setTimeout(() => setCfSyncSuccess(null), 3500);
      } else {
        alert(data.error || 'Sync failed');
      }
    } catch (err: any) {
      alert(err.message || 'Error syncing to Cloudflare');
    } finally {
      setIsSyncingCf(false);
    }
  };

  const downloadFile = (fileUrl: string, fileName: string) => {
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Poll for active task status
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (activeTaskId) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/status/${activeTaskId}`);
          if (res.ok) {
            const task: Task = await res.json();
            setTasks(prev => {
              const newTasks = [...prev];
              const idx = newTasks.findIndex(t => t.id === task.id);
              if (idx >= 0) {
                newTasks[idx] = task;
              } else {
                newTasks.unshift(task);
              }
              return newTasks;
            });

            if (task.status === 'success' || task.status === 'error') {
              setActiveTaskId(null);
              // Trigger actual file download if success
              if (task.status === 'success' && task.fileUrl) {
                downloadFile(task.fileUrl, task.downloadName || 'download');
                
              }
            }
          }
        } catch (e) {
          console.error(e);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTaskId]);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'خطا در تحلیل لینک.');
      }
      setAnalysisResult(data);
    } catch (error: any) {
      console.error(error);
      setAnalysisError(error.message || 'خطا در ارتباط با سرور.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const triggerDownload = async (formatId: string, ext: string, type: 'video' | 'audio', label: string) => {
    if (!analysisResult) return;

    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: analysisResult.url,
          formatId,
          title: analysisResult.title,
          type,
          ext
        })
      });

      const data = await res.json();
      if (data.taskId) {
        setActiveTaskId(data.taskId);
        setTasks(prev => [{
          id: data.taskId,
          status: 'downloading',
          progress: 0,
          title: `${analysisResult.title} (${label})`,
          url: analysisResult.url,
          size: 'Unknown',
          speed: '0 MB/s'
        }, ...prev]);
      } else {
        alert(data.error || 'خطا در شروع دانلود.');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'خطا در شروع دانلود.');
    }
  };

  const handleDownloadThumbnail = async (format: string = 'jpg') => {
    if (!analysisResult?.thumbnail) return;
    try {
      const res = await fetch('/api/download-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: analysisResult.thumbnail, format })
      });
      if (!res.ok) throw new Error('Failed to download thumbnail');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `thumbnail.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (err) {
      console.error(err);
      window.open(analysisResult.thumbnail, '_blank');
    }
  };

  const activeTask = tasks.find(t => t.id === activeTaskId);
  const isProcessing = (!!activeTask && activeTask.status === 'downloading') || isAnalyzing;

  return (
    <div className="h-screen bg-slate-950 text-slate-200 font-sans flex flex-col overflow-hidden" dir={lang === 'fa' ? 'rtl' : 'ltr'}>
      {/* Navigation Bar */}
      <nav className="h-16 border-b border-slate-800 px-4 md:px-8 flex items-center justify-between bg-slate-900/50 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.5)]">
            <Download className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg sm:text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent" dir="ltr">DL-FLOW</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4" dir="ltr">
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest">Node.js Engine</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
            <span className="text-xs font-mono text-indigo-400 uppercase tracking-widest">Railway Ready</span>
          </div>
        </div>
      </nav>

      {/* Main Workspace */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 p-4 md:p-8 overflow-y-auto overflow-x-hidden">
        {activeTab === 'home' && (
          <>
            {/* Left: Interaction Panel */}
            <div className="md:col-span-7 flex flex-col justify-start gap-6 overflow-y-visible pr-0 md:pr-1">
          <div className="space-y-3">
            <h1 className={`text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight ${lang === 'fa' ? 'text-right' : 'text-left'}`}>
              {t('title')} <br/><span className="text-indigo-500">{t('subtitle')}</span>
            </h1>
            <p className={`text-slate-400 text-sm ${lang === 'fa' ? 'text-right' : 'text-left'}`}>
              {t('desc')}
            </p>
          </div>

          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-25 group-focus-within:opacity-50 transition duration-1000"></div>
            <form onSubmit={handleAnalyze} className="relative flex flex-col sm:flex-row bg-slate-900 rounded-xl border border-slate-700 p-2 gap-2 sm:gap-0 items-stretch sm:items-center">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t('placeholder')}
                className={`bg-transparent border-none focus:ring-0 text-white flex-1 px-4 py-3 text-base placeholder-slate-600 outline-none ${lang === 'fa' ? 'text-right' : 'text-left'}`}
                dir="ltr"
              />
              <button
                type="submit"
                disabled={!url || isAnalyzing}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-8 py-3 rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('analyzing')}
                  </>
                ) : (
                  <>
                    {t('analyze')}
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Analysis Error State */}
          {analysisError && (
            <div className="p-4 bg-red-950/40 border border-red-900/50 rounded-xl text-red-200 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p>{analysisError}</p>
            </div>
          )}

          {/* Analysis Result Card */}
          {analysisResult && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-5 shadow-xl overflow-hidden">
              {/* Media Info Row */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                {analysisResult.thumbnail && (
                  <img
                    src={analysisResult.thumbnail}
                    alt={analysisResult.title}
                    className="w-full sm:w-32 h-44 sm:h-20 object-cover rounded-lg border border-slate-700 shadow-md shrink-0"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs font-mono text-indigo-400 flex items-center gap-1">
                      {analysisResult.platform === 'youtube' && <Youtube className="w-3.5 h-3.5 text-red-500" />}
                      {analysisResult.platform === 'instagram' && <Instagram className="w-3.5 h-3.5 text-pink-500" />}
                      {analysisResult.platform === 'tiktok' && <Music2 className="w-3.5 h-3.5 text-teal-400" />}
                      {analysisResult.platform === 'other' && <Globe className="w-3.5 h-3.5" />}
                      <span className="capitalize">{analysisResult.platform}</span>
                    </span>
                    {analysisResult.duration && (
                      <span className="px-2.5 py-0.5 bg-slate-800 border border-slate-700 rounded-full text-xs text-slate-300 font-mono">
                        {analysisResult.duration}
                      </span>
                    )}
                  </div>
                  <h3 className={`font-bold text-white text-base line-clamp-2 leading-relaxed ${lang === 'fa' ? 'text-right' : 'text-left'}`}>
                    {analysisResult.title}
                  </h3>
                  <p className={`text-xs text-slate-400 ${lang === 'fa' ? 'text-right' : 'text-left'}`}>
                    {t('publisher')} <span className="text-slate-300 font-medium">{analysisResult.uploader}</span>
                  </p>
                </div>
              </div>

              {/* Formats Grid */}
              <div className="space-y-4 pt-3 border-t border-slate-800">
                {/* Thumbnail Section */}
                {analysisResult.thumbnail && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4" />
                      Thumbnail / تامنیل
                    </h4>
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1 font-sans">
                        {['JPG', 'PNG', 'BMP'].map((fmt) => (
                          <div key={fmt} className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-3 bg-slate-950/50 border border-slate-800/80 rounded-lg hover:border-slate-700 transition-all text-sm gap-3 sm:gap-2 ${lang === 'fa' ? 'text-right' : 'text-left'}`}>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-pink-500/10 text-pink-400 border border-pink-500/20 rounded font-mono text-xs font-bold">
                                {fmt}
                              </span>
                              <span className="text-xs text-slate-300 font-sans">
                                بهترین کیفیت موجود (Highest Quality)
                              </span>
                            </div>
                            <button
                              onClick={() => handleDownloadThumbnail(fmt.toLowerCase())}
                              className="w-full sm:w-auto px-4 py-2.5 sm:py-1.5 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-md text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm min-h-[44px] sm:min-h-0"
                            >
                              <Download className="w-3.5 h-3.5" />
                              {t('dlThumbnail')} {fmt}
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Video Formats Section */}
                {analysisResult.platform !== 'pinterest' && analysisResult.videoFormats && analysisResult.videoFormats.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                      <Video className="w-4 h-4" />
                      {t('videoQuality')}
                    </h4>
                    <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1 font-sans">
                      {/* Premium 4K Option (Available as a convenient high-res selection) */}
                      {analysisResult.platform === 'youtube' && (
                        <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-3 bg-gradient-to-r from-amber-500/10 to-indigo-500/5 border border-amber-500/30 rounded-lg hover:border-amber-500/40 transition-all text-sm gap-3 sm:gap-2 shadow-[0_0_15px_rgba(245,158,11,0.03)] ${lang === 'fa' ? 'text-right' : 'text-left'}`}>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded font-mono text-xs font-bold animate-pulse">
                              {t('hqGoldTitle')}
                            </span>
                            <span className="text-xs text-slate-300 font-sans">
                              {t('hqGold')}
                            </span>
                          </div>
                          <button
                            onClick={() => triggerDownload('4k', 'mp4', 'video', '4K Ultra HD')}
                            className="w-full sm:w-auto px-4 py-2.5 sm:py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-md text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm min-h-[44px] sm:min-h-0"
                          >
                            <Download className="w-3.5 h-3.5" />
                            {t('hqGoldBtn')}
                          </button>
                        </div>
                      )}

                      {analysisResult.videoFormats.slice(0, 10).map((f) => {
                        const is4K = f.resolution.includes('2160p') || f.resolution.toLowerCase().includes('4k');
                        return (
                          <div key={f.formatId} className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-3 bg-slate-950/50 border rounded-lg hover:border-slate-700 transition-all text-sm gap-3 sm:gap-2 ${lang === 'fa' ? 'text-right' : 'text-left'} ${is4K ? 'border-amber-500/20' : 'border-slate-800/80'}`}>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded font-mono text-xs font-bold ${
                                is4K
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)] animate-pulse'
                                  : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                              }`}>
                                {is4K ? `${f.resolution} (4K)` : f.resolution}
                              </span>
                              <span className="text-xs text-slate-400 font-mono">
                                ({f.ext}) {f.sizeStr && `• ${f.sizeStr}`}
                              </span>
                            </div>
                            <button
                              onClick={() => triggerDownload(f.formatId, f.ext, 'video', f.resolution)}
                              className={`w-full sm:w-auto px-4 py-2.5 sm:py-1.5 text-white font-bold rounded-md text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm min-h-[44px] sm:min-h-0 ${is4K ? 'bg-amber-600 hover:bg-amber-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}
                            >
                              <Download className="w-3.5 h-3.5" />
                              {t('dlVideo')}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Audio Formats Section */}
                {analysisResult.platform !== 'pinterest' && analysisResult.audioFormats && analysisResult.audioFormats.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Music2 className="w-4 h-4" />
                      {t('audioQuality')}
                    </h4>
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1 font-sans">
                      {analysisResult.audioFormats.slice(0, 6).map((f) => (
                        <div key={f.formatId} className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-3 bg-slate-950/50 border border-slate-800/80 rounded-lg hover:border-slate-700 transition-all text-sm gap-3 sm:gap-2 ${lang === 'fa' ? 'text-right' : 'text-left'}`}>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-mono text-xs font-bold">
                              {f.resolution}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">
                              ({f.ext}) {f.sizeStr && `• ${f.sizeStr}`}
                            </span>
                          </div>
                          <button
                            onClick={() => triggerDownload(f.formatId, f.ext, 'audio', f.resolution)}
                            className="w-full sm:w-auto px-4 py-2.5 sm:py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-md text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm min-h-[44px] sm:min-h-0"
                          >
                            <Download className="w-3.5 h-3.5" />
                            {t('dlAudio')}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Advanced Audio Conversion Section */}
                {analysisResult.platform !== 'pinterest' && (
                  <div className={`space-y-2 mt-4 pt-3 border-t border-slate-800/60 ${lang === 'fa' ? 'text-right' : 'text-left'}`}>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 justify-start">
                      <Music2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                      {t('advAudio')}
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                    {/* MP3 320kbps */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-3 bg-gradient-to-r from-emerald-500/5 to-slate-900 border border-emerald-500/20 rounded-lg hover:border-emerald-500/40 transition-all text-sm gap-3 sm:gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded font-mono text-xs font-bold">
                          MP3 (320kbps)
                        </span>
                        <span className="text-xs text-slate-300 font-sans">
                          {t('mp3_320_desc')}
                        </span>
                      </div>
                      <button
                        onClick={() => triggerDownload('mp3-320', 'mp3', 'audio', 'MP3 320kbps')}
                        className="w-full sm:w-auto px-4 py-2.5 sm:py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-md text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm min-h-[44px] sm:min-h-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        {t('dlAudio')} MP3 320
                      </button>
                    </div>

                    {/* MP3 128kbps */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-3 bg-slate-950/40 border border-slate-800 rounded-lg hover:border-slate-700 transition-all text-sm gap-3 sm:gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded font-mono text-xs font-bold">
                          MP3 (128kbps)
                        </span>
                        <span className="text-xs text-slate-400 font-sans">
                          {t('mp3_128_desc')}
                        </span>
                      </div>
                      <button
                        onClick={() => triggerDownload('mp3-128', 'mp3', 'audio', 'MP3 128kbps')}
                        className="w-full sm:w-auto px-4 py-2.5 sm:py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-md text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm min-h-[44px] sm:min-h-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        {t('dlAudio')} MP3 128
                      </button>
                    </div>

                    {/* WAV Lossless */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-3 bg-gradient-to-r from-cyan-500/5 to-slate-900 border border-cyan-500/20 rounded-lg hover:border-cyan-500/40 transition-all text-sm gap-3 sm:gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded font-mono text-xs font-bold">
                          WAV (Lossless)
                        </span>
                        <span className="text-xs text-slate-300 font-sans">
                          {t('wav_desc')}
                        </span>
                      </div>
                      <button
                        onClick={() => triggerDownload('wav', 'wav', 'audio', 'WAV Lossless')}
                        className="w-full sm:w-auto px-4 py-2.5 sm:py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-md text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm min-h-[44px] sm:min-h-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        {t('dlAudio')} WAV
                      </button>
                    </div>
                  </div>
                </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-8 pt-2">
            <div className="flex flex-col gap-2 opacity-60">
              <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500">{t('secPlatform')}</span>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-slate-800 rounded flex items-center justify-center text-slate-300">
                  <Youtube className="w-4 h-4" />
                </div>
                <div className="w-8 h-8 bg-slate-800 rounded flex items-center justify-center text-slate-300">
                  <Instagram className="w-4 h-4" />
                </div>
                <div className="w-8 h-8 bg-slate-800 rounded flex items-center justify-center text-slate-300">
                  <Music2 className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Queue Status */}
        <div className="md:col-span-5 flex flex-col gap-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6 flex-1 flex flex-col shadow-2xl backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">{t('activeQueue')}</h3>
              <span className="px-2 py-0.5 bg-slate-800 rounded text-[10px] font-mono text-slate-300">{tasks.length} {t('tasks').toUpperCase()}</span>
            </div>

            {/* Dynamic Status Display (For Top Task) */}
            {activeTask && (
              <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                isProcessing ? 'bg-indigo-950/50 border border-indigo-900/50 text-indigo-200' :
                activeTask.status === 'success' ? 'bg-emerald-950/50 border border-emerald-900/50 text-emerald-200' :
                'bg-red-950/50 border border-red-900/50 text-red-200'
              }`}>
                {isProcessing && <Loader2 className="w-5 h-5 animate-spin text-indigo-400 shrink-0" />}
                {activeTask.status === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                {activeTask.status === 'error' && <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />}
                <p className="text-sm">
                  {activeTask.status === 'fetching' && t('statusFetching')}
                  {activeTask.status === 'downloading' && t('statusDownloading')}
                  {activeTask.status === 'success' && t('statusSuccess')}
                  {activeTask.status === 'error' && `${t('statusError')} ${activeTask.error}`}
                </p>
              </div>
            )}

            {/* Queue Items */}
            <div className="space-y-6 overflow-hidden flex-1" dir="ltr">
              {tasks.length === 0 ? (
                <div className="text-slate-600 text-sm italic text-center mt-10">{t('noActive')}</div>
              ) : (
                tasks.map((task, i) => (
                  <div key={task.id} className={`space-y-2 ${i > 0 ? 'opacity-50' : ''}`}>
                    <div className="flex justify-between items-center text-xs gap-3">
                      <span className="text-slate-300 font-medium truncate flex-1 min-w-0" title={task.title}>{task.title}</span>
                      {task.status === 'downloading' && <span className="text-indigo-400 font-mono shrink-0">{task.progress.toFixed(1)}%</span>}
                      {task.status === 'fetching' && <span className="text-slate-400 font-mono shrink-0">FETCHING</span>}
                      {task.status === 'success' && (
                        <button 
                          onClick={() => downloadFile(task.fileUrl!, task.downloadName || 'download')}
                          className="text-emerald-400 font-mono hover:text-emerald-300 underline cursor-pointer shrink-0 min-h-[36px] px-2 flex items-center"
                        >
                          {t('saveFile')}
                        </button>
                      )}
                      {task.status === 'error' && <span className="text-red-400 font-mono shrink-0">ERROR</span>}
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-1.5 rounded-full ${task.status === 'success' ? 'bg-emerald-500' : task.status === 'error' ? 'bg-red-500' : 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]'}`}
                        style={{ width: `${task.status === 'fetching' ? 10 : task.progress}%` }}
                      ></div>
                    </div>
                    {task.status === 'downloading' && (
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>{task.size || '?'}</span>
                        <span>{task.speed || '?'}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* System Stats */}
            <div className="mt-auto pt-6 border-t border-slate-800/50" dir="ltr">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/50">
                  <div className="text-[10px] text-slate-500 uppercase">{t('cpuLoad')}</div>
                  <div className="text-lg font-mono text-white">12.4%</div>
                </div>
                <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/50">
                  <div className="text-[10px] text-slate-500 uppercase">{t('ramUsage')}</div>
                  <div className="text-lg font-mono text-white">412MB</div>
                </div>
              </div>
            </div>
          </div>
        </div>
          </>
        )}

        {activeTab === 'users' && (
          <div className="md:col-span-12 flex flex-col gap-6 pb-24 text-right" dir={lang === 'fa' ? 'rtl' : 'ltr'}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Users className="w-6 h-6 text-indigo-500" />
                  {tabTranslations[lang].usersTitle}
                </h2>
              </div>
              <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-full" dir="ltr">
                <Activity className="w-4 h-4 text-indigo-400 animate-pulse" />
                <span className="text-xs font-mono text-indigo-300 uppercase tracking-wider">LIVE TELEGRAM MONITOR</span>
              </div>
            </div>

            {/* Stats Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex items-center justify-between shadow-lg">
                <div className={`${lang === 'fa' ? 'text-right' : 'text-left'}`}>
                  <div className="text-xs text-slate-500 font-sans">{tabTranslations[lang].totalUsers}</div>
                  <div className="text-2xl font-extrabold font-mono text-white mt-1">{usersDashboardData?.totalUsers ?? 0}</div>
                </div>
                <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex items-center justify-between shadow-lg">
                <div className={`${lang === 'fa' ? 'text-right' : 'text-left'}`}>
                  <div className="text-xs text-slate-500 font-sans">{tabTranslations[lang].premiumUsers}</div>
                  <div className="text-2xl font-extrabold font-mono text-amber-400 mt-1">{usersDashboardData?.premiumUsers ?? 0}</div>
                </div>
                <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-amber-400">
                  <UserCheck className="w-6 h-6" />
                </div>
              </div>

              <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex items-center justify-between shadow-lg">
                <div className={`${lang === 'fa' ? 'text-right' : 'text-left'}`}>
                  <div className="text-xs text-slate-500 font-sans">{tabTranslations[lang].activeUsers}</div>
                  <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-1">{usersDashboardData?.activeUsers ?? 0}</div>
                </div>
                <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                  <Activity className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Recent Activity Table */}
            <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xl mt-2 overflow-hidden">
              <h3 className={`text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2 ${lang === 'fa' ? 'justify-start' : 'justify-start'}`}>
                <Activity className="w-4 h-4 text-indigo-400" />
                {tabTranslations[lang].recentActivity}
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-800/60 text-slate-500 text-xs">
                      <th className={`py-3 px-4 ${lang === 'fa' ? 'text-right' : 'text-left'}`}>{tabTranslations[lang].username}</th>
                      <th className={`py-3 px-4 ${lang === 'fa' ? 'text-right' : 'text-left'}`}>{tabTranslations[lang].status}</th>
                      <th className={`py-3 px-4 ${lang === 'fa' ? 'text-right' : 'text-left'}`}>{lang === 'fa' ? 'مدیریت' : lang === 'ru' ? 'Управление' : 'Management'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersDashboardData?.users?.map((user, i) => (
                      <tr key={i} className="border-b border-slate-800/40 hover:bg-slate-900/20 transition-all relative">
                        <td className="py-3.5 px-4 text-indigo-400 font-semibold" dir="ltr">{user.username}</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${user.status === 'premium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700/50'}`}>
                            {user.status === 'premium' ? tabTranslations[lang].premium : tabTranslations[lang].standard}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="relative">
                            <button
                              onClick={() => setOpenUserMenu(openUserMenu === user.id ? null : user.id)}
                              className="text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              {lang === 'fa' ? 'مدیریت' : lang === 'ru' ? 'Опции' : 'Manage'}
                            </button>
                            
                            {openUserMenu === user.id && (
                              <div className="absolute top-full mt-2 left-0 sm:right-0 sm:left-auto w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col">
                                <button
                                  onClick={() => {
                                    setOpenUserMenu(null);
                                    if(confirm(lang === 'fa' ? 'آیا از فعال‌سازی اشتراک ۳۰ روزه برای این کاربر اطمینان دارید؟' : 'Activate 30-day premium for this user?')) {
                                      fetch('/api/users/premium', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ chatId: user.id, days: 30 })
                                      }).then(res => {
                                        if(res.ok) alert(lang === 'fa' ? 'فعال شد' : 'Activated');
                                        // Trigger a reload
                                        setActiveTab('settings');
                                        setTimeout(() => setActiveTab('users'), 10);
                                      }).catch(console.error);
                                    }
                                  }}
                                  className="text-left px-4 py-2.5 text-xs text-emerald-400 hover:bg-slate-700/50 transition-colors font-bold border-b border-slate-700"
                                >
                                  {lang === 'fa' ? 'فعال‌سازی ۳۰ روزه پریمیوم' : lang === 'ru' ? 'Активировать Премиум' : 'Activate Premium'}
                                </button>
                                <button
                                  onClick={() => {
                                    setOpenUserMenu(null);
                                    setSelectedUserActivity({
                                      username: user.username,
                                      lastActivity: user.lastActivity,
                                      lastUrl: user.lastUrl
                                    });
                                  }}
                                  className="text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-700/50 transition-colors"
                                >
                                  {lang === 'fa' ? 'آخرین فعالیت' : lang === 'ru' ? 'Последняя активность' : 'Last Activity'}
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        

        {activeTab === 'settings' && (
          <div className="md:col-span-12 flex flex-col gap-6 pb-24 text-right" dir={lang === 'fa' ? 'rtl' : 'ltr'}>
            <div className="border-b border-slate-800 pb-5">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Settings className="w-6 h-6 text-indigo-500" />
                {tabTranslations[lang].settings}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* 1. Language Selector Card */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between gap-4 shadow-xl">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div className={`${lang === 'fa' ? 'text-right' : 'text-left'}`}>
                      <h3 className="font-bold text-white text-base">{tabTranslations[lang].changeLang}</h3>
                      <p className="text-xs text-slate-500">{tabTranslations[lang].langActive} <span className="text-indigo-400 font-bold uppercase">{lang === 'fa' ? 'فارسی' : lang === 'en' ? 'English' : 'Русский'}</span></p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <button
                    onClick={() => handleSetLang('fa')}
                    className={`px-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${lang === 'fa' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'}`}
                  >
                    فارسی
                  </button>
                  <button
                    onClick={() => handleSetLang('en')}
                    className={`px-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${lang === 'en' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'}`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => handleSetLang('ru')}
                    className={`px-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${lang === 'ru' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'}`}
                  >
                    Русский
                  </button>
                </div>
              </div>

              {/* 2. Cookie Settings Card */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between gap-4 shadow-xl">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                      <Cookie className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className={`${lang === 'fa' ? 'text-right' : 'text-left'}`}>
                      <h3 className="font-bold text-white text-base">{tabTranslations[lang].manageCookies}</h3>
                      <span className="text-[10px] text-slate-400 block">{t('cookieModalSubtitle')}</span>
                    </div>
                  </div>
                  <p className={`text-xs text-slate-400 leading-relaxed mt-1 ${lang === 'fa' ? 'text-right' : 'text-left'}`}>
                    {tabTranslations[lang].cookieDesc}
                  </p>
                </div>

                <div className="space-y-3 mt-2">
                  <div className={`text-xs font-medium text-slate-400 bg-slate-950/50 border border-slate-800/80 px-3 py-2 rounded-lg inline-block w-full ${lang === 'fa' ? 'text-right' : 'text-left'}`}>
                    {cookieContent ? tabTranslations[lang].cookieConfigured : tabTranslations[lang].cookieNotConfigured}
                  </div>
                  <button
                    onClick={() => setIsCookieModalOpen(true)}
                    className="w-full py-2.5 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 hover:border-indigo-500/30 rounded-xl text-xs font-bold text-indigo-400 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Cookie className="w-4 h-4" />
                    {t('cookieSettings').toUpperCase()}
                  </button>
                </div>
              </div>

              {/* 3. Telegram Bot Activation Card */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between gap-4 shadow-xl">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${telegramStatus?.running ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'}`}>
                      <Send className={`w-5 h-5 ${telegramStatus?.running ? 'animate-bounce' : ''}`} />
                    </div>
                    <div className={`${lang === 'fa' ? 'text-right' : 'text-left'}`}>
                      <h3 className="font-bold text-white text-base">{tabTranslations[lang].manageTelegram}</h3>
                      <span className="text-[10px] text-slate-400 block">{t('tgModalSubtitle')}</span>
                    </div>
                  </div>
                  <p className={`text-xs text-slate-400 leading-relaxed mt-1 ${lang === 'fa' ? 'text-right' : 'text-left'}`}>
                    {tabTranslations[lang].tgDesc}
                  </p>
                </div>

                <div className="space-y-3 mt-2">
                  <div className={`text-xs font-medium px-3 py-2 rounded-lg w-full ${telegramStatus?.running ? 'text-emerald-400 bg-emerald-950/20 border border-emerald-900/30' : 'text-slate-400 bg-slate-950/50 border border-slate-800/80'} ${lang === 'fa' ? 'text-right' : 'text-left'}`}>
                    {telegramStatus?.running ? `${tabTranslations[lang].tgStatusRunning} (${telegramStatus.botUsername || ''})` : tabTranslations[lang].tgStatusStopped}
                  </div>
                  <button
                    onClick={() => setIsTelegramModalOpen(true)}
                    className={`w-full py-2.5 border rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      telegramStatus?.running 
                        ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 hover:border-emerald-500/30 text-emerald-400' 
                        : 'bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/20 hover:border-indigo-500/30 text-indigo-400'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    {t('telegramBot').toUpperCase()}
                  </button>
                </div>
              </div>

              {/* 4. Cloudflare D1 Database Card */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between gap-4 shadow-xl">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${cfStatus?.connected ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'}`}>
                      <Cloud className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div className={`${lang === 'fa' ? 'text-right' : 'text-left'}`}>
                      <h3 className="font-bold text-white text-base">{tabTranslations[lang].manageCloudflare}</h3>
                      <span className="text-[10px] text-cyan-400/80 block">Cloudflare D1 Database</span>
                    </div>
                  </div>
                  <p className={`text-xs text-slate-400 leading-relaxed mt-1 ${lang === 'fa' ? 'text-right' : 'text-left'}`}>
                    {tabTranslations[lang].cloudflareDesc}
                  </p>
                </div>

                <div className="space-y-3 mt-2">
                  <div className={`text-xs font-medium px-3 py-2 rounded-lg w-full ${cfStatus?.connected ? 'text-cyan-400 bg-cyan-950/20 border border-cyan-900/30' : 'text-slate-400 bg-slate-950/50 border border-slate-800/80'} ${lang === 'fa' ? 'text-right' : 'text-left'}`}>
                    {cfStatus?.connected ? (
                      <span className="flex items-center justify-between">
                        <span>{tabTranslations[lang].cfStatusConnected}</span>
                        <span className="text-[10px] font-mono opacity-80">{cfStatus.latencyMs}ms</span>
                      </span>
                    ) : (
                      tabTranslations[lang].cfStatusDisconnected
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsCloudflareModalOpen(true)}
                      className={`flex-1 py-2.5 border rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        cfStatus?.connected 
                          ? 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/20 hover:border-cyan-500/30 text-cyan-400' 
                          : 'bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/20 hover:border-indigo-500/30 text-indigo-400'
                      }`}
                    >
                      <Database className="w-4 h-4" />
                      {lang === 'fa' ? 'پیکربندی کلودفلر' : 'Cloudflare D1'}
                    </button>
                    {cfStatus?.connected && (
                      <button
                        onClick={handleSyncCloudflareNow}
                        disabled={isSyncingCf}
                        title={lang === 'fa' ? 'همگام‌سازی اطلاعات' : 'Sync data'}
                        className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-xl border border-slate-700 transition-colors flex items-center justify-center"
                      >
                        <RefreshCw className={`w-4 h-4 ${isSyncingCf ? 'animate-spin' : ''}`} />
                      </button>
                    )}
                  </div>
                  {cfSyncSuccess && (
                    <div className="text-[11px] text-cyan-400 text-center font-medium">
                      {cfSyncSuccess}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5 pt-6 mt-4">
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
                const form = e.target as any;
                const months = parseInt(form.durationDays.value);
                const usages = parseInt(form.maxUsages.value);
                const res = await fetch('/api/gifts', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ durationDays: months, maxUsages: usages })
                });
                const data = await res.json();
                if (data.success) {
                  alert("Gift Code created: " + data.id + "\n\nTelegram Link: https://t.me/" + telegramBotUsername.replace("@", "") + "?start=" + data.id);
                  loadGifts();
                }
              }} className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 w-full text-left" dir="ltr">
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Duration (Days)</label>
                  <input type="number" name="durationDays" min="1" max="365" defaultValue="30" className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono text-slate-200" required />
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
                        <td className="px-5 py-4 text-sm font-mono text-pink-400 font-medium">https://t.me/{telegramBotUsername.replace("@", "")}?start={gift.id}</td>
                        <td className="px-5 py-4 text-sm font-mono text-slate-300">{gift.durationDays} Days</td>
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
      </main>



      {/* Floating Bottom Navigation Tab Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 px-4 sm:px-6 py-2.5 rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.6),_0_0_25px_rgba(99,102,241,0.15)] flex items-center gap-3 sm:gap-6 transition-all duration-300">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'home' 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 border border-indigo-500/50' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>{tabTranslations[lang].home}</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'users' 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 border border-indigo-500/50' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{tabTranslations[lang].users}</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'settings' 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 border border-indigo-500/50' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>{tabTranslations[lang].settings}</span>
        </button>
      </div>

      <AnimatePresence>
        {isCookieModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-indigo-600/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 shrink-0">
                    <Cookie className="w-5 h-5" />
                  </div>
                  <div className={lang === 'fa' ? 'text-right' : 'text-left'}>
                    <h3 className="text-base sm:text-lg font-bold text-white">{t('cookieModalTitle')}</h3>
                    <p className="text-[10px] sm:text-xs text-slate-400">{t('cookieModalSubtitle')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCookieModalOpen(false)}
                  className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 flex-1 flex flex-col gap-4 overflow-y-auto">
                <div className={`text-xs text-slate-400 bg-slate-950/40 border border-slate-800/60 p-4 rounded-xl leading-relaxed ${lang === 'fa' ? 'text-right' : 'text-left'}`}>
                  {lang === 'fa' ? (
                    <>
                      <strong className="text-indigo-400">راهنما:</strong> محتوای کوکی صادر شده از افزونه‌های مرورگر (مانند <code className="bg-slate-800 px-1.5 py-0.5 rounded text-white text-[10px]">Get cookies.txt LOCALLY</code> یا سایر افزونه‌های کوکی استاندارد) را کپی کرده و در کادر زیر قرار دهید.
                      <br />
                      <span className="text-emerald-400 font-semibold">پشتیبانی از چند پلتفرم:</span> شما می‌توانید کوکی‌های چندین پلتفرم مختلف (مانند یوتیوب، اینستاگرام، تیک‌تاک و غیره) را به صورت همزمان یا پشت سر هم در این کادر قرار دهید تا تمامی آنها روی سرور ذخیره شده و به درستی اعمال شوند.
                    </>
                  ) : lang === 'en' ? (
                    <>
                      <strong className="text-indigo-400">Guide:</strong> Copy the cookie content exported from browser extensions (like <code className="bg-slate-800 px-1.5 py-0.5 rounded text-white text-[10px]">Get cookies.txt LOCALLY</code> or any standard cookies extension) and paste it below.
                      <br />
                      <span className="text-emerald-400 font-semibold">Multi-platform support:</span> You can paste cookies for multiple platforms (YouTube, Instagram, TikTok, etc.) together or sequentially in this box to store them all on the server.
                    </>
                  ) : (
                    <>
                      <strong className="text-indigo-400">Руководство:</strong> Скопируйте содержимое куки, экспортированное из расширений браузера (например, <code className="bg-slate-800 px-1.5 py-0.5 rounded text-white text-[10px]">Get cookies.txt LOCALLY</code> или любого стандартного расширения), и вставьте его ниже.
                      <br />
                      <span className="text-emerald-400 font-semibold">Мультиплатформенная поддержка:</span> Вы можете вставлять куки для нескольких платформ (YouTube, Instagram, TikTok и т. д.) вместе или последовательно в это поле.
                    </>
                  )}
                </div>

                <div className="flex-1 flex flex-col min-h-[250px]">
                  <textarea
                    value={cookieContent}
                    onChange={(e) => setCookieContent(e.target.value)}
                    placeholder="# Netscape HTTP Cookie File&#10;.youtube.com&#9;TRUE&#9;/&#9;TRUE&#9;1818864392&#9;PREF&#9;..."
                    className="w-full flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-300 font-mono text-xs p-4 rounded-xl resize-none outline-none text-left"
                    dir="ltr"
                  />
                </div>

                {cookieStatus && (
                  <div className={`p-4 rounded-xl flex items-center gap-3 text-sm ${
                    cookieStatus.type === 'success' ? 'bg-emerald-950/40 border border-emerald-900/50 text-emerald-200' : 'bg-red-950/40 border border-red-900/50 text-red-200'
                  }`}>
                    {cookieStatus.type === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                    )}
                    <span>{cookieStatus.message}</span>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-6 bg-slate-950/50 border-t border-slate-800 flex items-center justify-between gap-3">
                <button
                  onClick={() => setIsCookieModalOpen(false)}
                  className="px-4 sm:px-5 py-3 sm:py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer min-h-[44px] sm:min-h-0"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleSaveCookies}
                  disabled={isSavingCookies}
                  className="px-5 sm:px-6 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg min-h-[44px] sm:min-h-0"
                >
                  {isSavingCookies ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('saving')}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {t('saveCookiesBtn')}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isTelegramModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-indigo-600/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 shrink-0">
                    <Send className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div className={lang === 'fa' ? 'text-right' : 'text-left'}>
                    <h3 className="text-base sm:text-lg font-bold text-white">{t('tgModalTitle')}</h3>
                    <p className="text-[10px] sm:text-xs text-slate-400">{t('tgModalSubtitle')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsTelegramModalOpen(false)}
                  className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 flex-1 flex flex-col gap-5 overflow-y-auto">
                
                {/* Live Status Indicator */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-950/60 border border-slate-800 rounded-xl gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-sans">{t('tgCurrentStatus')}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${telegramStatus?.running ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                      <span className={`text-xs font-bold ${telegramStatus?.running ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {telegramStatus?.running ? t('tgStatusConnected') : t('tgStatusDisconnected')}
                      </span>
                    </div>
                  </div>
                  {telegramStatus?.running && telegramStatus.botUsername && (
                    <div className="flex items-center gap-2 text-xs font-mono bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg text-indigo-400">
                      <span>{t('tgBotId')}</span>
                      <a href={`https://t.me/${telegramStatus.botUsername.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="hover:underline text-indigo-300 font-bold">
                        {telegramStatus.botUsername}
                      </a>
                    </div>
                  )}
                </div>

                {/* Connection Error Message */}
                {telegramStatus?.error && (
                  <div className={`p-4 bg-red-950/40 border border-red-900/50 text-red-200 text-xs sm:text-sm rounded-xl flex items-center gap-3 ${lang === 'fa' ? 'text-right' : 'text-left'}`}>
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                    <span><b>{t('tgLaunchError')}:</b> {telegramStatus.error}</span>
                  </div>
                )}

                {/* Instructions Block */}
                <div className={`text-xs text-slate-300 bg-indigo-950/30 border border-indigo-900/30 p-4 rounded-xl leading-relaxed space-y-2`} dir={lang === 'fa' ? 'rtl' : 'ltr'}>
                  {lang === 'fa' ? (
                    <>
                      <div className="flex items-center gap-1 text-indigo-400 font-bold justify-start">
                        <HelpCircle className="w-4 h-4" />
                        <span>راهنمای ساخت ربات تلگرام در ۲ دقیقه:</span>
                      </div>
                      <ol className="list-decimal list-inside space-y-1.5 text-slate-300 mr-1 text-right">
                        <li>در تلگرام خود وارد ربات رسمی <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline font-bold font-mono">@BotFather</a> شوید.</li>
                        <li>دستور <code className="bg-slate-900/80 px-1.5 py-0.5 rounded text-white font-mono text-[10px]">/newbot</code> را بنویسید و بفرستید.</li>
                        <li>یک نام برای ربات (مثلا <code>My Downloader</code>) و سپس یک یوزرنیم انگلیسی که با <code>bot</code> تمام شود بفرستید.</li>
                        <li>پدرِ ربات‌ها به شما یک <b>توکن طولانی</b> (HTTP API Token) می‌دهد؛ آن را کپی کرده و در کادر زیر قرار دهید.</li>
                      </ol>
                    </>
                  ) : lang === 'en' ? (
                    <>
                      <div className="flex items-center gap-1 text-indigo-400 font-bold justify-start">
                        <HelpCircle className="w-4 h-4" />
                        <span>How to build a Telegram Bot in 2 minutes:</span>
                      </div>
                      <ol className="list-decimal list-inside space-y-1.5 text-slate-300 ml-1 text-left">
                        <li>Search and open official <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline font-bold font-mono">@BotFather</a> in Telegram.</li>
                        <li>Type and send <code className="bg-slate-900/80 px-1.5 py-0.5 rounded text-white font-mono text-[10px]">/newbot</code>.</li>
                        <li>Choose a name (e.g., <code>My Downloader</code>) and then an English username ending in <code>bot</code>.</li>
                        <li>BotFather will give you a **long token** (HTTP API Token); copy and paste it below.</li>
                      </ol>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1 text-indigo-400 font-bold justify-start">
                        <HelpCircle className="w-4 h-4" />
                        <span>Как создать Telegram-бота за 2 минуты:</span>
                      </div>
                      <ol className="list-decimal list-inside space-y-1.5 text-slate-300 ml-1 text-left">
                        <li>Найдите и откройте официального бота <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline font-bold font-mono">@BotFather</a> в Telegram.</li>
                        <li>Напишите и отправьте <code className="bg-slate-900/80 px-1.5 py-0.5 rounded text-white font-mono text-[10px]">/newbot</code>.</li>
                        <li>Выберите имя (например, <code>My Downloader</code>) и английское имя пользователя, оканчивающееся на <code>bot</code>.</li>
                        <li>BotFather предоставит вам **длинный токен** (HTTP API Token); скопируйте и вставьте его ниже.</li>
                      </ol>
                    </>
                  )}
                </div>

                {/* Token Input Form */}
                <div className={`space-y-2 ${lang === 'fa' ? 'text-right' : 'text-left'}`}>
                  <label className="text-xs font-bold text-slate-300 block">{t('tgTokenLabel')}</label>
                  <input
                    type="text"
                    value={telegramToken}
                    onChange={(e) => setTelegramToken(e.target.value)}
                    placeholder="123456789:AAFg8Y_ExampleToken..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-300 font-mono text-sm p-3.5 rounded-xl outline-none text-left"
                    dir="ltr"
                  />
                  <p className="text-[10px] text-slate-500">{t('tgTokenHint')}</p>
                </div>

                {telegramSaveStatus && (
                  <div className={`p-4 rounded-xl flex items-center gap-3 text-sm ${
                    telegramSaveStatus.type === 'success' ? 'bg-emerald-950/40 border border-emerald-900/50 text-emerald-200' : 'bg-red-950/40 border border-red-900/50 text-red-200'
                  }`}>
                    {telegramSaveStatus.type === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                    )}
                    <span>{telegramSaveStatus.message}</span>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-6 bg-slate-950/50 border-t border-slate-800 flex items-center justify-between gap-3">
                <button
                  onClick={() => setIsTelegramModalOpen(false)}
                  className="px-4 sm:px-5 py-3 sm:py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer min-h-[44px] sm:min-h-0"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleSaveTelegram}
                  disabled={isSavingTelegram}
                  className="px-5 sm:px-6 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg min-h-[44px] sm:min-h-0"
                >
                  {isSavingTelegram ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('connecting')}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {t('saveTelegramBtn')}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isCloudflareModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-cyan-600/10 border border-cyan-500/20 rounded-xl flex items-center justify-center text-cyan-400 shrink-0">
                    <Cloud className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className={lang === 'fa' ? 'text-right' : 'text-left'}>
                    <h3 className="text-base sm:text-lg font-bold text-white">{t('cloudflareTitle')}</h3>
                    <p className="text-[10px] sm:text-xs text-slate-400">{t('cloudflareSubtitle')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCloudflareModalOpen(false)}
                  className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 flex-1 flex flex-col gap-5 overflow-y-auto" dir={lang === 'fa' ? 'rtl' : 'ltr'}>
                
                {/* Live Status Indicator */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-950/60 border border-slate-800 rounded-xl gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-sans">{lang === 'fa' ? 'وضعیت اتصال:' : 'Connection Status:'}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${cfStatus?.connected ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`} />
                      <span className={`text-xs font-bold ${cfStatus?.connected ? 'text-cyan-400' : 'text-slate-400'}`}>
                        {cfStatus?.connected ? t('cloudflareStatusConnected') : t('cloudflareStatusDisconnected')}
                      </span>
                    </div>
                  </div>
                  {cfStatus?.connected && (
                    <div className="flex items-center gap-2 text-xs font-mono bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-lg text-cyan-300">
                      <span>DB: {cfStatus.databaseName || cfStatus.databaseId?.slice(0, 8)}</span>
                      <span className="text-slate-500">•</span>
                      <span>{cfStatus.latencyMs}ms</span>
                    </div>
                  )}
                </div>

                {/* Connection Error Message */}
                {cfStatus?.error && (
                  <div className={`p-4 bg-red-950/40 border border-red-900/50 text-red-200 text-xs sm:text-sm rounded-xl flex items-center gap-3 ${lang === 'fa' ? 'text-right' : 'text-left'}`}>
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                    <span><b>{lang === 'fa' ? 'خطا در اتصال' : 'Connection Error'}:</b> {cfStatus.error}</span>
                  </div>
                )}

                {/* Quick 1-2-3 Step Guide */}
                <div className="text-xs text-slate-300 bg-cyan-950/20 border border-cyan-900/30 p-4 rounded-xl leading-relaxed space-y-2.5">
                  <div className="flex items-center gap-1.5 text-cyan-400 font-bold justify-start">
                    <Sparkles className="w-4 h-4" />
                    <span>{lang === 'fa' ? 'راه‌اندازی کاملاً خودکار دیتابیس کلودفلر:' : '1-Click Automated Cloudflare D1 Setup:'}</span>
                  </div>
                  {lang === 'fa' ? (
                    <ol className="list-decimal list-inside space-y-1 text-slate-300 mr-1 text-right">
                      <li>روی دکمه <b>«گرفتن توکن از کلودفلر»</b> کلیک کنید.</li>
                      <li>در صفحه کلودفلر فقط روی <b>Continue to summary</b> و سپس <b>Create Token</b> کلیک کنید.</li>
                      <li>توکن تولید شده را در کادر زیر قرار داده و دکمه <b>«اتصال خودکار و راه‌اندازی دیتابیس»</b> را بزنید!</li>
                    </ol>
                  ) : (
                    <ol className="list-decimal list-inside space-y-1 text-slate-300 ml-1 text-left">
                      <li>Click <b>"Get Cloudflare Token"</b> to open pre-filled token creator.</li>
                      <li>In Cloudflare, click <b>Continue to summary</b> and then <b>Create Token</b>.</li>
                      <li>Paste the token below and click <b>"Auto-Connect & Setup D1"</b>!</li>
                    </ol>
                  )}
                </div>

                {/* Main 1-Field Token Form */}
                <div className="space-y-4">
                  <div className={`space-y-2 ${lang === 'fa' ? 'text-right' : 'text-left'}`}>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200 block flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>{t('cloudflareTokenLabel')}</span>
                      </label>
                      <a
                        href="https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=%5B%7B%22key%22%3A%22d1%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22account_settings%22%2C%22type%22%3A%22read%22%7D%5D&name=Telegram+Bot+D1+Token"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-cyan-300 hover:text-cyan-200 flex items-center gap-1.5 bg-cyan-900/40 hover:bg-cyan-800/50 border border-cyan-700/60 px-3 py-1.5 rounded-lg transition-all shadow-sm"
                        title={t('cloudflareGetTokenHint')}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{t('cloudflareGetToken')}</span>
                      </a>
                    </div>
                    <input
                      type="password"
                      value={cfApiToken}
                      onChange={(e) => setCfApiToken(e.target.value)}
                      placeholder={cfStatus?.maskedToken || "Paste your Cloudflare API Token here (e.g. v-xxxxxxxxxxxxxxxxxxxx)"}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-slate-200 font-mono text-sm p-3.5 rounded-xl outline-none text-left"
                      dir="ltr"
                    />
                    <p className="text-[11px] text-slate-400">
                      {t('cloudflareAutoSetupDesc')}
                    </p>
                  </div>

                  {/* Migrate Checkbox */}
                  <label className="flex items-center gap-2.5 p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={cfMigrateData}
                      onChange={(e) => setCfMigrateData(e.target.checked)}
                      className="w-4 h-4 text-cyan-600 bg-slate-900 border-slate-700 rounded focus:ring-cyan-500 cursor-pointer"
                    />
                    <span className="text-xs text-slate-300 font-medium">
                      {t('cloudflareMigrateLabel')}
                    </span>
                  </label>

                  {/* Advanced Settings Toggle */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowCfAdvanced(!showCfAdvanced)}
                      className="text-xs font-bold text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {showCfAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      <span>{t('cloudflareAdvancedSettings')}</span>
                    </button>

                    {showCfAdvanced && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 pt-3 mt-2 border-t border-slate-800/80"
                      >
                        <div className={`space-y-1.5 ${lang === 'fa' ? 'text-right' : 'text-left'}`}>
                          <label className="text-xs font-bold text-slate-300 block">{t('cloudflareAccountIdLabel')}</label>
                          <input
                            type="text"
                            value={cfAccountId}
                            onChange={(e) => setCfAccountId(e.target.value)}
                            placeholder="e.g. 1a2b3c4d5e6f7g8h9i0j... (Optional - Auto Detected)"
                            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-slate-300 font-mono text-sm p-3.5 rounded-xl outline-none text-left"
                            dir="ltr"
                          />
                        </div>

                        {/* Actions for fetching or creating D1 manually */}
                        <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleFetchDatabases}
                            disabled={isFetchingDbs || !cfApiToken || !cfAccountId}
                            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-cyan-300 rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                          >
                            {isFetchingDbs ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            {t('cloudflareAutoFetch')}
                          </button>
                          <button
                            type="button"
                            onClick={handleCreateDatabase}
                            disabled={isCreatingDb || !cfApiToken || !cfAccountId}
                            className="px-3.5 py-2 bg-cyan-950/60 hover:bg-cyan-900/60 disabled:opacity-50 text-cyan-300 border border-cyan-800/60 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            {isCreatingDb ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <HardDrive className="w-3.5 h-3.5" />}
                            {t('cloudflareCreateNew')}
                          </button>
                        </div>

                        {cfAvailableDbs.length > 0 && (
                          <div className={`space-y-1.5 ${lang === 'fa' ? 'text-right' : 'text-left'}`}>
                            <label className="text-xs font-bold text-slate-300 block">{lang === 'fa' ? 'انتخاب از دیتابیس‌های موجود:' : 'Select Available D1 Database:'}</label>
                            <select
                              value={cfDatabaseId}
                              onChange={(e) => {
                                setCfDatabaseId(e.target.value);
                                const sel = cfAvailableDbs.find(d => d.uuid === e.target.value);
                                if (sel) setCfDatabaseName(sel.name);
                              }}
                              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 text-slate-200 text-sm p-3.5 rounded-xl outline-none"
                            >
                              {cfAvailableDbs.map(d => (
                                <option key={d.uuid} value={d.uuid}>
                                  {d.name} ({d.uuid.slice(0, 8)}...)
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className={`space-y-1.5 ${lang === 'fa' ? 'text-right' : 'text-left'}`}>
                          <label className="text-xs font-bold text-slate-300 block">{t('cloudflareDatabaseIdLabel')}</label>
                          <input
                            type="text"
                            value={cfDatabaseId}
                            onChange={(e) => setCfDatabaseId(e.target.value)}
                            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (Optional - Auto Created)"
                            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-slate-300 font-mono text-sm p-3.5 rounded-xl outline-none text-left"
                            dir="ltr"
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>

                {cfSaveStatus && (
                  <div className={`p-4 rounded-xl flex items-center gap-3 text-sm ${
                    cfSaveStatus.type === 'success' ? 'bg-emerald-950/40 border border-emerald-900/50 text-emerald-200' : 'bg-red-950/40 border border-red-900/50 text-red-200'
                  }`}>
                    {cfSaveStatus.type === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                    )}
                    <span>{cfSaveStatus.message}</span>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-6 bg-slate-950/50 border-t border-slate-800 flex items-center justify-between gap-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsCloudflareModalOpen(false)}
                    className="px-4 sm:px-5 py-3 sm:py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer min-h-[44px] sm:min-h-0"
                  >
                    {t('cancel')}
                  </button>
                  {cfStatus?.connected && (
                    <button
                      onClick={handleDisconnectCloudflare}
                      className="px-3 sm:px-4 py-3 sm:py-2.5 bg-red-950/40 hover:bg-red-900/40 border border-red-800/50 text-red-400 rounded-xl text-xs font-bold transition-colors cursor-pointer min-h-[44px] sm:min-h-0"
                    >
                      {t('cloudflareDisconnect')}
                    </button>
                  )}
                </div>
                <button
                  onClick={handleAutoSetupCloudflare}
                  disabled={isTestingCf}
                  className="px-5 sm:px-6 py-3 sm:py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-900/20 min-h-[44px] sm:min-h-0"
                >
                  {isTestingCf ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('saving')}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-cyan-200" />
                      <span>{t('cloudflareAutoSetupBtn')}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
