#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "Starting build process..."

# 1. Install and build frontend
echo "Building frontend..."
cd alphaflow/web_platform/frontend
npm install
npm run build
cd ../../../

# 2. Install backend dependencies
echo "Installing Python dependencies..."
pip install -r alphaflow/web_platform/backend/requirements.txt

echo "Build complete!"
