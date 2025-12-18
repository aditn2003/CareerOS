#!/usr/bin/env node
/**
 * UC-136: Load Testing Script
 * 
 * Simulates high load scenarios to identify bottlenecks.
 * Usage: node scripts/load-test.js [options]
 * 
 * Options:
 *   --url        Base URL (default: http://localhost:4000)
 *   --users      Number of concurrent users (default: 10)
 *   --duration   Test duration in seconds (default: 30)
 *   --rps        Requests per second per user (default: 2)
 */

import http from 'http';
import https from 'https';

// Parse command line arguments
const args = process.argv.slice(2);
const config = {
  baseUrl: 'http://localhost:4000',
  concurrentUsers: 10,
  duration: 30,
  rps: 2,
  token: null, // Auth token if needed
};

for (let i = 0; i < args.length; i += 2) {
  switch (args[i]) {
    case '--url':
      config.baseUrl = args[i + 1];
      break;
    case '--users':
      config.concurrentUsers = parseInt(args[i + 1], 10);
      break;
    case '--duration':
      config.duration = parseInt(args[i + 1], 10);
      break;
    case '--rps':
      config.rps = parseInt(args[i + 1], 10);
      break;
    case '--token':
      config.token = args[i + 1];
      break;
  }
}

// Metrics
const metrics = {
  requests: 0,
  success: 0,
  errors: 0,
  responseTimes: [],            // all responses
  successResponseTimes: [],     // only successful (status < 400)
  statusCodes: {},
  startTime: null,
  endTime: null,
};

// Test scenarios - endpoints to test
const scenarios = [
  { method: 'GET', path: '/', name: 'Health Check', weight: 30 },
  { method: 'GET', path: '/api/jobs', name: 'List Jobs', requiresAuth: true, weight: 25 },
  { method: 'GET', path: '/api/resumes', name: 'List Resumes', requiresAuth: true, weight: 20 },
  { method: 'GET', path: '/api/dashboard/stats', name: 'Dashboard Stats', requiresAuth: true, weight: 15 },
  { method: 'GET', path: '/api/contacts', name: 'List Contacts', requiresAuth: true, weight: 10 },
];

// Calculate weighted random scenario selection
function getRandomScenario() {
  const totalWeight = scenarios.reduce((sum, s) => sum + s.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const scenario of scenarios) {
    random -= scenario.weight;
    if (random <= 0) return scenario;
  }
  return scenarios[0];
}

// Make HTTP request
function makeRequest(scenario) {
  return new Promise((resolve) => {
    const url = new URL(config.baseUrl + scenario.path);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const startTime = Date.now();
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: scenario.method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'LoadTest/1.0',
      },
      timeout: 10000,
    };
    
    // Add auth token if required and available
    if (scenario.requiresAuth && config.token) {
      options.headers['Authorization'] = `Bearer ${config.token}`;
    }
    
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        resolve({
          success: res.statusCode < 400,
          statusCode: res.statusCode,
          responseTime,
          scenario: scenario.name,
        });
      });
    });
    
    req.on('error', (err) => {
      const responseTime = Date.now() - startTime;
      resolve({
        success: false,
        statusCode: 0,
        responseTime,
        error: err.message,
        scenario: scenario.name,
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      const responseTime = Date.now() - startTime;
      resolve({
        success: false,
        statusCode: 0,
        responseTime,
        error: 'Timeout',
        scenario: scenario.name,
      });
    });
    
    req.end();
  });
}

// Process request result
function processResult(result) {
  metrics.requests++;
  metrics.responseTimes.push(result.responseTime);
  
  if (result.success) {
    metrics.success++;
    metrics.successResponseTimes.push(result.responseTime);
  } else {
    metrics.errors++;
  }
  
  const code = result.statusCode || 'error';
  metrics.statusCodes[code] = (metrics.statusCodes[code] || 0) + 1;
}

// Run a single virtual user
async function runUser(userId) {
  const interval = 1000 / config.rps;
  const endTime = metrics.startTime + (config.duration * 1000);
  
  while (Date.now() < endTime) {
    const scenario = getRandomScenario();
    const result = await makeRequest(scenario);
    processResult(result);
    
    // Wait for next request
    const elapsed = Date.now() - metrics.startTime;
    const targetRequests = Math.floor(elapsed / interval);
    const delay = Math.max(0, (targetRequests + 1) * interval - elapsed);
    await new Promise(r => setTimeout(r, delay));
  }
}

