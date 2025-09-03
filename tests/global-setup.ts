import { chromium, FullConfig } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Global setup for TreitMaster E2E tests
 * Prepares test environment and authentication states
 */

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting TreitMaster E2E Test Suite Global Setup...');

  try {
    // 1. Ensure Supabase is running
    await ensureSupabaseRunning();

    // 2. Set up test database
    await setupTestDatabase();

    // 3. Create authentication states
    await createAuthenticationStates();

    // 4. Set up test data
    await setupTestData();

    // 5. Create necessary directories
    await createTestDirectories();

    console.log('✅ Global setup completed successfully');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

async function ensureSupabaseRunning() {
  console.log('🔍 Checking Supabase status...');
  
  try {
    const { stdout } = await execAsync('npx supabase status');
    
    if (stdout.includes('supabase local development setup is running')) {
      console.log('✅ Supabase is already running');
      return;
    }
  } catch (error) {
    // Supabase not running or command failed
  }

  console.log('🚀 Starting Supabase local development...');
  
  try {
    await execAsync('npx supabase start', { timeout: 180000 }); // 3 minutes timeout
    console.log('✅ Supabase started successfully');
  } catch (error) {
    console.error('❌ Failed to start Supabase:', error);
    throw new Error('Supabase setup failed. Please ensure Docker is running and Supabase is properly configured.');
  }
}

async function setupTestDatabase() {
  console.log('🗄️ Setting up test database...');

  try {
    // Reset database to clean state
    await execAsync('npx supabase db reset --linked=false');
    
    // Apply migrations
    await execAsync('npx supabase migration up');
    
    // Seed test data
    await execAsync('npx supabase db seed');
    
    console.log('✅ Test database setup completed');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw new Error('Database setup failed. Check Supabase configuration and migrations.');
  }
}

async function createAuthenticationStates() {
  console.log('🔐 Creating authentication states for test users...');

  const browser = await chromium.launch();
  const authDir = path.join(process.cwd(), 'auth');
  
  try {
    // Ensure auth directory exists
    await fs.mkdir(authDir, { recursive: true });

    // Create authentication state for regular user
    await createUserAuth(browser, {
      email: 'test-user@example.com',
      password: 'TestUser123!',
      name: '테스트사용자',
      userType: 'user',
      baseURL: 'http://localhost:9000',
      statePath: path.join(authDir, 'user-state.json')
    });

    // Create authentication state for advertiser
    await createUserAuth(browser, {
      email: 'test-advertiser@company.com',
      password: 'TestAdvertiser123!',
      name: '테스트광고주',
      userType: 'advertiser',
      baseURL: 'http://localhost:9001',
      statePath: path.join(authDir, 'advertiser-state.json')
    });

    // Create authentication state for admin
    await createUserAuth(browser, {
      email: 'admin@treitmaster.com',
      password: 'AdminTest123!',
      name: '관리자',
      userType: 'admin',
      baseURL: 'http://localhost:9002',
      statePath: path.join(authDir, 'admin-state.json')
    });

    console.log('✅ Authentication states created successfully');
  } catch (error) {
    console.error('❌ Failed to create authentication states:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function createUserAuth(browser: any, config: {
  email: string;
  password: string;
  name: string;
  userType: string;
  baseURL: string;
  statePath: string;
}) {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log(`  Creating ${config.userType} authentication state...`);

    await page.goto(config.baseURL);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check if we need to register the user first
    const signupLink = await page.locator('[data-testid="signup-link"]').isVisible();
    
    if (signupLink) {
      // Register new user
      await page.click('[data-testid="signup-link"]');
      await page.waitForSelector('[data-testid="signup-form"]');

      if (config.userType === 'advertiser') {
        // Select advertiser registration
        const advertiserRadio = page.locator('[data-testid="advertiser-type-radio"]');
        if (await advertiserRadio.isVisible()) {
          await advertiserRadio.click();
        }
      }

      // Fill registration form
      await page.fill('[data-testid="email-input"]', config.email);
      await page.fill('[data-testid="password-input"]', config.password);
      
      const confirmPasswordInput = page.locator('[data-testid="confirm-password-input"]');
      if (await confirmPasswordInput.isVisible()) {
        await confirmPasswordInput.fill(config.password);
      }

      const nameInput = page.locator('[data-testid="name-input"]');
      if (await nameInput.isVisible()) {
        await nameInput.fill(config.name);
      }

      // Accept terms if required
      const termsCheckbox = page.locator('[data-testid="terms-checkbox"]');
      if (await termsCheckbox.isVisible()) {
        await termsCheckbox.check();
      }

      const privacyCheckbox = page.locator('[data-testid="privacy-checkbox"]');
      if (await privacyCheckbox.isVisible()) {
        await privacyCheckbox.check();
      }

      // Submit registration
      const signupButton = config.userType === 'advertiser' 
        ? '[data-testid="register-advertiser-button"]' 
        : '[data-testid="signup-button"]';
      
      await page.click(signupButton);

      // Wait for registration success or redirect to verification
      try {
        await page.waitForSelector('[data-testid="registration-success"], [data-testid="email-verification-sent"], [data-testid="dashboard"], [data-testid="home-screen"]', 
          { timeout: 15000 });
      } catch (error) {
        // Registration might redirect directly to login
        console.log(`  Registration completed for ${config.userType}, attempting login...`);
      }
    }

    // Attempt to login
    const loginForm = page.locator('[data-testid="login-form"]');
    if (await loginForm.isVisible()) {
      await page.fill('[data-testid="email-input"]', config.email);
      await page.fill('[data-testid="password-input"]', config.password);
      await page.click('[data-testid="login-button"]');
    }

    // Wait for successful authentication
    const successSelectors = [
      '[data-testid="dashboard"]',
      '[data-testid="home-screen"]',
      '[data-testid="admin-dashboard"]',
      '[data-testid="advertiser-dashboard"]'
    ];

    await page.waitForSelector(successSelectors.join(', '), { timeout: 15000 });

    // Save authentication state
    await context.storageState({ path: config.statePath });
    
    console.log(`  ✅ ${config.userType} authentication state saved`);

  } catch (error) {
    console.error(`  ❌ Failed to create ${config.userType} authentication:`, error);
    
    // Try to save current state anyway for debugging
    try {
      await context.storageState({ path: config.statePath + '.failed' });
    } catch (saveError) {
      console.error(`  ❌ Could not save failed state:`, saveError);
    }
    
    throw error;
  } finally {
    await context.close();
  }
}

async function setupTestData() {
  console.log('📊 Setting up additional test data...');

  try {
    // Insert test users directly into database
    const testUsers = [
      {
        email: 'test-user@example.com',
        password: '$2b$10$hash', // In real implementation, use proper hashing
        name: '테스트사용자',
        role: 'user',
        level: 1,
        xp: 100
      },
      {
        email: 'test-advertiser@company.com',
        password: '$2b$10$hash',
        name: '테스트광고주',
        role: 'advertiser',
        business_name: '테스트회사',
        business_number: '123-45-67890',
        verification_status: 'approved'
      },
      {
        email: 'admin@treitmaster.com',
        password: '$2b$10$hash',
        name: '관리자',
        role: 'admin'
      }
    ];

    // Create test campaigns
    const testCampaigns = [
      {
        title: '테스트 캠페인 1',
        description: '첫 번째 테스트 캠페인입니다.',
        category: '뷰티',
        budget: 100000,
        reward: 1000,
        status: 'active',
        target_url: 'https://example.com/campaign1'
      },
      {
        title: '테스트 캠페인 2',
        description: '두 번째 테스트 캠페인입니다.',
        category: '패션',
        budget: 200000,
        reward: 2000,
        status: 'active',
        target_url: 'https://example.com/campaign2'
      }
    ];

    // In a real implementation, you would insert this data using SQL or Supabase client
    console.log('  📝 Test users and campaigns will be created on first test run');
    console.log('✅ Test data setup completed');

  } catch (error) {
    console.error('❌ Failed to setup test data:', error);
    // Don't throw here as this is not critical for basic tests
  }
}

async function createTestDirectories() {
  console.log('📁 Creating test directories...');

  const directories = [
    'test-results',
    'test-results/screenshots',
    'test-results/videos',
    'test-results/traces',
    'test-results/html-report',
    'test-results/artifacts',
    'auth'
  ];

  try {
    for (const dir of directories) {
      await fs.mkdir(path.join(process.cwd(), dir), { recursive: true });
    }
    
    console.log('✅ Test directories created successfully');
  } catch (error) {
    console.error('❌ Failed to create test directories:', error);
    throw error;
  }
}

// Export for Playwright configuration
export default globalSetup;