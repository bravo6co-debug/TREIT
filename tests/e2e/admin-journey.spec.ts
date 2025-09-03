import { test, expect, Page } from '@playwright/test';

/**
 * Admin Journey E2E Tests for TreitMaster
 * Tests complete admin workflows and platform management functionality
 * @admin-app
 */

const testAdmin = {
  email: 'admin@treitmaster.com',
  password: 'AdminSecure123!',
  role: 'super_admin'
};

const mockData = {
  testUser: {
    email: 'test-user-admin@example.com',
    name: '테스트사용자',
    level: 3,
    totalEarnings: 125000,
    status: 'active'
  },
  testAdvertiser: {
    email: 'test-advertiser-admin@company.com',
    businessName: '테스트광고회사',
    status: 'pending_verification',
    totalSpent: 2500000
  },
  testCampaign: {
    title: '관리자테스트캠페인',
    advertiser: '테스트광고회사',
    status: 'pending_review',
    budget: 500000,
    participants: 25
  },
  fraudAlert: {
    type: 'suspicious_clicking',
    userId: 'user_123',
    severity: 'high',
    description: '단시간 내 과도한 클릭 패턴 감지'
  },
  settlementRequest: {
    userId: 'user_456',
    userName: '정산사용자',
    amount: 50000,
    status: 'pending',
    bankName: '우리은행',
    accountNumber: '1002-123-456789'
  }
};

// Helper functions for admin journey testing
async function loginAsAdmin(page: Page) {
  await page.goto('/');
  
  // Fill admin login credentials
  await page.fill('[data-testid="email-input"]', testAdmin.email);
  await page.fill('[data-testid="password-input"]', testAdmin.password);
  await page.click('[data-testid="login-button"]');
  
  // Wait for admin dashboard to load
  await page.waitForSelector('[data-testid="admin-dashboard"]', { timeout: 15000 });
  
  // Verify admin role
  const userRole = page.locator('[data-testid="user-role-indicator"]');
  if (await userRole.isVisible()) {
    const roleText = await userRole.textContent();
    expect(roleText).toContain('관리자');
  }
}

async function navigateToSection(page: Page, section: string) {
  const sectionMap = {
    'dashboard': '[data-testid="dashboard-menu"]',
    'users': '[data-testid="users-menu"]',
    'advertisers': '[data-testid="advertisers-menu"]',
    'campaigns': '[data-testid="campaigns-menu"]',
    'settlements': '[data-testid="settlements-menu"]',
    'fraud': '[data-testid="fraud-detection-menu"]',
    'analytics': '[data-testid="analytics-menu"]',
    'system': '[data-testid="system-monitoring-menu"]',
    'finance': '[data-testid="finance-menu"]'
  };
  
  const selector = sectionMap[section];
  if (selector) {
    await page.click(selector);
    await page.waitForSelector(`[data-testid="${section}-dashboard"]`);
  }
}

async function simulateRealTimeData(page: Page) {
  // Inject mock real-time data for testing
  await page.evaluate(() => {
    // Simulate WebSocket or SSE updates
    window.postMessage({
      type: 'ADMIN_DATA_UPDATE',
      data: {
        activeUsers: Math.floor(Math.random() * 1000) + 500,
        activeCampaigns: Math.floor(Math.random() * 50) + 25,
        todayEarnings: Math.floor(Math.random() * 1000000) + 500000,
        pendingReviews: Math.floor(Math.random() * 20) + 5
      }
    }, '*');
  });
}

