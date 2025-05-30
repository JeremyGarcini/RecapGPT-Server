#!/usr/bin/env bash
# exit on error
set -o errexit

echo "🏗️ Starting Render build process..."

# Install Node.js dependencies
echo "📦 Installing npm dependencies..."
npm install

# Install Python and yt-dlp
echo "🐍 Installing Python and yt-dlp..."
apt-get update
apt-get install -y python3 python3-pip ffmpeg
pip3 install yt-dlp

# Verify installations
echo "✅ Verifying installations..."
node --version
python3 --version
yt-dlp --version
ffmpeg -version

echo "🎉 Build completed successfully!" 