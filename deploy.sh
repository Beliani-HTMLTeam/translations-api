#!/usr/bin/env bash
# Simple deploy script for AlmaLinux - bun only
# Place this on the server in the repo directory and make it executable: chmod +x deploy.sh

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
BRANCH=${1:-main}

# Ensure bun is in PATH for non-interactive shells
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

echo "Deploying branch: $BRANCH in $REPO_DIR"

cd "$REPO_DIR"

# fetch & reset to remote branch
git fetch origin $BRANCH
git reset --hard origin/$BRANCH

# install dependencies with bun
if command -v bun >/dev/null 2>&1; then
  echo "Installing backend dependencies with bun..."
  bun install
else
  echo "ERROR: bun is required but not found. Please install bun: https://bun.sh"
  exit 1
fi

# build frontend
echo "Building frontend..."
cd frontend
bun install
echo "Building for production..."
bun run build:prod
cd ..

# reload via pm2
if command -v pm2 >/dev/null 2>&1; then
  echo "Reloading pm2 process..."
  
  # Load environment variables checks
  if [ -f .env ]; then
    set -a
    source .env
    set +a
  fi
  
  # Check if zrok is working/enabled, if not try to enable
  if command -v zrok >/dev/null 2>&1; then
      if ! zrok status >/dev/null 2>&1; then
          if [ -n "${ZROK_ENABLE_TOKEN:-}" ]; then
              echo "Enabling zrok environment..."
              zrok enable "$ZROK_ENABLE_TOKEN"
          else
              echo "WARNING: zrok not enabled and ZROK_ENABLE_TOKEN not found in .env"
          fi
      fi
  fi

  # Hard restart to ensure config/env changes are picked up
  pm2 delete all || true
  pm2 start ecosystem.config.js
  pm2 save
else
  echo "ERROR: pm2 is required but not found. Please install pm2: bun add -g pm2"
  exit 1
fi

echo "Deploy complete"
