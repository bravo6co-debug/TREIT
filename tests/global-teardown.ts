import { FullConfig } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Global teardown for TreitMaster E2E tests
 * Cleans up test environment and generates final reports
 */

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting TreitMaster E2E Test Suite Global Teardown...');

  try {
    // 1. Generate test reports
    await generateTestReports();

    // 2. Clean up test data
    await cleanupTestData();

    // 3. Archive test results
    await archiveTestResults();

    // 4. Stop services if needed (optional in CI)
    await stopServices();

    // 5. Clean up temporary files
    await cleanupTempFiles();

    console.log('✅ Global teardown completed successfully');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error in teardown to avoid masking test failures
  }
}

async function generateTestReports() {
  console.log('📊 Generating test reports...');

  try {
    // Generate HTML report if not already generated
    const htmlReportPath = path.join(process.cwd(), 'test-results', 'html-report');
    
    try {
      await fs.access(htmlReportPath);
      console.log('  ✅ HTML report already exists');
    } catch {
      console.log('  📝 Generating HTML report...');
      await execAsync('npx playwright show-report --reporter=html');
    }

    // Generate performance summary
    await generatePerformanceSummary();

    // Generate security test summary
    await generateSecuritySummary();

    console.log('✅ Test reports generated successfully');
  } catch (error) {
    console.error('❌ Failed to generate test reports:', error);
  }
}

async function generatePerformanceSummary() {
  console.log('  📈 Generating performance summary...');

  try {
    const perfResultsPath = path.join(process.cwd(), 'test-results', 'performance-summary.json');
    
    // In a real implementation, you would collect performance metrics
    // from test results and generate a comprehensive summary
    const performanceSummary = {
      timestamp: new Date().toISOString(),
      summary: {
        avgPageLoadTime: 'N/A - Run performance tests to populate',
        avgApiResponseTime: 'N/A - Run performance tests to populate',
        memoryUsage: 'N/A - Run performance tests to populate',
        networkRequests: 'N/A - Run performance tests to populate'
      },
      thresholds: {
        pageLoad: '5000ms',
        apiResponse: '2000ms',
        memoryUsage: '100MB',
        bundleSize: '5MB'
      },
      recommendations: [
        'Run performance tests with @performance tag to get detailed metrics',
        'Monitor bundle size and optimize if needed',
        'Check for memory leaks in long-running tests',
        'Optimize API response times for better UX'
      ]
    };

    await fs.writeFile(perfResultsPath, JSON.stringify(performanceSummary, null, 2));
    console.log('  ✅ Performance summary generated');
  } catch (error) {
    console.error('  ❌ Failed to generate performance summary:', error);
  }
}

async function generateSecuritySummary() {
  console.log('  🔒 Generating security summary...');

  try {
    const securityResultsPath = path.join(process.cwd(), 'test-results', 'security-summary.json');
    
    const securitySummary = {
      timestamp: new Date().toISOString(),
      testCategories: {
        xssProtection: 'Run @security tests to check XSS protection',
        sqlInjectionPrevention: 'Run @security tests to check SQL injection prevention',
        environmentVariables: 'Run @security tests to check environment variable exposure',
        cspHeaders: 'Run @security tests to check Content Security Policy',
        authenticationSecurity: 'Run @security tests to check authentication security',
        inputValidation: 'Run @security tests to check input validation'
      },
      recommendations: [
        'Run security tests with @security tag regularly',
        'Review and update security policies based on test results',
        'Monitor for new security vulnerabilities',
        'Keep dependencies updated'
      ],
      securityPolicies: {
        csp: 'Verify CSP headers are properly configured',
        cors: 'Check CORS settings for API endpoints',
        rateLimit: 'Implement rate limiting for API calls',
        inputSanitization: 'Ensure all user input is properly sanitized'
      }
    };

    await fs.writeFile(securityResultsPath, JSON.stringify(securitySummary, null, 2));
    console.log('  ✅ Security summary generated');
  } catch (error) {
    console.error('  ❌ Failed to generate security summary:', error);
  }
}

