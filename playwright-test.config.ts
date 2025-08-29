import { defineConfig, devices } from '@playwright/test';

/**
 * Simplified Playwright Configuration for testing
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  /* Test configuration */
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  workers: 1,
  timeout: 30000,
  
  /* Reporting */
  reporter: [['list'], ['html', { open: 'never' }]],

  /* Global test settings */
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    ignoreHTTPSErrors: true,
    actionTimeout: 10000,
    navigationTimeout: 20000,
  },

  /* Single project for API testing */
  projects: [
    {
      name: 'api-tests',
      use: { 
        baseURL: 'https://qbdctgumggdtfewttela.supabase.co'
      },
    }
  ],

  /* No web servers - run tests against remote APIs */
});