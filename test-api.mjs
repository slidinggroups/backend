#!/usr/bin/env node

/**
 * API Test Script for Sliding Group Gallery
 * Tests all major endpoints and functionality
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3001/api/v1';
const HEALTH_URL = 'http://localhost:3001/health';

// Test configuration
const tests = [
  {
    name: 'Health Check',
    url: HEALTH_URL,
    method: 'GET',
    expectedStatus: 200
  },
  {
    name: 'Get All Gallery Images',
    url: `${API_BASE}/gallery/images`,
    method: 'GET',
    expectedStatus: 200
  },
  {
    name: 'Get Featured Images',
    url: `${API_BASE}/gallery/images?featured=true`,
    method: 'GET',
    expectedStatus: 200
  },
  {
    name: 'Get Images by Category',
    url: `${API_BASE}/gallery/images?category=windows`,
    method: 'GET',
    expectedStatus: 200
  },
  {
    name: 'Get Gallery Categories',
    url: `${API_BASE}/gallery/categories`,
    method: 'GET',
    expectedStatus: 200
  },
  {
    name: 'Get Gallery Statistics',
    url: `${API_BASE}/gallery/stats`,
    method: 'GET',
    expectedStatus: 200
  },
  {
    name: 'Get Specific Image',
    url: `${API_BASE}/gallery/images/1`,
    method: 'GET',
    expectedStatus: 200
  }
];

async function runTest(test) {
  try {
    console.log(`\n🧪 Testing: ${test.name}`);
    console.log(`📡 ${test.method} ${test.url}`);
    
    const response = await axios({
      method: test.method,
      url: test.url,
      timeout: 5000
    });
    
    if (response.status === test.expectedStatus) {
      console.log(`✅ PASS - Status: ${response.status}`);
      
      // Log some data details
      if (response.data) {
        if (response.data.data && Array.isArray(response.data.data)) {
          console.log(`📊 Data: ${response.data.data.length} items`);
        } else if (response.data.data) {
          console.log(`📊 Data: ${typeof response.data.data}`);
        }
        if (response.data.success !== undefined) {
          console.log(`🔍 Success: ${response.data.success}`);
        }
      }
      
      return { success: true, test: test.name };
    } else {
      console.log(`❌ FAIL - Expected ${test.expectedStatus}, got ${response.status}`);
      return { success: false, test: test.name, error: `Status mismatch` };
    }
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}`);
    return { success: false, test: test.name, error: error.message };
  }
}

async function runAllTests() {
  console.log('🚀 Starting Sliding Group Gallery API Tests');
  console.log('=' .repeat(50));
  
  const results = [];
  
  for (const test of tests) {
    const result = await runTest(test);
    results.push(result);
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('📋 Test Summary');
  console.log('=' .repeat(50));
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${results.length}`);
  
  if (failed > 0) {
    console.log('\n🔍 Failed Tests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  • ${r.test}: ${r.error}`);
    });
  }
  
  console.log(`\n${failed === 0 ? '🎉 All tests passed!' : '⚠️  Some tests failed.'}`);
  
  process.exit(failed === 0 ? 0 : 1);
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Tests interrupted by user');
  process.exit(1);
});

// Run tests
runAllTests().catch(error => {
  console.error('💥 Test runner failed:', error.message);
  process.exit(1);
});
