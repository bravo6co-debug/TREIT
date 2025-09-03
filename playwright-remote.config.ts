import { defineConfig, devices } from '@playwright/test';

/**
 * Remote Connection Test Configuration
 * Tests remote Supabase connectivity without local servers
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  /* Test configuration */
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 1,
  workers: process.env.CI ? 2 : undefined,
  timeout: 60000, // 1 minute per test
  expect: {
    timeout: 30000, // 30 seconds for assertions
  },

  /* Enhanced reporting */
  reporter: [
    ['html', { 
      open: process.env.CI ? 'never' : 'on-failure',
      outputFolder: 'test-results/remote-html-report'
    }],
    ['json', { 
      outputFile: 'test-results/remote-test-results.json' 
    }],
    ['list']
  ],

  /* Global test settings */
  use: {
    /* Screenshots and videos */
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true
    },
    trace: 'retain-on-failure',

    /* Browser settings */
    acceptDownloads: true,
    ignoreHTTPSErrors: true,
    
    /* Action timeouts */
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  /* API testing only */
  projects: [
    {
      name: 'api-tests',
      use: { 
        baseURL: 'https://qbdctgumggdtfewttela.supabase.co/functions/v1'
      },
      grep: /@api|remote-connection/,
    }
  ],

  /* No web servers needed for remote testing */
  
  /* Output directories */
  outputDir: 'test-results/remote-artifacts',
});