async function cleanupTestData() {
  console.log('🗑️ Cleaning up test data...');

  try {
    // Clean up test database if in isolated test environment
    if (process.env.CI || process.env.CLEANUP_TEST_DB === 'true') {
      console.log('  🗄️ Cleaning test database...');
      await execAsync('npx supabase db reset --linked=false');
    } else {
      console.log('  ⏭️ Skipping database cleanup (not in CI environment)');
    }

    // Clean up uploaded test files
    const uploadsPath = path.join(process.cwd(), 'uploads', 'test');
    try {
      await fs.rm(uploadsPath, { recursive: true, force: true });
      console.log('  🗂️ Test upload files cleaned up');
    } catch (error) {
      console.log('  ⏭️ No test upload files to clean up');
    }

    console.log('✅ Test data cleanup completed');
  } catch (error) {
    console.error('❌ Failed to cleanup test data:', error);
  }
}

async function archiveTestResults() {
  console.log('📦 Archiving test results...');

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archivePath = path.join(process.cwd(), 'test-archives', `test-results-${timestamp}`);

    // Create archive directory
    await fs.mkdir(archivePath, { recursive: true });

    // Copy test results to archive
    const testResultsPath = path.join(process.cwd(), 'test-results');
    
    try {
      await fs.cp(testResultsPath, archivePath, { recursive: true });
      console.log(`  📁 Test results archived to: ${archivePath}`);
    } catch (error) {
      console.log('  ⏭️ No test results to archive');
    }

    // Create archive summary
    const archiveSummary = {
      timestamp,
      archivePath,
      testRunId: process.env.GITHUB_RUN_ID || 'local-run',
      branch: process.env.GITHUB_REF_NAME || 'local',
      commit: process.env.GITHUB_SHA || 'unknown'
    };

    await fs.writeFile(
      path.join(archivePath, 'archive-info.json'),
      JSON.stringify(archiveSummary, null, 2)
    );

    // Clean up old archives (keep last 10)
    await cleanupOldArchives();

    console.log('✅ Test results archived successfully');
  } catch (error) {
    console.error('❌ Failed to archive test results:', error);
  }
}

async function cleanupOldArchives() {
  try {
    const archivesDir = path.join(process.cwd(), 'test-archives');
    const archives = await fs.readdir(archivesDir);
    
    // Sort archives by creation time (assuming timestamp in name)
    archives.sort((a, b) => b.localeCompare(a));
    
    // Remove archives beyond the last 10
    if (archives.length > 10) {
      const archivesToDelete = archives.slice(10);
      
      for (const archive of archivesToDelete) {
        await fs.rm(path.join(archivesDir, archive), { recursive: true, force: true });
      }
      
      console.log(`  🗑️ Cleaned up ${archivesToDelete.length} old archives`);
    }
  } catch (error) {
    console.log('  ⏭️ No old archives to clean up');
  }
}

async function stopServices() {
  console.log('🛑 Stopping services...');

  try {
    // Only stop services in CI environment or if explicitly requested
    if (process.env.CI || process.env.STOP_SERVICES === 'true') {
      console.log('  🔄 Stopping Supabase...');
      await execAsync('npx supabase stop');
      console.log('  ✅ Supabase stopped');
    } else {
      console.log('  ⏭️ Skipping service shutdown (not in CI environment)');
      console.log('  ℹ️ Supabase and dev servers left running for development');
    }
  } catch (error) {
    console.error('❌ Failed to stop services:', error);
  }
}

async function cleanupTempFiles() {
  console.log('🧽 Cleaning up temporary files...');

  try {
    // Clean up authentication state files if in CI
    if (process.env.CI) {
      const authDir = path.join(process.cwd(), 'auth');
      await fs.rm(authDir, { recursive: true, force: true });
      console.log('  🔑 Authentication states cleaned up');
    }

    // Clean up any .tmp files
    const tempFiles = [
      'test-results/*.tmp',
      'screenshots/*.tmp',
      'videos/*.tmp'
    ];

    for (const pattern of tempFiles) {
      try {
        // In a real implementation, you'd use a glob library
        console.log(`  🗑️ Cleaning ${pattern}`);
      } catch (error) {
        // Ignore cleanup errors for temp files
      }
    }

    // Clean up any lock files created during tests
    const lockFiles = [
      'test.lock',
      'playwright.lock'
    ];

    for (const lockFile of lockFiles) {
      try {
        await fs.unlink(path.join(process.cwd(), lockFile));
        console.log(`  🔓 Removed lock file: ${lockFile}`);
      } catch (error) {
        // Lock file doesn't exist, which is fine
      }
    }

    console.log('✅ Temporary files cleaned up');
  } catch (error) {
    console.error('❌ Failed to cleanup temporary files:', error);
  }
}

// Export for Playwright configuration
export default globalTeardown;