// Calculate statistics
function calculateStats() {
  const sorted = [...metrics.responseTimes].sort((a, b) => a - b);
  const len = sorted.length;
  
  const successSorted = [...metrics.successResponseTimes].sort((a, b) => a - b);
  const successLen = successSorted.length;
  
  return {
    total: metrics.requests,
    success: metrics.success,
    errors: metrics.errors,
    successRate: ((metrics.success / metrics.requests) * 100).toFixed(2) + '%',
    errorRate: ((metrics.errors / metrics.requests) * 100).toFixed(2) + '%',
    rps: (metrics.requests / config.duration).toFixed(2),
    responseTime: {
      min: sorted[0] || 0,
      max: sorted[len - 1] || 0,
      avg: (sorted.reduce((a, b) => a + b, 0) / len).toFixed(2),
      median: sorted[Math.floor(len / 2)] || 0,
      p95: sorted[Math.floor(len * 0.95)] || 0,
      p99: sorted[Math.floor(len * 0.99)] || 0,
      // Success-only timings (exclude 4xx/5xx and network errors)
      successMin: successSorted[0] || 0,
      successMax: successSorted[successLen - 1] || 0,
      successAvg: successLen
        ? (successSorted.reduce((a, b) => a + b, 0) / successLen).toFixed(2)
        : 0,
      successMedian: successSorted[Math.floor(successLen / 2)] || 0,
      successP95: successSorted[Math.floor(successLen * 0.95)] || 0,
      successP99: successSorted[Math.floor(successLen * 0.99)] || 0,
    },
    statusCodes: metrics.statusCodes,
    duration: config.duration + 's',
    concurrentUsers: config.concurrentUsers,
  };
}

// Print progress
function printProgress() {
  const elapsed = Math.floor((Date.now() - metrics.startTime) / 1000);
  const rps = (metrics.requests / Math.max(1, elapsed)).toFixed(1);
  process.stdout.write(`\r⏱️  ${elapsed}s | Requests: ${metrics.requests} | RPS: ${rps} | Errors: ${metrics.errors}`);
}

// Main function
async function main() {
  console.log('\n🔥 UC-136: Load Test Starting...\n');
  console.log('Configuration:');
  console.log(`  Base URL: ${config.baseUrl}`);
  console.log(`  Concurrent Users: ${config.concurrentUsers}`);
  console.log(`  Duration: ${config.duration}s`);
  console.log(`  Target RPS/user: ${config.rps}`);
  console.log(`  Auth Token: ${config.token ? 'Provided' : 'Not provided (some tests will fail)'}`);
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Start test
  metrics.startTime = Date.now();
  
  // Progress indicator
  const progressInterval = setInterval(printProgress, 1000);
  
  // Run all users concurrently
  const userPromises = [];
  for (let i = 0; i < config.concurrentUsers; i++) {
    userPromises.push(runUser(i));
  }
  
  await Promise.all(userPromises);
  
  metrics.endTime = Date.now();
  clearInterval(progressInterval);
  
  // Print final results
  console.log('\n\n' + '='.repeat(60));
  console.log('\n📊 LOAD TEST RESULTS\n');
  
  const stats = calculateStats();
  
  console.log('Summary:');
  console.log(`  Total Requests:    ${stats.total}`);
  console.log(`  Successful:        ${stats.success} (${stats.successRate})`);
  console.log(`  Failed:            ${stats.errors} (${stats.errorRate})`);
  console.log(`  Requests/Second:   ${stats.rps}`);
  
  console.log('\nResponse Times (ms):');
  console.log(`  Min:     ${stats.responseTime.min}ms`);
  console.log(`  Max:     ${stats.responseTime.max}ms`);
  console.log(`  Average: ${stats.responseTime.avg}ms`);
  console.log(`  Median:  ${stats.responseTime.median}ms`);
  console.log(`  P95:     ${stats.responseTime.p95}ms`);
  console.log(`  P99:     ${stats.responseTime.p99}ms`);
  console.log('\nResponse Times (successful only, ms):');
  console.log(`  Min:     ${stats.responseTime.successMin}ms`);
  console.log(`  Max:     ${stats.responseTime.successMax}ms`);
  console.log(`  Average: ${stats.responseTime.successAvg}ms`);
  console.log(`  Median:  ${stats.responseTime.successMedian}ms`);
  console.log(`  P95:     ${stats.responseTime.successP95}ms`);
  console.log(`  P99:     ${stats.responseTime.successP99}ms`);
  
  console.log('\nStatus Codes:');
  for (const [code, count] of Object.entries(stats.statusCodes)) {
    console.log(`  ${code}: ${count}`);
  }
  
  console.log('\n' + '='.repeat(60));
  
  // Performance assessment
  console.log('\n🎯 PERFORMANCE ASSESSMENT:\n');

  // Use success-only P95 to assess "real" app latency under load
  const p95Success = parseFloat(stats.responseTime.successP95 || stats.responseTime.p95);
  if (p95Success < 200) {
    console.log('✅ P95 response time (successful requests) is excellent (<200ms)');
  } else if (p95Success < 500) {
    console.log('⚠️ P95 response time (successful requests) is acceptable (<500ms)');
  } else {
    console.log('❌ P95 response time (successful requests) needs improvement (>500ms)');
  }
  
  if (parseFloat(stats.errorRate) < 1) {
    console.log('✅ Error rate is excellent (<1%)');
  } else if (parseFloat(stats.errorRate) < 5) {
    console.log('⚠️ Error rate is acceptable (<5%)');
  } else {
    console.log('❌ Error rate is too high (>5%)');
  }
  
  const actualRps = parseFloat(stats.rps);
  const targetRps = config.concurrentUsers * config.rps;
  if (actualRps >= targetRps * 0.9) {
    console.log(`✅ Throughput meets target (${actualRps}/${targetRps} RPS)`);
  } else {
    console.log(`⚠️ Throughput below target (${actualRps}/${targetRps} RPS)`);
  }
  
  console.log('\n');
}

main().catch(console.error);

