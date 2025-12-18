#!/usr/bin/env node

/**
 * Merge Coverage Reports
 * Combines coverage reports from frontend and backend into a single summary
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function readCoverageSummary(projectDir) {
  const coveragePath = path.join(rootDir, projectDir, 'coverage', 'coverage-summary.json');
  
  if (!fs.existsSync(coveragePath)) {
    console.log(`${colors.yellow}⚠ No coverage found for ${projectDir}${colors.reset}`);
    return null;
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
    return data.total;
  } catch (err) {
    console.error(`${colors.red}Error reading coverage for ${projectDir}: ${err.message}${colors.reset}`);
    return null;
  }
}

function formatPercent(value) {
  const pct = value?.pct ?? 0;
  let color = colors.green;
  if (pct < 50) color = colors.red;
  else if (pct < 80) color = colors.yellow;
  return `${color}${pct.toFixed(2)}%${colors.reset}`;
}

function printCoverageSummary(name, coverage) {
  if (!coverage) return;
  
  console.log(`\n${colors.bright}${colors.cyan}${name}${colors.reset}`);
  console.log(`  Statements: ${formatPercent(coverage.statements)} (${coverage.statements?.covered ?? 0}/${coverage.statements?.total ?? 0})`);
  console.log(`  Branches:   ${formatPercent(coverage.branches)} (${coverage.branches?.covered ?? 0}/${coverage.branches?.total ?? 0})`);
  console.log(`  Functions:  ${formatPercent(coverage.functions)} (${coverage.functions?.covered ?? 0}/${coverage.functions?.total ?? 0})`);
  console.log(`  Lines:      ${formatPercent(coverage.lines)} (${coverage.lines?.covered ?? 0}/${coverage.lines?.total ?? 0})`);
}

function combineCoverage(coverages) {
  const combined = {
    statements: { total: 0, covered: 0, pct: 0 },
    branches: { total: 0, covered: 0, pct: 0 },
    functions: { total: 0, covered: 0, pct: 0 },
    lines: { total: 0, covered: 0, pct: 0 },
  };
  
  for (const coverage of coverages) {
    if (!coverage) continue;
    
    for (const metric of ['statements', 'branches', 'functions', 'lines']) {
      combined[metric].total += coverage[metric]?.total ?? 0;
      combined[metric].covered += coverage[metric]?.covered ?? 0;
    }
  }
  
  // Calculate percentages
  for (const metric of ['statements', 'branches', 'functions', 'lines']) {
    if (combined[metric].total > 0) {
      combined[metric].pct = (combined[metric].covered / combined[metric].total) * 100;
    }
  }
  
  return combined;
}

function main() {
  console.log(`\n${colors.bright}${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}           COMBINED COVERAGE REPORT${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  
  const backendCoverage = readCoverageSummary('backend');
  const frontendCoverage = readCoverageSummary('frontend');
  
  if (!backendCoverage && !frontendCoverage) {
    console.log(`\n${colors.red}No coverage reports found. Run test:coverage first.${colors.reset}\n`);
    process.exit(1);
  }
  
  printCoverageSummary('📦 Backend Coverage', backendCoverage);
  printCoverageSummary('🎨 Frontend Coverage', frontendCoverage);
  
  const combined = combineCoverage([backendCoverage, frontendCoverage].filter(Boolean));
  
  console.log(`\n${colors.bright}${colors.blue}───────────────────────────────────────────────────────${colors.reset}`);
  printCoverageSummary('📊 COMBINED TOTAL', combined);
  console.log(`\n${colors.bright}${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);
  
  // Save combined summary
  const outputDir = path.join(rootDir, 'coverage');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const summaryPath = path.join(outputDir, 'combined-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify({
    backend: backendCoverage,
    frontend: frontendCoverage,
    combined,
    generatedAt: new Date().toISOString(),
  }, null, 2));
  
  console.log(`${colors.green}✓ Combined summary saved to: ${summaryPath}${colors.reset}\n`);
}

main();

