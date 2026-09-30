import os
import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yt_dlp

app = FastAPI(title="Universal Media Downloader on Wasmer", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DownloadRequest(BaseModel):
    url: str

@app.get("/", response_class=HTMLResponse)
async def read_root():
    return """
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Universal Media Downloader | Wasmer Edge</title>
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
    <header class="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-50">
        <div class="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
            <div class="flex items-center space-x-3">
                <div class="bg-gradient-to-tr from-indigo-500 to-purple-500 p-2 rounded-xl text-white shadow-lg shadow-indigo-500/20">
                    <i class="fa-solid fa-cloud-arrow-down text-lg"></i>
                </div>
                <div>
                    <h1 class="font-bold text-lg bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Media Downloader</h1>
                    <p class="text-xs text-slate-400">Powered by Wasmer Edge & yt-dlp</p>
                </div>
            </div>
            <div class="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full text-emerald-400 text-xs font-medium">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Wasmer Edge Online</span>
            </div>
        </div>
    </header>

    <main class="max-w-3xl mx-auto px-4 py-12 flex-1 w-full">
        <div class="text-center mb-10">
            <h2 class="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">Download Media from Anywhere</h2>
            <p class="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">Paste a link from YouTube, Instagram, TikTok, Twitter/X, or 1000+ supported sites to get direct download links instantly.</p>
        </div>

        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
            <form id="downloadForm" class="space-y-4">
                <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <i class="fa-solid fa-link"></i>
                    </div>
                    <input type="url" id="urlInput" required placeholder="https://www.youtube.com/watch?v=..." 
                        class="w-full pl-11 pr-4 py-3.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm transition">
                </div>
                <button type="submit" id="submitBtn" 
                    class="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium py-3.5 px-6 rounded-xl shadow-lg shadow-indigo-600/25 transition duration-200 flex items-center justify-center space-x-2">
                    <i class="fa-solid fa-magnifying-glass"></i>
                    <span>Fetch Media Info</span>
                </button>
            </form>

            <div id="loading" class="hidden mt-8 text-center py-8">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
                <p class="text-sm text-slate-400 mt-3">Fetching media details...</p>
            </div>

            <div id="resultCard" class="hidden mt-8 border border-slate-800 bg-slate-950/60 rounded-xl p-5 space-y-4">
                <div class="flex items-start space-x-4">
                    <img id="thumbnail" src="" alt="Thumbnail" class="w-32 h-20 object-cover rounded-lg bg-slate-800 shrink-0">
                    <div class="flex-1 min-w-0">
                        <h3 id="mediaTitle" class="font-semibold text-slate-200 truncate text-base"></h3>
                        <p id="mediaUploader" class="text-xs text-slate-400 mt-1"></p>
                        <p id="mediaDuration" class="text-xs text-indigo-400 mt-1 font-mono"></p>
                    </div>
                </div>
                <div id="formatsList" class="space-y-2 pt-2 border-t border-slate-800/80">
                    <!-- Formats injected here -->
                </div>
            </div>

            <div id="errorBox" class="hidden mt-6 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
                <i class="fa-solid fa-circle-exclamation mr-2"></i>
                <span id="errorText"></span>
            </div>
        </div>
    </main>

    <footer class="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <p>Universal Media Downloader deployed on <a href="https://wasmer.io" target="_blank" class="text-indigo-400 hover:underline">Wasmer Edge</a></p>
    </footer>

    <script>
        const form = document.getElementById('downloadForm');
        const urlInput = document.getElementById('urlInput');
        const submitBtn = document.getElementById('submitBtn');
        const loading = document.getElementById('loading');
        const resultCard = document.getElementById('resultCard');
        const errorBox = document.getElementById('errorBox');
        const errorText = document.getElementById('errorText');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const url = urlInput.value.trim();
            if (!url) return;

            loading.classList.remove('hidden');
            resultCard.classList.add('hidden');
            errorBox.classList.add('hidden');
            submitBtn.disabled = true;

            try {
                const res = await fetch('/api/info', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                });
                const data = await res.json();

                if (!res.ok) throw new Error(data.detail || 'Failed to fetch media info');

                document.getElementById('thumbnail').src = data.thumbnail || '';
                document.getElementById('mediaTitle').textContent = data.title || 'Unknown Title';
                document.getElementById('mediaUploader').textContent = 'Channel: ' + (data.uploader || 'Unknown');
                document.getElementById('mediaDuration').textContent = 'Duration: ' + (data.duration_string || 'N/A');

                const formatsList = document.getElementById('formatsList');
                formatsList.innerHTML = '<h4 class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Available Downloads</h4>';

                if (data.formats && data.formats.length > 0) {
                    data.formats.forEach(f => {
                        const a = document.createElement('a');
                        a.href = f.url;
                        a.target = '_blank';
                        a.className = 'flex items-center justify-between bg-slate-900 hover:bg-slate-855 border border-slate-800 hover:border-slate-700 p-3 rounded-lg text-sm transition';
                        a.innerHTML = `
                            <span class="font-medium text-slate-200"><i class="fa-solid fa-file-arrow-down mr-2 text-indigo-400"></i>${f.format_note || f.ext || 'Download'} (${f.ext})</span>
                            <span class="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded font-mono">Download <i class="fa-solid fa-arrow-up-right-from-square ml-1 text-[10px]"></i></span>
                        `;
                        formatsList.appendChild(a);
                    });
                } else {
                    formatsList.innerHTML += '<p class="text-xs text-slate-500">No direct formats found.</p>';
                }

                resultCard.classList.remove('hidden');
            } catch (err) {
                errorText.textContent = err.message;
                errorBox.classList.remove('hidden');
            } finally {
                loading.classList.add('hidden');
                submitBtn.disabled = false;
            }
        });
    </script>
</body>
</html>
    """

@app.post("/api/info")
async def get_media_info(req: DownloadRequest):
    try:
        ydl_opts = {
            'format': 'best',
            'skip_download': True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(req.url, download=False)
            
            formats = []
            if 'formats' in info:
                for f in info['formats']:
                    if f.get('url') and f.get('ext') in ['mp4', 'webm', 'm4a', 'mp3']:
                        formats.append({
                            'format_id': f.get('format_id'),
                            'format_note': f.get('format_note', f.get('resolution', 'Standard')),
                            'ext': f.get('ext'),
                            'url': f.get('url')
                        })
                # Limit formats to top 5
                formats = formats[:5]
            elif info.get('url'):
                formats.append({
                    'format_id': 'default',
                    'format_note': 'Best Quality',
                    'ext': info.get('ext', 'mp4'),
                    'url': info.get('url')
                })

            return {
                "title": info.get('title'),
                "thumbnail": info.get('thumbnail'),
                "uploader": info.get('uploader'),
                "duration_string": info.get('duration_string'),
                "formats": formats
            }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8080, reload=False)
