import { test, expect, Page } from '@playwright/test';

// Test data
const testData = {
  user: {
    email: 'testuser@example.com',
    password: 'testpassword123',
    name: '김테스트',
    phone: '010-1234-5678'
  },
  advertiser: {
    email: 'advertiser@example.com',
    password: 'advertiser123',
    businessName: '테스트 주식회사',
    businessNumber: '123-45-67890',
    contactPerson: '김광고',
    contactPhone: '010-9876-5432'
  },
  admin: {
    email: 'admin@treitmaster.com',
    password: 'admin123'
  },
  campaign: {
    title: '테스트 마케팅 캠페인',
    description: '테스트용 캠페인입니다.',
    reward: 1000,
    budget: 100000,
    targetUrl: 'https://example.com/landing'
  }
};

// Helper functions
async function loginUser(page: Page, userType: 'user' | 'advertiser' | 'admin') {
  const userData = testData[userType];
  
  // Navigate to appropriate login page
  const loginUrls = {
    user: 'http://localhost:9000',
    advertiser: 'http://localhost:9001',
    admin: 'http://localhost:9002'
  };
  
  await page.goto(loginUrls[userType]);
  
  // Wait for login form or check if already logged in
  try {
    await page.waitForSelector('[data-testid="login-form"]', { timeout: 5000 });
    
    // Fill login form
    await page.fill('[data-testid="email-input"]', userData.email);
    await page.fill('[data-testid="password-input"]', userData.password);
    await page.click('[data-testid="login-button"]');
    
    // Wait for successful login (dashboard or home screen)
    await page.waitForSelector('[data-testid="dashboard"], [data-testid="home-screen"]', { timeout: 10000 });
  } catch (error) {
    // If login form not found, user might already be logged in
    console.log(`User ${userType} appears to already be logged in`);
  }
}

async function createCampaign(page: Page) {
  // Navigate to campaign creation
  await page.click('[data-testid="create-campaign-button"]');
  await page.waitForSelector('[data-testid="campaign-form"]');
  
  // Fill campaign form
  await page.fill('[data-testid="campaign-title"]', testData.campaign.title);
  await page.fill('[data-testid="campaign-description"]', testData.campaign.description);
  await page.fill('[data-testid="reward-amount"]', testData.campaign.reward.toString());
  await page.fill('[data-testid="budget-amount"]', testData.campaign.budget.toString());
  await page.fill('[data-testid="target-url"]', testData.campaign.targetUrl);
  
  // Submit campaign
  await page.click('[data-testid="submit-campaign"]');
  await page.waitForSelector('[data-testid="campaign-created-success"]');
}

