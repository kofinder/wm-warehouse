#!/usr/bin/env bash
set -euo pipefail
echo "Node: $(node --version)"
echo "npm:  $(npm --version)"
echo "Path: $(command -v node)"
node -e 'const p=process.versions.node.split(".").map(Number); if (p[0] !== 14 || p[1] < 18) { console.error("Expected Node 14.18+ (tested target: 14.20.1). Run: nvm use 14.20.1"); process.exit(1); } console.log("OK: Node 14 runtime meets the selected toolchain requirement.");'