test.describe('Admin Dashboard and Overview Journey', () => {
  test('@admin-app Admin dashboard overview and real-time metrics', async ({ page }) => {
    test.setTimeout(120000);

    await loginAsAdmin(page);
    
    // Verify dashboard components are visible
    const dashboardMetrics = [
      'total-users-count',
      'active-campaigns-count',
      'total-revenue',
      'pending-reviews-count',
      'fraud-alerts-count',
      'settlement-requests-count'
    ];
    
    for (const metric of dashboardMetrics) {
      const metricElement = page.locator(`[data-testid="${metric}"]`);
      await expect(metricElement).toBeVisible();
      
      const metricValue = await metricElement.textContent();
      expect(metricValue).toBeTruthy();
      expect(metricValue).toMatch(/\d+/); // Should contain numbers
    }
    
    // Test real-time updates
    await simulateRealTimeData(page);
    await page.waitForTimeout(2000);
    
    // Check if metrics updated
    const activeUsersAfterUpdate = await page.textContent('[data-testid="active-users-count"]');
    expect(activeUsersAfterUpdate).toBeTruthy();
    
    // Test dashboard filters
    await page.click('[data-testid="dashboard-filter-today"]');
    await page.waitForSelector('[data-testid="metrics-updated"]', { timeout: 5000 }).catch(() => {});
    
    await page.click('[data-testid="dashboard-filter-week"]');
    await page.waitForSelector('[data-testid="metrics-updated"]', { timeout: 5000 }).catch(() => {});
    
    // Test quick actions
    const quickActions = [
      'approve-pending-campaigns',
      'review-settlements',
      'check-fraud-alerts',
      'generate-report'
    ];
    
    for (const action of quickActions) {
      const actionButton = page.locator(`[data-testid="${action}"]`);
      if (await actionButton.isVisible()) {
        await expect(actionButton).toBeEnabled();
      }
    }
  });

  test('@admin-app System health monitoring and alerts', async ({ page }) => {
    test.setTimeout(90000);

    await loginAsAdmin(page);
    await navigateToSection(page, 'system');
    
    // Check system metrics
    const systemMetrics = [
      'server-cpu-usage',
      'memory-usage',
      'database-performance',
      'api-response-time',
      'error-rate',
      'active-connections'
    ];
    
    for (const metric of systemMetrics) {
      const metricCard = page.locator(`[data-testid="${metric}-card"]`);
      await expect(metricCard).toBeVisible();
      
      // Check metric values are within acceptable ranges
      const metricValue = await metricCard.locator('[data-testid="metric-value"]').textContent();
      const numericValue = parseFloat(metricValue?.replace(/[^\d.]/g, '') || '0');
      
      switch (metric) {
        case 'server-cpu-usage':
        case 'memory-usage':
          expect(numericValue).toBeLessThan(100);
          break;
        case 'api-response-time':
          expect(numericValue).toBeLessThan(2000); // Less than 2 seconds
          break;
        case 'error-rate':
          expect(numericValue).toBeLessThan(10); // Less than 10%
          break;
      }
    }
    
    // Test alert system
    await page.click('[data-testid="system-alerts-tab"]');
    
    const alertsList = page.locator('[data-testid="system-alerts-list"]');
    await expect(alertsList).toBeVisible();
    
    // Check if there are any critical alerts
    const criticalAlerts = page.locator('[data-testid="critical-alert"]');
    const criticalCount = await criticalAlerts.count();
    
    if (criticalCount > 0) {
      // Investigate first critical alert
      await criticalAlerts.first().click();
      await expect(page.locator('[data-testid="alert-details-modal"]')).toBeVisible();
      
      await page.click('[data-testid="acknowledge-alert"]');
      await expect(page.locator('[data-testid="alert-acknowledged"]')).toBeVisible();
      
      await page.click('[data-testid="close-alert-modal"]');
    }
    
    // Test system configuration
    await page.click('[data-testid="system-config-tab"]');
    
    const configSections = page.locator('[data-testid="config-section"]');
    const configCount = await configSections.count();
    expect(configCount).toBeGreaterThan(0);
  });

  test('@admin-app Analytics and reporting dashboard', async ({ page }) => {
    test.setTimeout(90000);

    await loginAsAdmin(page);
    await navigateToSection(page, 'analytics');
    
    // Check main analytics charts
    const analyticsCharts = [
      'user-growth-chart',
      'revenue-chart',
      'campaign-performance-chart',
      'engagement-metrics-chart'
    ];
    
    for (const chart of analyticsCharts) {
      const chartElement = page.locator(`[data-testid="${chart}"]`);
      await expect(chartElement).toBeVisible();
      
      // Test chart interactions
      await chartElement.hover();
      
      // Check if tooltip appears
      const tooltip = page.locator('[data-testid="chart-tooltip"]');
      if (await tooltip.isVisible()) {
        const tooltipContent = await tooltip.textContent();
        expect(tooltipContent).toBeTruthy();
      }
    }
    
    // Test date range filtering
    await page.click('[data-testid="date-range-picker"]');
    await page.click('[data-testid="last-30-days"]');
    
    // Wait for charts to update
    await page.waitForTimeout(3000);
    
    // Test report generation
    await page.click('[data-testid="generate-report-button"]');
    await page.waitForSelector('[data-testid="report-options-modal"]');
    
    // Select report options
    await page.check('[data-testid="include-user-stats"]');
    await page.check('[data-testid="include-financial-data"]');
    await page.check('[data-testid="include-campaign-metrics"]');
    
    await page.selectOption('[data-testid="report-format"]', 'pdf');
    
    // Generate report
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="generate-report-confirm"]');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.pdf');
  });
});

