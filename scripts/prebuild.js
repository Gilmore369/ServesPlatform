#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Running pre-build checks...');

// Check if node_modules exists and has the required packages
const requiredPackages = ['tailwindcss', 'postcss', 'autoprefixer', 'next'];
const nodeModulesPath = path.join(__dirname, '..', 'node_modules');

for (const pkg of requiredPackages) {
  const pkgPath = path.join(nodeModulesPath, pkg);
  if (!fs.existsSync(pkgPath)) {
    console.log(`❌ Missing package: ${pkg}`);
    console.log('🔄 Reinstalling dependencies...');
    execSync('npm ci --include=dev', { stdio: 'inherit' });
    break;
  } else {
    console.log(`✅ Found package: ${pkg}`);
  }
}

console.log('✅ Pre-build checks completed!');