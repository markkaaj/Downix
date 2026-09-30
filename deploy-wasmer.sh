#!/usr/bin/env bash
# ==============================================================================
# Wasmer Deployment Script for Universal Media Downloader
# https://wasmer.io
# ==============================================================================

set -e

echo "🚀 Preparing deployment to Wasmer Edge (https://wasmer.io)..."

# 1. Check if Wasmer CLI is installed
if ! command -v wasmer &> /dev/null; then
    echo "⚠️  Wasmer CLI is not installed."
    echo "📦 Installing Wasmer CLI..."
    curl https://get.wasmer.io -sSfL | sh
    source ~/.wasmer/wasmer.sh || export PATH="$HOME/.wasmer/bin:$PATH"
fi

echo "✅ Wasmer CLI detected: $(wasmer --version)"

# 2. Check if logged in
echo "🔑 Checking Wasmer authentication status..."
wasmer whoami || {
    echo "👉 Please log in to your Wasmer account:"
    wasmer login
}

# 3. Choose deployment method
echo ""
echo "Select deployment method:"
echo "  [1] Wasmer Edge Container (Full-Stack: Web + yt-dlp + Telegram) [RECOMMENDED]"
echo "  [2] Wasmer Edge Static Server (@wasmer/static-web-server) [Frontend only]"
read -p "Enter choice [1 or 2] (default: 1): " CHOICE
CHOICE=${CHOICE:-1}

if [ "$CHOICE" == "1" ]; then
    echo "📦 Deploying as Wasmer Edge Container..."
    wasmer deploy
elif [ "$CHOICE" == "2" ]; then
    echo "🔨 Building frontend..."
    npm run build
    echo "🌐 Deploying static assets via Wasmer WebAssembly..."
    wasmer deploy --publish-package
else
    echo "❌ Invalid choice. Aborting."
    exit 1
fi

echo ""
echo "🎉 Deployment initiated! Run 'wasmer app logs' to inspect logs."
echo "🔗 Check your dashboard at: https://wasmer.io/apps"
