#!/usr/bin/env bash
# scripts/ci/bump-build.sh
set -euo pipefail

# Increment buildNumber in package.json
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.buildNumber = (pkg.buildNumber || 0) + 1;
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
console.log('Bumped buildNumber to ' + pkg.buildNumber);
"