test.describe('TreitMaster E2E Full Flow Tests', () => {
  test.describe.configure({ mode: 'serial' });

  test('Complete User Journey - 사용자 전체 플로우', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes timeout

    // Step 1: User Registration and Login
    await page.goto('http://localhost:9000');
    
    // Check if signup is needed
    try {
      await page.waitForSelector('[data-testid="signup-link"]', { timeout: 5000 });
      await page.click('[data-testid="signup-link"]');
      
      // Fill signup form
      await page.fill('[data-testid="email-input"]', testData.user.email);
      await page.fill('[data-testid="password-input"]', testData.user.password);
      await page.fill('[data-testid="name-input"]', testData.user.name);
      await page.click('[data-testid="signup-button"]');
      
      // Wait for email verification message or automatic login
      await page.waitForSelector('[data-testid="home-screen"], [data-testid="verify-email"]', { timeout: 10000 });
      
    } catch (error) {
      // If signup not needed, try login
      await loginUser(page, 'user');
    }
    
    // Step 2: Complete Profile Setup
    await page.click('[data-testid="profile-menu"]');
    await page.click('[data-testid="account-info"]');
    
    // Fill additional profile information
    await page.fill('[data-testid="phone-input"]', testData.user.phone);
    
    // Connect social accounts (mock)
    await page.click('[data-testid="connect-instagram"]');
    await page.fill('[data-testid="instagram-username"]', 'test_instagram');
    await page.click('[data-testid="confirm-instagram"]');
    
    await page.click('[data-testid="save-profile"]');
    await expect(page.locator('[data-testid="profile-saved"]')).toBeVisible();
    
    // Step 3: Browse and Join Campaigns
    await page.click('[data-testid="campaigns-menu"]');
    await page.waitForSelector('[data-testid="campaign-list"]');
    
    // Wait for campaigns to load
    await page.waitForSelector('[data-testid="campaign-card"]');
    
    // Click on first campaign
    const firstCampaign = page.locator('[data-testid="campaign-card"]').first();
    await firstCampaign.click();
    
    // Join campaign
    await page.click('[data-testid="join-campaign"]');
    await expect(page.locator('[data-testid="campaign-joined"]')).toBeVisible();
    
    // Complete campaign tasks
    await page.click('[data-testid="complete-task-1"]');
    await page.fill('[data-testid="task-proof-url"]', 'https://example.com/proof');
    await page.click('[data-testid="submit-task"]');
    
    await expect(page.locator('[data-testid="task-completed"]')).toBeVisible();
    
    // Step 4: Claim Daily Bonus
    await page.click('[data-testid="home-menu"]');
    await page.click('[data-testid="daily-bonus-button"]');
    await expect(page.locator('[data-testid="bonus-claimed"]')).toBeVisible();
    
    // Step 5: Check XP and Level Progress
    const currentXP = await page.textContent('[data-testid="current-xp"]');
    const currentLevel = await page.textContent('[data-testid="current-level"]');
    
    expect(parseInt(currentXP || '0')).toBeGreaterThan(0);
    expect(parseInt(currentLevel || '0')).toBeGreaterThanOrEqual(1);
    
    // Step 6: Generate Referral Link
    await page.click('[data-testid="referral-menu"]');
    await page.click('[data-testid="generate-referral"]');
    
    const referralLink = await page.inputValue('[data-testid="referral-link"]');
    expect(referralLink).toContain('ref=');
    
    // Step 7: Request Settlement
    await page.click('[data-testid="wallet-menu"]');
    
    const balance = await page.textContent('[data-testid="available-balance"]');
    if (parseInt(balance?.replace(/\D/g, '') || '0') >= 10000) {
      await page.click('[data-testid="request-settlement"]');
      
      // Fill settlement form
      await page.fill('[data-testid="settlement-amount"]', '10000');
      await page.fill('[data-testid="bank-name"]', '우리은행');
      await page.fill('[data-testid="account-number"]', '1234567890');
      await page.fill('[data-testid="account-holder"]', testData.user.name);
      
      await page.click('[data-testid="submit-settlement"]');
      await expect(page.locator('[data-testid="settlement-requested"]')).toBeVisible();
    }
  });

  test('Complete Advertiser Journey - 광고주 전체 플로우', async ({ page }) => {
    test.setTimeout(120000);

    // Step 1: Advertiser Registration and Business Setup
    await page.goto('http://localhost:9001');
    
    try {
      await page.click('[data-testid="signup-link"]');
      
      // Fill signup form
      await page.fill('[data-testid="email-input"]', testData.advertiser.email);
      await page.fill('[data-testid="password-input"]', testData.advertiser.password);
      await page.click('[data-testid="advertiser-signup"]');
      
      // Fill business information
      await page.fill('[data-testid="business-name"]', testData.advertiser.businessName);
      await page.fill('[data-testid="business-number"]', testData.advertiser.businessNumber);
      await page.fill('[data-testid="contact-person"]', testData.advertiser.contactPerson);
      await page.fill('[data-testid="contact-phone"]', testData.advertiser.contactPhone);
      
      await page.click('[data-testid="register-business"]');
      await expect(page.locator('[data-testid="business-registered"]')).toBeVisible();
      
    } catch (error) {
      // If already registered, login
      await loginUser(page, 'advertiser');
    }
    
    // Step 2: Account Verification and Credit Addition
    // Mock document upload
    const fileInput = page.locator('[data-testid="document-upload"]');
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles({
        name: 'business-license.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('mock pdf content')
      });
      
      await page.click('[data-testid="upload-document"]');
      await expect(page.locator('[data-testid="document-uploaded"]')).toBeVisible();
    }
    
    // Add account credit
    await page.click('[data-testid="billing-menu"]');
    await page.click('[data-testid="add-credit"]');
    
    await page.fill('[data-testid="amount-input"]', '200000');
    await page.selectOption('[data-testid="payment-method"]', 'card');
    await page.click('[data-testid="pay-button"]');
    
    // Mock payment processing
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible({ timeout: 15000 });
    
    // Step 3: Create New Campaign
    await page.click('[data-testid="campaigns-menu"]');
    await page.click('[data-testid="create-campaign"]');
    
    await createCampaign(page);
    
    // Step 4: Generate Deeplinks
    await page.click('[data-testid="deeplinks-menu"]');
    await page.fill('[data-testid="landing-url"]', testData.campaign.targetUrl);
    await page.fill('[data-testid="utm-source"]', 'facebook');
    await page.fill('[data-testid="utm-medium"]', 'cpc');
    
    await page.click('[data-testid="generate-deeplink"]');
    
    const deeplink = await page.inputValue('[data-testid="generated-deeplink"]');
    expect(deeplink).toContain('utm_source=facebook');
    
    // Step 5: Monitor Campaign Performance
    await page.click('[data-testid="campaign-analytics"]');
    
    // Wait for analytics to load
    await page.waitForSelector('[data-testid="analytics-chart"]');
    
    const impressions = await page.textContent('[data-testid="impressions-count"]');
    const clicks = await page.textContent('[data-testid="clicks-count"]');
    
    expect(impressions).toBeDefined();
    expect(clicks).toBeDefined();
    
    // Step 6: Manage Campaign Budget
    await page.click('[data-testid="budget-manager"]');
    await page.fill('[data-testid="daily-budget"]', '10000');
    await page.click('[data-testid="update-budget"]');
    
    await expect(page.locator('[data-testid="budget-updated"]')).toBeVisible();
  });

  test('Complete Admin Journey - 관리자 전체 플로우', async ({ page }) => {
    test.setTimeout(120000);

    // Step 1: Admin Login
    await loginUser(page, 'admin');
    
    // Step 2: Review Dashboard Metrics
    await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible();
    
    const totalUsers = await page.textContent('[data-testid="total-users"]');
    const activeCampaigns = await page.textContent('[data-testid="active-campaigns"]');
    const totalRevenue = await page.textContent('[data-testid="total-revenue"]');
    
    expect(totalUsers).toMatch(/\d+/);
    expect(activeCampaigns).toMatch(/\d+/);
    expect(totalRevenue).toMatch(/\d+/);
    
    // Step 3: Manage Users
    await page.click('[data-testid="users-menu"]');
    await page.waitForSelector('[data-testid="users-table"]');
    
    // Search for specific user
    await page.fill('[data-testid="user-search"]', testData.user.email);
    await page.click('[data-testid="search-button"]');
    
    // View user details
    await page.click('[data-testid="view-user-details"]');
    await expect(page.locator('[data-testid="user-detail-modal"]')).toBeVisible();
    
    // Close modal
    await page.click('[data-testid="close-modal"]');
    
    // Step 4: Review and Approve Campaigns
    await page.click('[data-testid="campaigns-menu"]');
    await page.click('[data-testid="pending-campaigns"]');
    
    // Approve first pending campaign if exists
    const approveButton = page.locator('[data-testid="approve-campaign"]').first();
    if (await approveButton.isVisible()) {
      await approveButton.click();
      await expect(page.locator('[data-testid="campaign-approved"]')).toBeVisible();
    }
    
    // Step 5: Process Settlement Requests
    await page.click('[data-testid="settlements-menu"]');
    
    const pendingSettlements = page.locator('[data-testid="pending-settlement"]');
    if (await pendingSettlements.first().isVisible()) {
      await page.click('[data-testid="review-settlement"]');
      
      // Approve settlement
      await page.click('[data-testid="approve-settlement"]');
      await expect(page.locator('[data-testid="settlement-approved"]')).toBeVisible();
    }
    
    // Step 6: Monitor System Health
    await page.click('[data-testid="monitoring-menu"]');
    await expect(page.locator('[data-testid="system-metrics"]')).toBeVisible();
    
    const serverLoad = await page.textContent('[data-testid="server-load"]');
    const errorRate = await page.textContent('[data-testid="error-rate"]');
    
    expect(parseFloat(serverLoad || '0')).toBeLessThan(100);
    expect(parseFloat(errorRate || '0')).toBeLessThan(10);
    
    // Step 7: Review Fraud Detection Alerts
    await page.click('[data-testid="fraud-detection"]');
    
    const fraudAlerts = page.locator('[data-testid="fraud-alert"]');
    if (await fraudAlerts.first().isVisible()) {
      await page.click('[data-testid="investigate-alert"]');
      await expect(page.locator('[data-testid="alert-details"]')).toBeVisible();
      
      // Dismiss alert
      await page.click('[data-testid="dismiss-alert"]');
    }
  });

  test('Cross-Platform Integration Flow - 플랫폼 간 연동 테스트', async ({ browser }) => {
    test.setTimeout(180000);

    // Create multiple browser contexts for different user types
    const userContext = await browser.newContext();
    const advertiserContext = await browser.newContext();
    const adminContext = await browser.newContext();

    const userPage = await userContext.newPage();
    const advertiserPage = await advertiserContext.newPage();
    const adminPage = await adminContext.newPage();

    try {
      // Step 1: Advertiser creates campaign
      await loginUser(advertiserPage, 'advertiser');
      await advertiserPage.click('[data-testid="create-campaign"]');
      await createCampaign(advertiserPage);
      
      // Get campaign ID from URL or element
      const campaignUrl = advertiserPage.url();
      const campaignId = campaignUrl.match(/campaign\/([^\/]+)/)?.[1];
      
      // Step 2: Admin approves campaign
      await loginUser(adminPage, 'admin');
      await adminPage.click('[data-testid="campaigns-menu"]');
      
      // Find and approve the campaign
      if (campaignId) {
        await adminPage.click(`[data-campaign-id="${campaignId}"] [data-testid="approve-campaign"]`);
        await expect(adminPage.locator('[data-testid="campaign-approved"]')).toBeVisible();
      }
      
      // Step 3: User joins approved campaign
      await loginUser(userPage, 'user');
      await userPage.click('[data-testid="campaigns-menu"]');
      
      // Find the approved campaign and join
      await userPage.click('[data-testid="refresh-campaigns"]');
      await userPage.waitForSelector(`[data-campaign-id="${campaignId}"]`);
      
      await userPage.click(`[data-campaign-id="${campaignId}"] [data-testid="join-campaign"]`);
      await expect(userPage.locator('[data-testid="campaign-joined"]')).toBeVisible();
      
      // Step 4: Complete campaign tasks
      await userPage.click('[data-testid="my-campaigns"]');
      await userPage.click(`[data-campaign-id="${campaignId}"] [data-testid="view-tasks"]`);
      
      // Complete first task
      await userPage.click('[data-testid="complete-task"]');
      await userPage.fill('[data-testid="task-proof"]', 'Completed task proof');
      await userPage.click('[data-testid="submit-proof"]');
      
      await expect(userPage.locator('[data-testid="task-submitted"]')).toBeVisible();
      
      // Step 5: Advertiser sees participation analytics
      await advertiserPage.click('[data-testid="campaign-analytics"]');
      await advertiserPage.waitForSelector('[data-testid="participant-count"]');
      
      const participantCount = await advertiserPage.textContent('[data-testid="participant-count"]');
      expect(parseInt(participantCount || '0')).toBeGreaterThan(0);
      
      // Step 6: Admin monitors overall activity
      await adminPage.click('[data-testid="dashboard"]');
      await adminPage.click('[data-testid="refresh-stats"]');
      
      const activeUsers = await adminPage.textContent('[data-testid="active-users"]');
      expect(parseInt(activeUsers || '0')).toBeGreaterThan(0);
      
    } finally {
      // Clean up contexts
      await userContext.close();
      await advertiserContext.close();
      await adminContext.close();
    }
  });

  test('Payment and Settlement Integration Flow - 결제 및 정산 통합 테스트', async ({ page }) => {
    test.setTimeout(120000);

    // Step 1: Advertiser adds credit and creates paid campaign
    await loginUser(page, 'advertiser');
    
    // Add credit
    await page.click('[data-testid="billing-menu"]');
    await page.click('[data-testid="add-credit"]');
    
    await page.fill('[data-testid="amount-input"]', '100000');
    await page.selectOption('[data-testid="payment-method"]', 'card');
    await page.click('[data-testid="pay-button"]');
    
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
    
    // Create campaign with payment
    await page.click('[data-testid="create-campaign"]');
    await createCampaign(page);
    
    // Verify campaign cost deducted
    await page.click('[data-testid="billing-menu"]');
    const balance = await page.textContent('[data-testid="account-balance"]');
    expect(parseInt(balance?.replace(/\D/g, '') || '0')).toBeLessThan(100000);
    
    // Step 2: Switch to user and earn rewards
    await page.goto('http://localhost:9000');
    await loginUser(page, 'user');
    
    // Join and complete campaign
    await page.click('[data-testid="campaigns-menu"]');
    await page.click('[data-testid="campaign-card"]');
    await page.click('[data-testid="join-campaign"]');
    
    // Complete tasks to earn money
    await page.click('[data-testid="complete-task"]');
    await page.fill('[data-testid="task-proof"]', 'Task completed');
    await page.click('[data-testid="submit-proof"]');
    
    await expect(page.locator('[data-testid="reward-earned"]')).toBeVisible();
    
    // Request settlement
    await page.click('[data-testid="wallet-menu"]');
    const availableBalance = await page.textContent('[data-testid="available-balance"]');
    
    if (parseInt(availableBalance?.replace(/\D/g, '') || '0') >= 10000) {
      await page.click('[data-testid="request-settlement"]');
      
      await page.fill('[data-testid="settlement-amount"]', '10000');
      await page.fill('[data-testid="bank-name"]', '우리은행');
      await page.fill('[data-testid="account-number"]', '1234567890');
      
      await page.click('[data-testid="submit-settlement"]');
      await expect(page.locator('[data-testid="settlement-requested"]')).toBeVisible();
    }
    
    // Step 3: Admin processes settlement
    await page.goto('http://localhost:9002');
    await loginUser(page, 'admin');
    
    await page.click('[data-testid="settlements-menu"]');
    
    const pendingSettlement = page.locator('[data-testid="pending-settlement"]').first();
    if (await pendingSettlement.isVisible()) {
      await page.click('[data-testid="approve-settlement"]');
      await expect(page.locator('[data-testid="settlement-approved"]')).toBeVisible();
    }
  });

  test('Mobile Responsiveness Test - 모바일 반응형 테스트', async ({ page }) => {
    test.setTimeout(60000);

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Test user app on mobile
    await page.goto('http://localhost:9000');
    
    // Check mobile navigation
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();
    
    // Test touch interactions
    await page.tap('[data-testid="campaigns-menu"]');
    await page.waitForSelector('[data-testid="campaign-list"]');
    
    // Test swipe gestures (if implemented)
    const campaignCard = page.locator('[data-testid="campaign-card"]').first();
    await campaignCard.hover();
    
    // Verify mobile-optimized layouts
    await expect(page.locator('[data-testid="campaign-grid"]')).toHaveCSS('grid-template-columns', /1fr/);
    
    // Test advertiser interface on mobile
    await page.goto('http://localhost:9001');
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Should have tablet-optimized layout
    await expect(page.locator('[data-testid="advertiser-dashboard"]')).toBeVisible();
    
    // Check responsive charts
    await page.click('[data-testid="analytics-menu"]');
    const chart = page.locator('[data-testid="analytics-chart"]');
    await expect(chart).toBeVisible();
    
    // Verify chart adapts to screen size
    const chartWidth = await chart.evaluate(el => el.clientWidth);
    expect(chartWidth).toBeLessThan(800);
  });

  test('Performance and Load Test - 성능 및 부하 테스트', async ({ page }) => {
    test.setTimeout(90000);

    // Test initial load performance
    const startTime = Date.now();
    await page.goto('http://localhost:9000');
    await page.waitForSelector('[data-testid="home-screen"]');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
    
    // Test large dataset handling
    await page.click('[data-testid="campaigns-menu"]');
    
    // Wait for campaigns to load and measure rendering time
    const renderStart = Date.now();
    await page.waitForSelector('[data-testid="campaign-list"]');
    const renderTime = Date.now() - renderStart;
    
    expect(renderTime).toBeLessThan(3000); // Should render within 3 seconds
    
    // Test memory usage by rapid navigation
    for (let i = 0; i < 10; i++) {
      await page.click('[data-testid="home-menu"]');
      await page.waitForSelector('[data-testid="home-screen"]');
      await page.click('[data-testid="campaigns-menu"]');
      await page.waitForSelector('[data-testid="campaign-list"]');
    }
    
    // Check for memory leaks (basic check)
    const performance = await page.evaluate(() => {
      return {
        memory: (performance as any).memory?.usedJSHeapSize,
        timing: performance.timing
      };
    });
    
    if (performance.memory) {
      expect(performance.memory).toBeLessThan(50 * 1024 * 1024); // Should use less than 50MB
    }
    
    // Test with many simultaneous requests
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        page.reload().then(() => page.waitForSelector('[data-testid="home-screen"]'))
      );
    }
    
    await Promise.all(promises);
    
    // All reloads should complete successfully
    await expect(page.locator('[data-testid="home-screen"]')).toBeVisible();
  });

  test('Error Handling and Recovery Test - 오류 처리 및 복구 테스트', async ({ page }) => {
    test.setTimeout(60000);

    // Test network failure scenarios
    await page.goto('http://localhost:9000');
    await loginUser(page, 'user');
    
    // Simulate network failure
    await page.route('**/api/**', route => route.abort());
    
    // Try to load campaigns (should show error)
    await page.click('[data-testid="campaigns-menu"]');
    await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
    
    // Test retry mechanism
    await page.unroute('**/api/**');
    await page.click('[data-testid="retry-button"]');
    await expect(page.locator('[data-testid="campaign-list"]')).toBeVisible();
    
    // Test form validation errors
    await page.click('[data-testid="profile-menu"]');
    await page.click('[data-testid="account-info"]');
    
    // Submit form with invalid data
    await page.fill('[data-testid="phone-input"]', 'invalid-phone');
    await page.click('[data-testid="save-profile"]');
    
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    
    // Fix validation and retry
    await page.fill('[data-testid="phone-input"]', '010-1234-5678');
    await page.click('[data-testid="save-profile"]');
    
    await expect(page.locator('[data-testid="profile-saved"]')).toBeVisible();
    
    // Test session expiry handling
    // This would require mocking auth state changes
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    await page.reload();
    
    // Should redirect to login
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
  });
});