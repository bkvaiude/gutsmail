#!/usr/bin/env node

/**
 * Environment Configuration Verification Script
 *
 * This script checks if all required environment variables are properly configured.
 * Run with: node scripts/verify-env.js
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkEnvFile() {
  const envPath = path.join(process.cwd(), '.env');

  log('\n🔍 Checking Environment Configuration...\n', 'cyan');

  if (!fs.existsSync(envPath)) {
    log('❌ ERROR: .env file not found!', 'red');
    log('📝 Please create a .env file based on .env.example', 'yellow');
    process.exit(1);
  }

  log('✅ .env file exists', 'green');

  // Read .env file
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envVars = {};

  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').replace(/^["']|["']$/g, '');
      if (key) envVars[key] = value;
    }
  });

  // Required environment variables
  const required = [
    { key: 'DATABASE_URL', placeholder: 'file:./dev.db', required: true },
    { key: 'NEXTAUTH_URL', placeholder: 'http://localhost:3000', required: true },
    { key: 'NEXTAUTH_SECRET', placeholder: 'your-secret-here-change-in-production', required: true },
    { key: 'GOOGLE_CLIENT_ID', placeholder: 'your-google-client-id', required: true },
    { key: 'GOOGLE_CLIENT_SECRET', placeholder: 'your-google-client-secret', required: true },
    { key: 'GEMINI_API_KEY', placeholder: 'your-gemini-api-key', required: true },
  ];

  let hasErrors = false;
  let hasWarnings = false;

  log('\n📋 Checking required variables:\n');

  required.forEach(({ key, placeholder, required: isRequired }) => {
    const value = envVars[key];

    if (!value) {
      log(`❌ ${key}: Missing`, 'red');
      hasErrors = true;
    } else if (value.includes('your-') || value.includes('REPLACE_WITH') || value === placeholder) {
      if (key === 'DATABASE_URL' && value === 'file:./dev.db') {
        // DATABASE_URL can use the default for development
        log(`✅ ${key}: ${value} (using SQLite for development)`, 'green');
      } else if (key === 'NEXTAUTH_URL' && value === 'http://localhost:3000') {
        // NEXTAUTH_URL default is fine for development
        log(`✅ ${key}: ${value}`, 'green');
      } else {
        log(`⚠️  ${key}: Still using placeholder value`, 'yellow');
        hasWarnings = true;
      }
    } else if (key === 'NEXTAUTH_SECRET' && value.length < 32) {
      log(`⚠️  ${key}: Too short (should be at least 32 characters)`, 'yellow');
      hasWarnings = true;
    } else if (key === 'GOOGLE_CLIENT_ID' && !value.includes('.apps.googleusercontent.com')) {
      log(`⚠️  ${key}: Doesn't look like a valid Google Client ID`, 'yellow');
      hasWarnings = true;
    } else if (key === 'GEMINI_API_KEY' && value.length < 20) {
      log(`⚠️  ${key}: Doesn't look like a valid API key`, 'yellow');
      hasWarnings = true;
    } else {
      const maskedValue = value.length > 20 ? `${value.substring(0, 8)}...${value.substring(value.length - 4)}` : value;
      log(`✅ ${key}: ${maskedValue}`, 'green');
    }
  });

  // Summary
  log('\n' + '='.repeat(50) + '\n', 'blue');

  if (hasErrors) {
    log('❌ CONFIGURATION INCOMPLETE', 'red');
    log('\nPlease update your .env file with the missing values.', 'yellow');
    log('See SETUP_GUIDE.md for detailed instructions.\n', 'yellow');
    process.exit(1);
  } else if (hasWarnings) {
    log('⚠️  CONFIGURATION HAS WARNINGS', 'yellow');
    log('\nSome values appear to be placeholders or invalid.', 'yellow');
    log('Please review and update them before running the application.', 'yellow');
    log('See SETUP_GUIDE.md for detailed instructions.\n', 'yellow');
    process.exit(1);
  } else {
    log('✅ ALL CONFIGURATION CHECKS PASSED!', 'green');
    log('\nYour environment is properly configured.', 'green');
    log('You can now run: npm run dev\n', 'cyan');
    process.exit(0);
  }
}

// Run the check
try {
  checkEnvFile();
} catch (error) {
  log(`\n❌ ERROR: ${error.message}`, 'red');
  process.exit(1);
}
