FROM node:22-slim

# Install system dependencies (python3, ffmpeg, curl)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    ffmpeg \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Pre-download yt-dlp binary system-wide
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install all dependencies including build tools
RUN npm install

# Copy application files
COPY . .

# Build Vite frontend and esbuild server
RUN npm run build

# Default port
ENV PORT=3000
EXPOSE 3000

# Start server
CMD ["npm", "run", "start"]
