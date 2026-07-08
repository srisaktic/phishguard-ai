#!/bin/bash
# PhishGuard AI — Start Server
cd "$(dirname "$0")"
echo "Starting PhishGuard AI server..."
echo "Loading models (takes ~30s on first run)..."
python3 -W ignore app.py
