#!/usr/bin/env bash
set -o errexit

echo "=== Installing Backend Python Dependencies ==="
python -m pip install --upgrade pip setuptools wheel
pip install --prefer-binary -r web_platform/backend/requirements.txt

echo "=== Build Complete ==="
echo "Frontend dist is pre-built and committed."
