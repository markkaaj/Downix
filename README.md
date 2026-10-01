# Universal Media Downloader on Wasmer Edge

This project is configured to run seamlessly on **Wasmer Edge** (`wasmer.io`), providing a high-performance Python FastAPI backend combined with `yt-dlp` and a modern Tailwind CSS frontend.

## Deployment Instructions on Wasmer.io

1. **Install Wasmer CLI** (if not already installed on your machine):
   ```bash
   curl https://get.wasmer.io -sSfL | sh
   ```

2. **Login to your Wasmer Account**:
   ```bash
   wasmer login
   ```

3. **Deploy to Wasmer Edge**:
   Navigate to the project directory and run:
   ```bash
   wasmer deploy
   ```

4. **Access your App**:
   Wasmer will provide a live URL (`https://...wasmer.app`) where your Universal Media Downloader will be online 24/7!
