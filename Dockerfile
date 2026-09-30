# ==============================================================================
# Dockerfile for Wasmer Edge Deployment (https://wasmer.io)
# Multi-stage build for Universal Media Downloader & Telegram Bot
# ==============================================================================

FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --prefer-offline --no-audit

# Copy source and build frontend
COPY . .
RUN npm run build

# ==============================================================================
# Production Runtime Image
# ==============================================================================
FROM node:22-alpine

WORKDIR /app

# Install Python, FFmpeg, curl and dependencies required for yt-dlp
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    curl \
    bash \
    ca-certificates

# Install yt-dlp binary
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# Verify yt-dlp installation
RUN yt-dlp --version

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
ENV PATH="/usr/local/bin:${PATH}"

# Copy package manifests & install production deps only
COPY package*.json ./
RUN npm ci --only=production --prefer-offline --no-audit && \
    npm install -g tsx

# Copy built frontend and server files
COPY --from=builder /app/dist ./dist
COPY server.ts ./
COPY wasmer.toml ./
COPY app.yaml ./

# Create downloads and data directories
RUN mkdir -p /tmp/downloads /app/data && chmod 777 /tmp/downloads /app/data

EXPOSE 3000

# Start server with tsx
CMD ["tsx", "server.ts"]
