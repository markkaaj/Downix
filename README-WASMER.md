# راهنمای استقرار Universal Media Downloader روی Wasmer.io
# Wasmer Edge Deployment Guide

پلتفرم **Wasmer** (https://wasmer.io) یک زیرساخت مدرن ابری بر پایه وب‌اسمبلی (WebAssembly) و کانتینرهای Edge است که به شما امکان می‌دهد برنامه‌های خود را با کمترین تأخیر در سراسر جهان مستقر کنید.

این پروژه برای استقرار سریع روی Wasmer پیکربندی شده است.

---

## ⚡ روش ۱: استقرار سریع با Wasmer CLI (پیشنهادی - تمام امکانات)

این روش پروژه را همراه با Node.js، yt-dlp و ربات تلگرام به عنوان یک کانتینر در Wasmer Edge اجرا می‌کند.

### مراحل گام‌به‌گام:

1. **نصب Wasmer CLI** (در صورت عدم نصب):
   - در لینوکس / مک:
     ```bash
     curl https://get.wasmer.io -sSfL | sh
     ```
   - در ویندوز (PowerShell):
     ```powershell
     iwr https://win.wasmer.io -useb | iex
     ```

2. **ورود به حساب کاربری Wasmer**:
   ```bash
   wasmer login
   ```
   (مرورگر باز می‌شود و توکن دسترسی شما ست می‌شود).

3. **تنظیم متغیرهای محیطی و سکرت‌ها** (اختیاری برای ربات تلگرام):
   ```bash
   wasmer secret create TELEGRAM_BOT_TOKEN "توکن_ربات_شما"
   wasmer secret create TELEGRAM_API_ID "شناسه_ای‌پی‌آی"
   wasmer secret create TELEGRAM_API_HASH "هش_ای‌پی‌آی"
   ```

4. **دستور دیپلوی**:
   در ریشه پروژه دستور زیر را بزنید:
   ```bash
   wasmer deploy
   ```
   یا اجرای خودکار با اسکریپت آماده:
   ```bash
   bash deploy-wasmer.sh
   ```

5. **مشاهده وضعیت و لاگ‌ها**:
   ```bash
   wasmer app list
   wasmer app logs universal-media-downloader
   ```

---

## 🌐 روش ۲: استقرار تنها فرانت‌اند به صورت سرورلس Wasm (@wasmer/static-web-server)

اگر فقط مایلید فرانت‌اند پروژه به عنوان وب‌اسمبلی خالص با سرعت فوق‌العاده بالا اجرا شود:

1. بیلد گرفتن از پروژه:
   ```bash
   npm run build
   ```

2. انتشار پکیج و استقرار:
   ```bash
   wasmer deploy --publish-package
   ```
   این کار از فایل `wasmer.toml` و ماژول رسمی `wasmer/static-web-server` استفاده می‌کند و بدون نیاز به سرور سنتی، روی Edge بالا می‌آید.

---

## 📁 فایل‌های پیکربندی Wasmer در این پروژه

- **`wasmer.toml`**: مانیفست پکیج Wasmer و تنظیمات سرور استاتیک Wasm.
- **`app.yaml`**: تنظیمات Wasmer Edge App (تعریف پورت، اسکیلینگ و حجم دیسک).
- **`Dockerfile`**: کانتینر بهینه‌سازی شده لینوکس آلپاین شامل Node 22، FFmpeg و yt-dlp.
- **`deploy-wasmer.sh`**: اسکریپت اتوماتیک یک‌کلیکی برای ترمینال.

---

## ❓ سوالات متداول (FAQ)

### آیا yt-dlp روی Wasmer Edge کار می‌کند؟
بله، از طریق روش کانتینری (`wasmer deploy` با Dockerfile)، تمام باینری‌های لینوکس از جمله Python3، FFmpeg و yt-dlp بدون مشکل کار می‌کنند.

### پورت برنامه چیست؟
برنامه روی پورت `3000` (قابل تنظیم با متغیر محیطی `PORT`) گوش می‌دهد و Wasmer آن را به صورت خودکار به دامنه امن HTTPS متصل می‌نماید.
