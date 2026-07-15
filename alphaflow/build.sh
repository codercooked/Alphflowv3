#!/usr/bin/env bash
set -o errexit

echo "=== Installing Backend Python Dependencies ==="
pip install -r web_platform/backend/requirements.txt

echo "=== Build Complete ==="
echo "Frontend dist is pre-built and committed."