test.describe('User Management Journey', () => {
  test('@admin-app User management and moderation', async ({ page }) => {
    test.setTimeout(120000);

    await loginAsAdmin(page);
    await navigateToSection(page, 'users');
    
    // Test user search and filtering
    await page.fill('[data-testid="user-search-input"]', mockData.testUser.email);
    await page.click('[data-testid="search-users-button"]');
    
    await page.waitForSelector('[data-testid="users-table"]');
    
    // Check if user appears in search results
    const userRows = page.locator('[data-testid="user-row"]');
    const userCount = await userRows.count();
    
    if (userCount > 0) {
      const firstUser = userRows.first();
      
      // View user details
      await firstUser.click();
      await page.waitForSelector('[data-testid="user-details-modal"]');
      
      // Check user information sections
      const userInfoSections = [
        'basic-info',
        'account-status',
        'activity-history',
        'earnings-summary',
        'social-connections'
      ];
      
      for (const section of userInfoSections) {
        const sectionElement = page.locator(`[data-testid="user-${section}"]`);
        await expect(sectionElement).toBeVisible();
      }
      
      // Test user actions
      const userActions = page.locator('[data-testid="user-action-button"]');
      const actionCount = await userActions.count();
      expect(actionCount).toBeGreaterThan(0);
      
      // Test user suspension (if appropriate)
      const suspendButton = page.locator('[data-testid="suspend-user-button"]');
      if (await suspendButton.isVisible()) {
        await suspendButton.click();
        
        await page.waitForSelector('[data-testid="suspension-form"]');
        await page.selectOption('[data-testid="suspension-reason"]', 'policy_violation');
        await page.fill('[data-testid="suspension-duration"]', '7');
        await page.fill('[data-testid="suspension-notes"]', '테스트 목적의 임시 정지');
        
        await page.click('[data-testid="confirm-suspension"]');
        await expect(page.locator('[data-testid="user-suspended"]')).toBeVisible();
      }
      
      await page.click('[data-testid="close-user-modal"]');
    }
    
    // Test bulk user actions
    await page.check('[data-testid="select-all-users"]');
    await page.click('[data-testid="bulk-actions-dropdown"]');
    
    const bulkActions = page.locator('[data-testid="bulk-action-option"]');
    const bulkActionCount = await bulkActions.count();
    expect(bulkActionCount).toBeGreaterThan(0);
  });

  test('@admin-app User verification and KYC process', async ({ page }) => {
    test.setTimeout(90000);

    await loginAsAdmin(page);
    await navigateToSection(page, 'users');
    
    // Filter for pending verification users
    await page.click('[data-testid="filter-pending-verification"]');
    await page.waitForSelector('[data-testid="users-table"]');
    
    const pendingUsers = page.locator('[data-testid="pending-verification-user"]');
    const pendingCount = await pendingUsers.count();
    
    if (pendingCount > 0) {
      // Process first pending verification
      await pendingUsers.first().click();
      await page.waitForSelector('[data-testid="verification-details-modal"]');
      
      // Review submitted documents
      const documentList = page.locator('[data-testid="verification-document"]');
      const documentCount = await documentList.count();
      
      for (let i = 0; i < documentCount; i++) {
        const document = documentList.nth(i);
        await document.click();
        
        // Check document details
        await expect(page.locator('[data-testid="document-viewer"]')).toBeVisible();
        
        // Mark document as reviewed
        await page.click('[data-testid="mark-reviewed"]');
        
        await page.click('[data-testid="close-document-viewer"]');
      }
      
      // Make verification decision
      await page.click('[data-testid="approve-verification"]');
      await page.fill('[data-testid="verification-notes"]', '모든 서류가 적절하게 제출되었습니다.');
      
      await page.click('[data-testid="confirm-approval"]');
      await expect(page.locator('[data-testid="verification-approved"]')).toBeVisible();
      
      await page.click('[data-testid="close-verification-modal"]');
    }
    
    // Check verification statistics
    await page.click('[data-testid="verification-stats-tab"]');
    
    const verificationMetrics = [
      'total-pending',
      'approved-today',
      'rejected-today',
      'average-processing-time'
    ];
    
    for (const metric of verificationMetrics) {
      const metricValue = page.locator(`[data-testid="${metric}-value"]`);
      await expect(metricValue).toBeVisible();
    }
  });

  test('@admin-app User activity monitoring and analytics', async ({ page }) => {
    test.setTimeout(90000);

    await loginAsAdmin(page);
    await navigateToSection(page, 'users');
    
    // Navigate to user analytics
    await page.click('[data-testid="user-analytics-tab"]');
    await page.waitForSelector('[data-testid="user-analytics-dashboard"]');
    
    // Check user behavior metrics
    const behaviorMetrics = [
      'daily-active-users',
      'weekly-retention-rate',
      'average-session-duration',
      'bounce-rate',
      'conversion-rate'
    ];
    
    for (const metric of behaviorMetrics) {
      const metricCard = page.locator(`[data-testid="${metric}-card"]`);
      await expect(metricCard).toBeVisible();
      
      const metricValue = await metricCard.locator('[data-testid="metric-value"]').textContent();
      expect(metricValue).toBeTruthy();
    }
    
    // Test user segmentation
    await page.click('[data-testid="user-segments-tab"]');
    
    const segmentList = page.locator('[data-testid="user-segment"]');
    const segmentCount = await segmentList.count();
    
    if (segmentCount > 0) {
      const firstSegment = segmentList.first();
      await firstSegment.click();
      
      // View segment details
      await expect(page.locator('[data-testid="segment-details"]')).toBeVisible();
      await expect(page.locator('[data-testid="segment-size"]')).toBeVisible();
      await expect(page.locator('[data-testid="segment-characteristics"]')).toBeVisible();
    }
    
    // Test cohort analysis
    await page.click('[data-testid="cohort-analysis-tab"]');
    await page.waitForSelector('[data-testid="cohort-chart"]');
    
    const cohortChart = page.locator('[data-testid="cohort-chart"]');
    await expect(cohortChart).toBeVisible();
    
    // Test different cohort periods
    await page.selectOption('[data-testid="cohort-period"]', 'monthly');
    await page.waitForTimeout(2000); // Wait for chart update
  });
});

