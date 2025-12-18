#!/usr/bin/env node
/**
 * UC-135: Basic Security Audit Script
 * 
 * Run this script to perform a basic security check of the application.
 * Usage: node scripts/security-audit.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const results = {
  passed: [],
  warnings: [],
  failed: []
};

function pass(message) {
  results.passed.push(message);
  console.log(`✅ PASS: ${message}`);
}

function warn(message) {
  results.warnings.push(message);
  console.log(`⚠️  WARN: ${message}`);
}

function fail(message) {
  results.failed.push(message);
  console.log(`❌ FAIL: ${message}`);
}

console.log('\n🔒 UC-135: Production Security Audit\n');
console.log('='.repeat(50));

// 1. Check for hardcoded secrets
console.log('\n📋 Checking for hardcoded secrets...\n');

const sensitivePatterns = [
  { pattern: /password\s*[:=]\s*["'][^"']+["']/gi, name: 'hardcoded password' },
  { pattern: /secret\s*[:=]\s*["'][a-zA-Z0-9]{10,}["']/gi, name: 'hardcoded secret' },
  { pattern: /api[_-]?key\s*[:=]\s*["'][a-zA-Z0-9]{10,}["']/gi, name: 'hardcoded API key' },
];

const filesToCheck = [];
function findJsFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !['node_modules', 'coverage', '.git'].includes(entry.name)) {
      findJsFiles(fullPath);
    } else if (entry.isFile() && /\.(js|ts|jsx|tsx)$/.test(entry.name)) {
      filesToCheck.push(fullPath);
    }
  }
}
findJsFiles(rootDir);

let secretsFound = false;
for (const file of filesToCheck) {
  const content = fs.readFileSync(file, 'utf8');
  for (const { pattern, name } of sensitivePatterns) {
    if (pattern.test(content)) {
      const relativePath = path.relative(rootDir, file);
      // Skip test files and env examples
      if (!relativePath.includes('test') && !relativePath.includes('.example')) {
        warn(`Potential ${name} in ${relativePath}`);
        secretsFound = true;
      }
    }
  }
}

if (!secretsFound) {
  pass('No obvious hardcoded secrets found in source files');
}

// 2. Check environment variables
console.log('\n📋 Checking environment configuration...\n');

const envFile = path.join(rootDir, '.env');
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  
  // Check for required security env vars
  const requiredEnvVars = [
    'JWT_SECRET',
    'DATABASE_URL',
  ];
  
  for (const envVar of requiredEnvVars) {
    if (envContent.includes(envVar)) {
      pass(`${envVar} is configured`);
    } else {
      fail(`${envVar} is not configured`);
    }
  }
  
  // Check JWT_SECRET is not default
  if (envContent.includes('JWT_SECRET') && 
      !envContent.includes('dev_secret_change_me')) {
    pass('JWT_SECRET is not using default value');
  } else if (envContent.includes('dev_secret_change_me')) {
    warn('JWT_SECRET is using default development value');
  }
} else {
  warn('.env file not found - ensure environment variables are set in production');
}

// 3. Check security middleware configuration
console.log('\n📋 Checking security middleware...\n');

const serverFile = path.join(rootDir, 'server.js');
if (fs.existsSync(serverFile)) {
  const serverContent = fs.readFileSync(serverFile, 'utf8');
  
  const securityMiddleware = [
    { name: 'helmet', pattern: /import.*helmet|require.*helmet/i },
    { name: 'cors', pattern: /import.*cors|require.*cors/i },
    { name: 'rate limiting', pattern: /rateLimit|rate-limit/i },
    { name: 'input sanitization', pattern: /inputSanitizer|sanitize/i },
    { name: 'compression', pattern: /compression/i },
  ];
  
  for (const { name, pattern } of securityMiddleware) {
    if (pattern.test(serverContent)) {
      pass(`${name} middleware is configured`);
    } else {
      fail(`${name} middleware is not configured`);
    }
  }
  
  // Check security headers
  if (serverContent.includes('contentSecurityPolicy')) {
    pass('Content Security Policy (CSP) is configured');
  } else {
    warn('Content Security Policy (CSP) not found');
  }
  
  if (serverContent.includes('hsts')) {
    pass('HTTP Strict Transport Security (HSTS) is configured');
  } else {
    warn('HSTS configuration not found');
  }
}

// 4. Check for SQL injection prevention (parameterized queries)
console.log('\n📋 Checking SQL query patterns...\n');

const sqlPatterns = {
  dangerous: /\$\{.*\}.*(?:SELECT|INSERT|UPDATE|DELETE|WHERE)/gi,
  safe: /\$\d+/g // Parameterized queries use $1, $2, etc.
};

let unsafeQueries = 0;
let safeQueries = 0;

for (const file of filesToCheck) {
  if (file.includes('test')) continue;
  
  const content = fs.readFileSync(file, 'utf8');
  
  // Check for template literals in SQL (potentially dangerous)
  const dangerousMatches = content.match(sqlPatterns.dangerous);
  if (dangerousMatches) {
    const relativePath = path.relative(rootDir, file);
    warn(`Potential SQL injection risk in ${relativePath} - found template literal in SQL`);
    unsafeQueries += dangerousMatches.length;
  }
  
  // Count parameterized queries
  const safeMatches = content.match(sqlPatterns.safe);
  if (safeMatches) {
    safeQueries += safeMatches.length;
  }
}

if (unsafeQueries === 0) {
  pass(`No obvious SQL injection vulnerabilities found`);
}
console.log(`   Found ${safeQueries} parameterized query placeholders`);

// 5. Check package.json for security-related packages
console.log('\n📋 Checking security packages...\n');

const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

const securityPackages = [
  { name: 'helmet', purpose: 'Security headers' },
  { name: 'validator', purpose: 'Input validation' },
  { name: 'bcryptjs', purpose: 'Password hashing' },
  { name: 'jsonwebtoken', purpose: 'JWT authentication' },
  { name: 'express-rate-limit', purpose: 'Rate limiting' },
];

for (const { name, purpose } of securityPackages) {
  if (allDeps[name]) {
    pass(`${name} (${purpose}) - v${allDeps[name].replace('^', '')}`);
  } else {
    fail(`${name} (${purpose}) is not installed`);
  }
}

// 6. Check for authentication on protected routes
console.log('\n📋 Checking route protection...\n');

const routesDir = path.join(rootDir, 'routes');
if (fs.existsSync(routesDir)) {
  const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
  let protectedRoutes = 0;
  let unprotectedRoutes = 0;
  
  for (const routeFile of routeFiles) {
    const content = fs.readFileSync(path.join(routesDir, routeFile), 'utf8');
    
    // Check for auth middleware usage
    if (/auth[Middleware]?|verifyToken|authenticate/i.test(content)) {
      protectedRoutes++;
    } else {
      // Some routes might be intentionally public
      if (!['health', 'public', 'webhook'].some(p => routeFile.includes(p))) {
        unprotectedRoutes++;
      }
    }
  }
  
  console.log(`   ${protectedRoutes} route files use authentication middleware`);
  if (unprotectedRoutes > 0) {
    warn(`${unprotectedRoutes} route files may not have auth middleware (review manually)`);
  } else {
    pass('All route files appear to use authentication');
  }
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 SECURITY AUDIT SUMMARY\n');
console.log(`✅ Passed:   ${results.passed.length}`);
console.log(`⚠️  Warnings: ${results.warnings.length}`);
console.log(`❌ Failed:   ${results.failed.length}`);
console.log('='.repeat(50));

if (results.failed.length > 0) {
  console.log('\n🚨 Critical issues to address:');
  results.failed.forEach((f, i) => console.log(`   ${i + 1}. ${f}`));
}

if (results.warnings.length > 0) {
  console.log('\n⚠️  Warnings to review:');
  results.warnings.forEach((w, i) => console.log(`   ${i + 1}. ${w}`));
}

console.log('\n📝 Recommendations:');
console.log('   1. Ensure JWT_SECRET is a strong, randomly generated value in production');
console.log('   2. Run "npm audit fix" regularly to patch vulnerable dependencies');
console.log('   3. Enable CSP in production to prevent XSS attacks');
console.log('   4. Implement rate limiting on all sensitive endpoints');
console.log('   5. Use HTTPS in production with HSTS enabled');
console.log('   6. Regularly rotate secrets and API keys');
console.log('   7. Monitor for suspicious activity in application logs\n');

process.exit(results.failed.length > 0 ? 1 : 0);

