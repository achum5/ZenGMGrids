#!/usr/bin/env bash
set -e
BR=$(git rev-parse --abbrev-ref HEAD)
echo "Pushing $BR..."
git push origin "$BR"
echo "Done."