test.describe('Advertiser and Campaign Management Journey', () => {
  test('@admin-app Advertiser verification and approval process', async ({ page }) => {
    test.setTimeout(120000);

    await loginAsAdmin(page);
    await navigateToSection(page, 'advertisers');
    
    // Filter for pending advertisers
    await page.click('[data-testid="filter-pending-advertisers"]');
    await page.waitForSelector('[data-testid="advertisers-table"]');
    
    const pendingAdvertisers = page.locator('[data-testid="pending-advertiser-row"]');
    const pendingCount = await pendingAdvertisers.count();
    
    if (pendingCount > 0) {
      // Review first pending advertiser
      await pendingAdvertisers.first().click();
      await page.waitForSelector('[data-testid="advertiser-review-modal"]');
      
      // Check business information
      const businessSections = [
        'company-details',
        'contact-information',
        'business-documents',
        'financial-information'
      ];
      
      for (const section of businessSections) {
        const sectionTab = page.locator(`[data-testid="${section}-tab"]`);
        if (await sectionTab.isVisible()) {
          await sectionTab.click();
          await expect(page.locator(`[data-testid="${section}-content"]`)).toBeVisible();
        }
      }
      
      // Review business documents
      await page.click('[data-testid="business-documents-tab"]');
      
      const documents = page.locator('[data-testid="business-document"]');
      const docCount = await documents.count();
      
      for (let i = 0; i < docCount; i++) {
        const document = documents.nth(i);
        await document.click();
        
        // Verify document
        await page.click('[data-testid="verify-document"]');
        await page.fill('[data-testid="document-notes"]', '서류가 유효합니다.');
        await page.click('[data-testid="confirm-verification"]');
      }
      
      // Approve advertiser
      await page.click('[data-testid="approve-advertiser"]');
      await page.fill('[data-testid="approval-notes"]', '모든 요구사항을 충족하여 승인됩니다.');
      await page.click('[data-testid="confirm-approval"]');
      
      await expect(page.locator('[data-testid="advertiser-approved"]')).toBeVisible();
      
      await page.click('[data-testid="close-review-modal"]');
    }
    
    // Check advertiser analytics
    await page.click('[data-testid="advertiser-analytics-tab"]');
    
    const advertiserMetrics = [
      'total-advertisers',
      'active-campaigns',
      'total-ad-spend',
      'average-campaign-performance'
    ];
    
    for (const metric of advertiserMetrics) {
      const metricCard = page.locator(`[data-testid="${metric}-card"]`);
      await expect(metricCard).toBeVisible();
    }
  });

  test('@admin-app Campaign review and moderation', async ({ page }) => {
    test.setTimeout(120000);

    await loginAsAdmin(page);
    await navigateToSection(page, 'campaigns');
    
    // Filter for campaigns pending review
    await page.click('[data-testid="filter-pending-campaigns"]');
    await page.waitForSelector('[data-testid="campaigns-table"]');
    
    const pendingCampaigns = page.locator('[data-testid="pending-campaign-row"]');
    const pendingCount = await pendingCampaigns.count();
    
    if (pendingCount > 0) {
      // Review first pending campaign
      await pendingCampaigns.first().click();
      await page.waitForSelector('[data-testid="campaign-review-modal"]');
      
      // Check campaign details
      const campaignSections = [
        'basic-info',
        'targeting-settings',
        'budget-allocation',
        'creative-assets',
        'compliance-check'
      ];
      
      for (const section of campaignSections) {
        const sectionTab = page.locator(`[data-testid="${section}-tab"]`);
        await sectionTab.click();
        await expect(page.locator(`[data-testid="${section}-panel"]`)).toBeVisible();
      }
      
      // Review creative assets
      await page.click('[data-testid="creative-assets-tab"]');
      
      const creativeAssets = page.locator('[data-testid="creative-asset"]');
      const assetCount = await creativeAssets.count();
      
      for (let i = 0; i < assetCount; i++) {
        const asset = creativeAssets.nth(i);
        await asset.click();
        
        // Check asset compliance
        await page.click('[data-testid="check-compliance"]');
        
        const complianceResult = await page.waitForSelector('[data-testid="compliance-result"]');
        const resultText = await complianceResult.textContent();
        
        if (resultText?.includes('위반')) {
          // Handle policy violation
          await page.click('[data-testid="flag-violation"]');
          await page.fill('[data-testid="violation-reason"]', '부적절한 콘텐츠 포함');
          await page.click('[data-testid="confirm-flag"]');
        } else {
          // Approve asset
          await page.click('[data-testid="approve-asset"]');
        }
      }
      
      // Make final campaign decision
      await page.click('[data-testid="compliance-check-tab"]');
      
      const complianceChecks = [
        'content-policy',
        'target-audience-appropriate',
        'budget-reasonable',
        'advertiser-verified'
      ];
      
      for (const check of complianceChecks) {
        const checkBox = page.locator(`[data-testid="compliance-${check}"]`);
        await checkBox.check();
      }
      
      // Approve campaign
      await page.click('[data-testid="approve-campaign"]');
      await page.fill('[data-testid="approval-notes"]', '모든 정책을 준수하여 승인됩니다.');
      await page.click('[data-testid="confirm-campaign-approval"]');
      
      await expect(page.locator('[data-testid="campaign-approved"]')).toBeVisible();
      
      await page.click('[data-testid="close-review-modal"]');
    }
  });

  test('@admin-app Campaign performance monitoring', async ({ page }) => {
    test.setTimeout(90000);

    await loginAsAdmin(page);
    await navigateToSection(page, 'campaigns');
    
    // Navigate to campaign analytics
    await page.click('[data-testid="campaign-analytics-tab"]');
    await page.waitForSelector('[data-testid="campaign-analytics-dashboard"]');
    
    // Check overall campaign metrics
    const campaignMetrics = [
      'total-active-campaigns',
      'total-impressions',
      'total-clicks',
      'average-ctr',
      'total-conversions',
      'total-ad-spend'
    ];
    
    for (const metric of campaignMetrics) {
      const metricCard = page.locator(`[data-testid="${metric}-card"]`);
      await expect(metricCard).toBeVisible();
      
      const metricValue = await metricCard.locator('[data-testid="metric-value"]').textContent();
      expect(metricValue).toBeTruthy();
    }
    
    // Test campaign comparison
    await page.click('[data-testid="top-campaigns-tab"]');
    
    const topCampaignsList = page.locator('[data-testid="top-campaigns-list"]');
    await expect(topCampaignsList).toBeVisible();
    
    const campaignItems = page.locator('[data-testid="campaign-performance-item"]');
    const itemCount = await campaignItems.count();
    
    if (itemCount > 0) {
      // Click on first campaign to view details
      await campaignItems.first().click();
      await expect(page.locator('[data-testid="campaign-detail-analytics"]')).toBeVisible();
      
      // Check detailed performance metrics
      const detailMetrics = [
        'impressions-chart',
        'clicks-chart',
        'conversion-funnel',
        'audience-demographics'
      ];
      
      for (const metric of detailMetrics) {
        const metricChart = page.locator(`[data-testid="${metric}"]`);
        await expect(metricChart).toBeVisible();
      }
    }
    
    // Test campaign alerts and notifications
    await page.click('[data-testid="campaign-alerts-tab"]');
    
    const alertsList = page.locator('[data-testid="campaign-alerts-list"]');
    await expect(alertsList).toBeVisible();
    
    const alerts = page.locator('[data-testid="campaign-alert"]');
    const alertCount = await alerts.count();
    
    if (alertCount > 0) {
      // Process first alert
      await alerts.first().click();
      await page.click('[data-testid="investigate-alert"]');
      
      // Take appropriate action
      await page.fill('[data-testid="alert-action-notes"]', '알림을 확인하고 조치를 취했습니다.');
      await page.click('[data-testid="resolve-alert"]');
    }
  });
});

