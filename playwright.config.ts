import { defineConfig, devices } from '@playwright/test';

/**
 * Enhanced Playwright Configuration for TreitMaster Multi-App Testing
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  /* Test configuration */
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 1,
  workers: process.env.CI ? 2 : undefined,
  timeout: 120000, // 2 minutes per test
  expect: {
    timeout: 30000, // 30 seconds for assertions
  },

  /* Enhanced reporting */
  reporter: [
    ['html', { 
      open: process.env.CI ? 'never' : 'on-failure',
      outputFolder: 'test-results/html-report'
    }],
    ['json', { 
      outputFile: 'test-results/test-results.json' 
    }],
    ['junit', { 
      outputFile: 'test-results/test-results.xml' 
    }],
    ['list'],
    process.env.CI ? ['github'] : ['line']
  ],

  /* Global test settings */
  use: {
    /* Screenshots and videos */
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true
    },
    video: {
      mode: 'retain-on-failure',
      size: { width: 1280, height: 720 }
    },
    trace: 'retain-on-failure',

    /* Browser settings */
    acceptDownloads: true,
    ignoreHTTPSErrors: true,
    
    /* Action timeouts */
    actionTimeout: 15000,
    navigationTimeout: 30000,

    /* Test data and utilities */
    contextOptions: {
      permissions: ['notifications', 'clipboard-read', 'clipboard-write']
    }
  },

  /* Multi-browser and device testing */
  projects: [
    /* Setup project for authentication and data preparation */
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    /* Desktop browsers - Core functionality */
    {
      name: 'user-app-chrome',
      use: { 
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:9000',
        storageState: 'auth/user-state.json'
      },
      dependencies: ['setup'],
      grep: /@user-app/,
    },
    {
      name: 'user-app-firefox',
      use: { 
        ...devices['Desktop Firefox'],
        baseURL: 'http://localhost:9000',
        storageState: 'auth/user-state.json'
      },
      dependencies: ['setup'],
      grep: /@user-app/,
    },
    {
      name: 'user-app-safari',
      use: { 
        ...devices['Desktop Safari'],
        baseURL: 'http://localhost:9000',
        storageState: 'auth/user-state.json'
      },
      dependencies: ['setup'],
      grep: /@user-app/,
    },

    /* Advertiser app testing */
    {
      name: 'advertiser-app-chrome',
      use: { 
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:9001',
        storageState: 'auth/advertiser-state.json'
      },
      dependencies: ['setup'],
      grep: /@advertiser-app/,
    },
    {
      name: 'advertiser-app-firefox', 
      use: { 
        ...devices['Desktop Firefox'],
        baseURL: 'http://localhost:9001',
        storageState: 'auth/advertiser-state.json'
      },
      dependencies: ['setup'],
      grep: /@advertiser-app/,
    },

    /* Admin app testing */
    {
      name: 'admin-app-chrome',
      use: { 
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:9002',
        storageState: 'auth/admin-state.json'
      },
      dependencies: ['setup'],
      grep: /@admin-app/,
    },

    /* Mobile testing - User app */
    {
      name: 'mobile-user-chrome',
      use: { 
        ...devices['Pixel 5'],
        baseURL: 'http://localhost:9000',
        storageState: 'auth/user-state.json'
      },
      dependencies: ['setup'],
      grep: /@mobile.*@user-app/,
    },
    {
      name: 'mobile-user-safari',
      use: { 
        ...devices['iPhone 12'],
        baseURL: 'http://localhost:9000',
        storageState: 'auth/user-state.json'
      },
      dependencies: ['setup'],
      grep: /@mobile.*@user-app/,
    },

    /* Tablet testing - Advertiser app */
    {
      name: 'tablet-advertiser',
      use: { 
        ...devices['iPad Pro'],
        baseURL: 'http://localhost:9001',
        storageState: 'auth/advertiser-state.json'
      },
      dependencies: ['setup'],
      grep: /@tablet.*@advertiser-app/,
    },

    /* Cross-platform integration tests */
    {
      name: 'integration-tests',
      use: { 
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:9000'
      },
      dependencies: ['setup'],
      grep: /@integration/,
    },

    /* Security and performance tests */
    {
      name: 'security-tests',
      use: { 
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:9000'
      },
      grep: /@security/,
    },
    {
      name: 'performance-tests',
      use: { 
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:9000'
      },
      grep: /@performance/,
    },

    /* API testing */
    {
      name: 'api-tests',
      use: { 
        baseURL: 'https://qbdctgumggdtfewttela.supabase.co/functions/v1' // Supabase remote API
      },
      grep: /@api/,
    }
  ],

  /* Start local development servers */
  webServer: [
    {
      command: 'npm run dev:user',
      port: 9000,
      reuseExistingServer: true,
      timeout: 180000,
      env: {
        NODE_ENV: 'test'
      }
    },
    {
      command: 'npm run dev:advertiser',
      port: 9001,
      reuseExistingServer: true,
      timeout: 180000,
      env: {
        NODE_ENV: 'test'
      }
    },
    {
      command: 'npm run dev:admin',
      port: 9002,
      reuseExistingServer: true,
      timeout: 180000,
      env: {
        NODE_ENV: 'test'
      }
    },
    {
      // Removed local Supabase server - using remote instance
    }
  ],

  /* Output directories */
  outputDir: 'test-results/artifacts',
  
  /* Global setup and teardown */
  globalSetup: require.resolve('./tests/global-setup.ts'),
  globalTeardown: require.resolve('./tests/global-teardown.ts'),
});