test.describe('Financial Management and Settlement Journey', () => {
  test('@admin-app Settlement request processing', async ({ page }) => {
    test.setTimeout(120000);

    await loginAsAdmin(page);
    await navigateToSection(page, 'settlements');
    
    // Check pending settlements
    await page.click('[data-testid="pending-settlements-tab"]');
    await page.waitForSelector('[data-testid="settlements-table"]');
    
    const pendingSettlements = page.locator('[data-testid="pending-settlement-row"]');
    const pendingCount = await pendingSettlements.count();
    
    if (pendingCount > 0) {
      // Process first pending settlement
      await pendingSettlements.first().click();
      await page.waitForSelector('[data-testid="settlement-review-modal"]');
      
      // Review settlement details
      const settlementSections = [
        'user-info',
        'earnings-breakdown',
        'bank-details',
        'verification-status'
      ];
      
      for (const section of settlementSections) {
        const sectionTab = page.locator(`[data-testid="${section}-tab"]`);
        await sectionTab.click();
        await expect(page.locator(`[data-testid="${section}-content"]`)).toBeVisible();
      }
      
      // Verify bank account details
      await page.click('[data-testid="bank-details-tab"]');
      await page.click('[data-testid="verify-bank-account"]');
      
      // Mock bank verification response
      await page.evaluate(() => {
        window.postMessage({
          type: 'BANK_VERIFICATION_RESULT',
          data: { verified: true, accountHolder: '정산사용자' }
        }, '*');
      });
      
      await expect(page.locator('[data-testid="bank-account-verified"]')).toBeVisible();
      
      // Check earnings breakdown
      await page.click('[data-testid="earnings-breakdown-tab"]');
      
      const earningsItems = page.locator('[data-testid="earnings-item"]');
      const earningsCount = await earningsItems.count();
      
      for (let i = 0; i < earningsCount; i++) {
        const earningsItem = earningsItems.nth(i);
        await expect(earningsItem.locator('[data-testid="earnings-source"]')).toBeVisible();
        await expect(earningsItem.locator('[data-testid="earnings-amount"]')).toBeVisible();
        await expect(earningsItem.locator('[data-testid="earnings-date"]')).toBeVisible();
      }
      
      // Calculate fees
      const settlementAmount = await page.textContent('[data-testid="settlement-amount"]');
      const amountNumber = parseInt(settlementAmount?.replace(/\D/g, '') || '0');
      
      const processingFee = Math.round(amountNumber * 0.03); // 3% fee
      await expect(page.locator('[data-testid="processing-fee"]')).toContainText(processingFee.toString());
      
      // Approve settlement
      await page.click('[data-testid="approve-settlement"]');
      await page.fill('[data-testid="approval-notes"]', '모든 확인이 완료되어 정산을 승인합니다.');
      await page.click('[data-testid="confirm-settlement-approval"]');
      
      await expect(page.locator('[data-testid="settlement-approved"]')).toBeVisible();
      
      await page.click('[data-testid="close-settlement-modal"]');
    }
    
    // Check settlement statistics
    await page.click('[data-testid="settlement-stats-tab"]');
    
    const settlementMetrics = [
      'total-settlements-today',
      'total-amount-processed',
      'average-processing-time',
      'pending-settlements-count'
    ];
    
    for (const metric of settlementMetrics) {
      const metricCard = page.locator(`[data-testid="${metric}-card"]`);
      await expect(metricCard).toBeVisible();
    }
  });

  test('@admin-app Financial reporting and analytics', async ({ page }) => {
    test.setTimeout(90000);

    await loginAsAdmin(page);
    await navigateToSection(page, 'finance');
    
    // Check financial dashboard
    await page.waitForSelector('[data-testid="financial-dashboard"]');
    
    // Review key financial metrics
    const financialMetrics = [
      'total-revenue',
      'total-expenses',
      'net-profit',
      'platform-commission',
      'settlement-obligations',
      'cash-flow'
    ];
    
    for (const metric of financialMetrics) {
      const metricCard = page.locator(`[data-testid="${metric}-card"]`);
      await expect(metricCard).toBeVisible();
      
      const metricValue = await metricCard.locator('[data-testid="metric-value"]').textContent();
      expect(metricValue).toBeTruthy();
    }
    
    // Test financial charts
    const financialCharts = [
      'revenue-trend',
      'expense-breakdown',
      'profit-margin',
      'settlement-volume'
    ];
    
    for (const chart of financialCharts) {
      const chartElement = page.locator(`[data-testid="${chart}-chart"]`);
      await expect(chartElement).toBeVisible();
      
      // Test chart interactions
      await chartElement.hover();
    }
    
    // Generate financial report
    await page.click('[data-testid="generate-financial-report"]');
    await page.waitForSelector('[data-testid="report-generation-modal"]');
    
    // Select report parameters
    await page.selectOption('[data-testid="report-period"]', 'monthly');
    await page.check('[data-testid="include-revenue-details"]');
    await page.check('[data-testid="include-expense-breakdown"]');
    await page.check('[data-testid="include-settlement-data"]');
    
    // Generate report
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="generate-report"]');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('financial-report');
  });

  test('@admin-app Tax and compliance management', async ({ page }) => {
    test.setTimeout(90000);

    await loginAsAdmin(page);
    await navigateToSection(page, 'finance');
    
    // Navigate to tax management
    await page.click('[data-testid="tax-management-tab"]');
    await page.waitForSelector('[data-testid="tax-dashboard"]');
    
    // Check tax obligations
    const taxMetrics = [
      'vat-collected',
      'income-tax-withheld',
      'quarterly-obligations',
      'annual-obligations'
    ];
    
    for (const metric of taxMetrics) {
      const metricCard = page.locator(`[data-testid="${metric}-card"]`);
      await expect(metricCard).toBeVisible();
    }
    
    // Review tax reports
    await page.click('[data-testid="tax-reports-tab"]');
    
    const taxReports = page.locator('[data-testid="tax-report-item"]');
    const reportCount = await taxReports.count();
    
    if (reportCount > 0) {
      // Download first tax report
      const downloadPromise = page.waitForEvent('download');
      await taxReports.first().click();
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/tax.*report/i);
    }
    
    // Configure tax settings
    await page.click('[data-testid="tax-settings-tab"]');
    
    await page.fill('[data-testid="vat-rate"]', '10');
    await page.fill('[data-testid="withholding-tax-rate"]', '3.3');
    
    await page.click('[data-testid="save-tax-settings"]');
    await expect(page.locator('[data-testid="tax-settings-saved"]')).toBeVisible();
  });
});

test.describe('Fraud Detection and Security Journey', () => {
  test('@admin-app Fraud detection and investigation', async ({ page }) => {
    test.setTimeout(120000);

    await loginAsAdmin(page);
    await navigateToSection(page, 'fraud');
    
    // Check fraud detection dashboard
    await page.waitForSelector('[data-testid="fraud-detection-dashboard"]');
    
    // Review fraud alerts
    const fraudMetrics = [
      'active-alerts',
      'investigated-today',
      'false-positive-rate',
      'prevented-losses'
    ];
    
    for (const metric of fraudMetrics) {
      const metricCard = page.locator(`[data-testid="${metric}-card"]`);
      await expect(metricCard).toBeVisible();
    }
    
    // Check active fraud alerts
    await page.click('[data-testid="active-alerts-tab"]');
    
    const fraudAlerts = page.locator('[data-testid="fraud-alert-item"]');
    const alertCount = await fraudAlerts.count();
    
    if (alertCount > 0) {
      // Investigate first alert
      await fraudAlerts.first().click();
      await page.waitForSelector('[data-testid="fraud-investigation-modal"]');
      
      // Review alert details
      const alertSections = [
        'alert-summary',
        'user-activity',
        'suspicious-patterns',
        'risk-assessment'
      ];
      
      for (const section of alertSections) {
        const sectionTab = page.locator(`[data-testid="${section}-tab"]`);
        await sectionTab.click();
        await expect(page.locator(`[data-testid="${section}-content"]`)).toBeVisible();
      }
      
      // Analyze suspicious activity
      await page.click('[data-testid="suspicious-patterns-tab"]');
      
      const suspiciousPatterns = page.locator('[data-testid="suspicious-pattern"]');
      const patternCount = await suspiciousPatterns.count();
      
      for (let i = 0; i < patternCount; i++) {
        const pattern = suspiciousPatterns.nth(i);
        await expect(pattern.locator('[data-testid="pattern-description"]')).toBeVisible();
        await expect(pattern.locator('[data-testid="risk-level"]')).toBeVisible();
      }
      
      // Make investigation decision
      await page.click('[data-testid="risk-assessment-tab"]');
      
      const riskScore = await page.textContent('[data-testid="calculated-risk-score"]');
      const riskValue = parseInt(riskScore?.replace(/\D/g, '') || '0');
      
      if (riskValue > 70) {
        // High risk - take action
        await page.click('[data-testid="confirm-fraud"]');
        await page.selectOption('[data-testid="action-type"]', 'suspend_account');
        await page.fill('[data-testid="action-reason"]', '의심스러운 활동 패턴으로 인한 계정 정지');
      } else {
        // Low risk - mark as false positive
        await page.click('[data-testid="mark-false-positive"]');
        await page.fill('[data-testid="false-positive-reason"]', '정상적인 사용자 활동으로 판단됨');
      }
      
      await page.click('[data-testid="submit-investigation"]');
      await expect(page.locator('[data-testid="investigation-completed"]')).toBeVisible();
      
      await page.click('[data-testid="close-investigation-modal"]');
    }
  });

  test('@admin-app Security monitoring and threat analysis', async ({ page }) => {
    test.setTimeout(90000);

    await loginAsAdmin(page);
    await navigateToSection(page, 'fraud');
    
    // Navigate to security monitoring
    await page.click('[data-testid="security-monitoring-tab"]');
    await page.waitForSelector('[data-testid="security-dashboard"]');
    
    // Check security metrics
    const securityMetrics = [
      'failed-login-attempts',
      'blocked-ips',
      'suspicious-registrations',
      'api-abuse-attempts'
    ];
    
    for (const metric of securityMetrics) {
      const metricCard = page.locator(`[data-testid="${metric}-card"]`);
      await expect(metricCard).toBeVisible();
    }
    
    // Review blocked IPs
    await page.click('[data-testid="blocked-ips-tab"]');
    
    const blockedIps = page.locator('[data-testid="blocked-ip-item"]');
    const ipCount = await blockedIps.count();
    
    if (ipCount > 0) {
      // Review first blocked IP
      await blockedIps.first().click();
      await page.waitForSelector('[data-testid="ip-details-modal"]');
      
      // Check IP information
      await expect(page.locator('[data-testid="ip-address"]')).toBeVisible();
      await expect(page.locator('[data-testid="block-reason"]')).toBeVisible();
      await expect(page.locator('[data-testid="block-duration"]')).toBeVisible();
      
      // Optionally unblock IP
      const unblockButton = page.locator('[data-testid="unblock-ip"]');
      if (await unblockButton.isVisible()) {
        await unblockButton.click();
        await page.fill('[data-testid="unblock-reason"]', '테스트 목적으로 차단 해제');
        await page.click('[data-testid="confirm-unblock"]');
      }
      
      await page.click('[data-testid="close-ip-modal"]');
    }
    
    // Check threat intelligence
    await page.click('[data-testid="threat-intelligence-tab"]');
    
    const threatFeeds = page.locator('[data-testid="threat-feed-item"]');
    const threatCount = await threatFeeds.count();
    
    if (threatCount > 0) {
      await expect(threatFeeds.first().locator('[data-testid="threat-type"]')).toBeVisible();
      await expect(threatFeeds.first().locator('[data-testid="threat-severity"]')).toBeVisible();
    }
  });

  test('@admin-app Fraud prevention rule management', async ({ page }) => {
    test.setTimeout(90000);

    await loginAsAdmin(page);
    await navigateToSection(page, 'fraud');
    
    // Navigate to fraud rules
    await page.click('[data-testid="fraud-rules-tab"]');
    await page.waitForSelector('[data-testid="fraud-rules-list"]');
    
    // Check existing fraud rules
    const fraudRules = page.locator('[data-testid="fraud-rule-item"]');
    const ruleCount = await fraudRules.count();
    
    expect(ruleCount).toBeGreaterThan(0);
    
    // Create new fraud rule
    await page.click('[data-testid="create-fraud-rule"]');
    await page.waitForSelector('[data-testid="fraud-rule-form"]');
    
    // Fill rule details
    await page.fill('[data-testid="rule-name"]', '과도한 클릭 패턴 감지');
    await page.selectOption('[data-testid="rule-type"]', 'click_frequency');
    
    // Set rule conditions
    await page.fill('[data-testid="threshold-value"]', '10');
    await page.selectOption('[data-testid="threshold-period"]', 'minutes');
    await page.selectOption('[data-testid="action-type"]', 'flag_for_review');
    
    // Set rule severity
    await page.selectOption('[data-testid="severity-level"]', 'medium');
    
    // Enable rule
    await page.check('[data-testid="enable-rule"]');
    
    // Save rule
    await page.click('[data-testid="save-fraud-rule"]');
    await expect(page.locator('[data-testid="fraud-rule-created"]')).toBeVisible();
    
    // Test rule modification
    const newRule = page.locator('[data-testid="fraud-rule-item"]').last();
    await newRule.click();
    
    // Edit rule
    await page.click('[data-testid="edit-rule"]');
    await page.fill('[data-testid="threshold-value"]', '15'); // Modify threshold
    await page.click('[data-testid="save-rule-changes"]');
    
    await expect(page.locator('[data-testid="rule-updated"]')).toBeVisible();
  });
});

test.describe('@admin-app Admin Performance and Scalability', () => {
  test('Admin dashboard performance under load', async ({ page }) => {
    test.setTimeout(120000);

    await loginAsAdmin(page);
    
    // Measure dashboard load time
    const startTime = Date.now();
    await page.reload();
    await page.waitForSelector('[data-testid="admin-dashboard"]');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
    
    // Test rapid navigation between sections
    const sections = ['users', 'campaigns', 'settlements', 'analytics'];
    
    for (const section of sections) {
      const navigationStart = Date.now();
      await navigateToSection(page, section);
      const navigationTime = Date.now() - navigationStart;
      
      expect(navigationTime).toBeLessThan(3000); // Each section should load within 3 seconds
    }
    
    // Test large data table performance
    await navigateToSection(page, 'users');
    
    // Load maximum number of users per page
    await page.selectOption('[data-testid="items-per-page"]', '100');
    await page.waitForSelector('[data-testid="users-table"]');
    
    const userRows = page.locator('[data-testid="user-row"]');
    const userCount = await userRows.count();
    
    expect(userCount).toBeGreaterThan(0);
    
    // Test sorting performance
    const sortStart = Date.now();
    await page.click('[data-testid="sort-by-created-date"]');
    await page.waitForSelector('[data-testid="users-table"]');
    const sortTime = Date.now() - sortStart;
    
    expect(sortTime).toBeLessThan(2000); // Sorting should complete within 2 seconds
  });
});