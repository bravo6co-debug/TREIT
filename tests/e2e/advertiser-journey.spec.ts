import { test, expect, Page } from '@playwright/test';

/**
 * Advertiser Journey E2E Tests for TreitMaster
 * Tests complete advertiser workflows and business functionality
 * @advertiser-app
 */

const testAdvertisers = {
  newAdvertiser: {
    email: `advertiser-${Date.now()}@company.com`,
    password: 'AdvertiserPass123!',
    businessName: '테스트 마케팅 주식회사',
    businessNumber: '123-45-67890',
    contactPerson: '김광고담당',
    contactPhone: '02-1234-5678',
    website: 'https://testmarketing.co.kr',
    industry: '패션/뷰티'
  },
  existingAdvertiser: {
    email: 'existing-advertiser@company.com',
    password: 'ExistingPass123!',
    businessName: '기존광고사'
  }
};

const testCampaigns = {
  basicCampaign: {
    title: '신제품 런칭 캠페인',
    description: '새로운 스킨케어 제품을 소개하는 인플루언서 마케팅 캠페인입니다.',
    category: '뷰티',
    targetUrl: 'https://example.com/new-skincare',
    budget: 500000,
    dailyBudget: 50000,
    reward: 5000,
    duration: 30,
    targetAudience: '20-35세 여성',
    requirements: ['인스타그램 팔로워 1000명 이상', '뷰티 관련 포스팅 경험']
  },
  premiumCampaign: {
    title: '브랜드 앰배서더 모집',
    description: '장기간 브랜드를 대표할 앰배서더를 모집합니다.',
    category: '패션',
    targetUrl: 'https://example.com/ambassador-program',
    budget: 2000000,
    dailyBudget: 100000,
    reward: 50000,
    duration: 90,
    targetAudience: '전 연령층',
    requirements: ['인스타그램 팔로워 10000명 이상', '패션 인플루언서 경험']
  }
};

const testTemplates = {
  socialMediaPost: {
    name: '소셜미디어 포스팅 템플릿',
    type: 'instagram-post',
    content: '✨ 새로운 제품을 소개합니다! ✨\n\n#신제품 #추천 #협찬',
    hashtags: ['#신제품', '#추천', '#협찬'],
    requirements: ['제품 사진 필수', '해시태그 포함', '스토리 업로드']
  },
  reviewTemplate: {
    name: '제품 리뷰 템플릿',
    type: 'product-review',
    content: '제품을 사용해보니 정말 만족스럽습니다. 추천해요!',
    requirements: ['최소 100자 이상 리뷰', '별점 4점 이상', '사용 후기 포함']
  }
};

// Helper functions for advertiser journey testing
async function completeAdvertiserRegistration(page: Page, advertiserData: any) {
  await page.click('[data-testid="signup-link"]');
  await page.waitForSelector('[data-testid="advertiser-signup-form"]');
  
  // Select advertiser type
  await page.click('[data-testid="advertiser-type-radio"]');
  
  // Fill basic information
  await page.fill('[data-testid="email-input"]', advertiserData.email);
  await page.fill('[data-testid="password-input"]', advertiserData.password);
  await page.fill('[data-testid="confirm-password-input"]', advertiserData.password);
  
  // Fill business information
  await page.fill('[data-testid="business-name-input"]', advertiserData.businessName);
  await page.fill('[data-testid="business-number-input"]', advertiserData.businessNumber);
  await page.fill('[data-testid="contact-person-input"]', advertiserData.contactPerson);
  await page.fill('[data-testid="contact-phone-input"]', advertiserData.contactPhone);
  await page.fill('[data-testid="website-input"]', advertiserData.website);
  
  // Select industry
  await page.selectOption('[data-testid="industry-select"]', advertiserData.industry);
  
  // Upload business documents (mock)
  const businessLicense = page.locator('[data-testid="business-license-upload"]');
  await businessLicense.setInputFiles({
    name: 'business-license.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('mock business license content')
  });
  
  // Agree to advertiser terms
  await page.check('[data-testid="advertiser-terms-checkbox"]');
  await page.check('[data-testid="marketing-agreement-checkbox"]');
  
  // Submit registration
  await page.click('[data-testid="register-advertiser-button"]');
  
  // Wait for registration success or verification pending
  try {
    await page.waitForSelector('[data-testid="registration-success"]', { timeout: 10000 });
  } catch {
    await page.waitForSelector('[data-testid="verification-pending"]', { timeout: 10000 });
  }
}

async function completeAccountVerification(page: Page) {
  // Handle account verification process
  const verificationStatus = page.locator('[data-testid="verification-status"]');
  
  if (await verificationStatus.isVisible()) {
    const status = await verificationStatus.textContent();
    
    if (status?.includes('대기') || status?.includes('pending')) {
      // For testing, simulate admin approval
      await page.evaluate(() => {
        window.postMessage({ type: 'ACCOUNT_VERIFIED' }, '*');
      });
      
      await page.waitForSelector('[data-testid="verification-approved"]', { timeout: 10000 });
    }
  }
}

async function addAccountCredit(page: Page, amount: number) {
  await page.click('[data-testid="billing-menu"]');
  await page.click('[data-testid="add-credit-button"]');
  
  await page.waitForSelector('[data-testid="payment-form"]');
  
  // Fill payment information
  await page.fill('[data-testid="amount-input"]', amount.toString());
  await page.selectOption('[data-testid="payment-method-select"]', 'credit-card');
  
  // Mock credit card information
  await page.fill('[data-testid="card-number-input"]', '4532-1234-5678-9012');
  await page.fill('[data-testid="card-expiry-input"]', '12/25');
  await page.fill('[data-testid="card-cvc-input"]', '123');
  await page.fill('[data-testid="card-holder-input"]', testAdvertisers.newAdvertiser.contactPerson);
  
  // Process payment
  await page.click('[data-testid="process-payment-button"]');
  
  // Wait for payment success
  await expect(page.locator('[data-testid="payment-success"]')).toBeVisible({ timeout: 15000 });
  
  // Verify credit added
  await page.click('[data-testid="billing-menu"]');
  const balance = await page.textContent('[data-testid="account-balance"]');
  const balanceAmount = parseInt(balance?.replace(/\D/g, '') || '0');
  
  expect(balanceAmount).toBeGreaterThanOrEqual(amount);
}

async function createCampaign(page: Page, campaignData: any) {
  await page.click('[data-testid="campaigns-menu"]');
  await page.click('[data-testid="create-campaign-button"]');
  
  await page.waitForSelector('[data-testid="campaign-form"]');
  
  // Fill campaign basic information
  await page.fill('[data-testid="campaign-title-input"]', campaignData.title);
  await page.fill('[data-testid="campaign-description-input"]', campaignData.description);
  await page.selectOption('[data-testid="campaign-category-select"]', campaignData.category);
  await page.fill('[data-testid="target-url-input"]', campaignData.targetUrl);
  
  // Set budget and rewards
  await page.fill('[data-testid="total-budget-input"]', campaignData.budget.toString());
  await page.fill('[data-testid="daily-budget-input"]', campaignData.dailyBudget.toString());
  await page.fill('[data-testid="reward-amount-input"]', campaignData.reward.toString());
  
  // Set campaign duration
  await page.fill('[data-testid="campaign-duration-input"]', campaignData.duration.toString());
  
  // Target audience settings
  await page.fill('[data-testid="target-audience-input"]', campaignData.targetAudience);
  
  // Add requirements
  for (const requirement of campaignData.requirements) {
    await page.click('[data-testid="add-requirement-button"]');
    await page.fill('[data-testid="requirement-input"]', requirement);
  }
  
  // Upload campaign assets (mock)
  const assetUpload = page.locator('[data-testid="campaign-asset-upload"]');
  await assetUpload.setInputFiles({
    name: 'campaign-image.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from('mock campaign image')
  });
  
  // Review and submit
  await page.click('[data-testid="review-campaign-button"]');
  await page.waitForSelector('[data-testid="campaign-preview"]');
  
  await page.click('[data-testid="submit-campaign-button"]');
  
  // Wait for campaign creation success
  await expect(page.locator('[data-testid="campaign-created-success"]')).toBeVisible();
  
  // Return campaign ID or URL for further testing
  const campaignUrl = page.url();
  const campaignId = campaignUrl.match(/campaign\/([^\/]+)/)?.[1];
  
  return { campaignId, campaignUrl };
}

async function generateDeeplink(page: Page, linkData: any) {
  await page.click('[data-testid="deeplinks-menu"]');
  await page.click('[data-testid="generate-deeplink-button"]');
  
  await page.waitForSelector('[data-testid="deeplink-form"]');
  
  // Fill deeplink parameters
  await page.fill('[data-testid="landing-url-input"]', linkData.landingUrl);
  await page.fill('[data-testid="utm-source-input"]', linkData.utmSource || 'instagram');
  await page.fill('[data-testid="utm-medium-input"]', linkData.utmMedium || 'social');
  await page.fill('[data-testid="utm-campaign-input"]', linkData.utmCampaign || 'influencer');
  
  // Generate link
  await page.click('[data-testid="generate-link-button"]');
  
  // Get generated deeplink
  await page.waitForSelector('[data-testid="generated-deeplink"]');
  const deeplink = await page.inputValue('[data-testid="generated-deeplink"]');
  
  expect(deeplink).toContain('utm_source=');
  expect(deeplink).toContain('utm_medium=');
  
  return deeplink;
}

test.describe('Advertiser Registration and Setup Journey', () => {
  test('@advertiser-app Complete advertiser registration and verification', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/');
    
    // Complete registration
    await completeAdvertiserRegistration(page, testAdvertisers.newAdvertiser);
    
    // Verify registration success
    const successMessage = page.locator('[data-testid="registration-success"], [data-testid="verification-pending"]');
    await expect(successMessage).toBeVisible();
    
    // Complete verification process
    await completeAccountVerification(page);
    
    // Check access to advertiser dashboard
    await expect(page.locator('[data-testid="advertiser-dashboard"]')).toBeVisible();
    
    // Verify business information is displayed
    await expect(page.locator('[data-testid="business-name-display"]'))
      .toContainText(testAdvertisers.newAdvertiser.businessName);
  });

  test('@advertiser-app Business document verification process', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/');
    await completeAdvertiserRegistration(page, testAdvertisers.newAdvertiser);
    
    // Check document verification status
    await page.click('[data-testid="account-menu"]');
    await page.click('[data-testid="verification-status"]');
    
    await page.waitForSelector('[data-testid="verification-dashboard"]');
    
    // Check required documents list
    const requiredDocs = page.locator('[data-testid="required-document"]');
    const docCount = await requiredDocs.count();
    expect(docCount).toBeGreaterThan(0);
    
    // Upload additional documents if needed
    const uploadButton = page.locator('[data-testid="upload-additional-doc"]');
    if (await uploadButton.isVisible()) {
      await uploadButton.click();
      
      const fileInput = page.locator('[data-testid="document-file-input"]');
      await fileInput.setInputFiles({
        name: 'tax-certificate.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('mock tax certificate')
      });
      
      await page.click('[data-testid="submit-document"]');
      await expect(page.locator('[data-testid="document-uploaded"]')).toBeVisible();
    }
  });

  test('@advertiser-app Account settings and profile completion', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/');
    await completeAdvertiserRegistration(page, testAdvertisers.newAdvertiser);
    await completeAccountVerification(page);
    
    // Navigate to account settings
    await page.click('[data-testid="account-menu"]');
    await page.click('[data-testid="account-settings"]');
    
    await page.waitForSelector('[data-testid="settings-form"]');
    
    // Update business profile
    await page.fill('[data-testid="business-description-input"]', 
      '혁신적인 마케팅 솔루션을 제공하는 선도 기업입니다.');
    
    // Set business hours
    await page.selectOption('[data-testid="business-hours-start"]', '09:00');
    await page.selectOption('[data-testid="business-hours-end"]', '18:00');
    
    // Add social media links
    await page.fill('[data-testid="instagram-handle-input"]', '@testmarketing_official');
    await page.fill('[data-testid="facebook-page-input"]', 'facebook.com/testmarketing');
    
    // Set notification preferences
    await page.check('[data-testid="email-campaign-notifications"]');
    await page.check('[data-testid="sms-urgent-notifications"]');
    
    // Upload company logo
    const logoUpload = page.locator('[data-testid="company-logo-upload"]');
    await logoUpload.setInputFiles({
      name: 'company-logo.png',
      mimeType: 'image/png',
      buffer: Buffer.from('mock company logo')
    });
    
    // Save settings
    await page.click('[data-testid="save-settings-button"]');
    await expect(page.locator('[data-testid="settings-saved-success"]')).toBeVisible();
    
    // Verify profile completion percentage
    const completionPercentage = await page.textContent('[data-testid="profile-completion"]');
    const percentage = parseInt(completionPercentage?.replace('%', '') || '0');
    expect(percentage).toBeGreaterThan(80);
  });
});

test.describe('Campaign Creation and Management Journey', () => {
  test('@advertiser-app Create and launch basic campaign', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/');
    await completeAdvertiserRegistration(page, testAdvertisers.newAdvertiser);
    await completeAccountVerification(page);
    
    // Add account credit first
    await addAccountCredit(page, 1000000);
    
    // Create campaign
    const { campaignId } = await createCampaign(page, testCampaigns.basicCampaign);
    
    expect(campaignId).toBeTruthy();
    
    // Verify campaign appears in campaigns list
    await page.click('[data-testid="campaigns-menu"]');
    await page.click('[data-testid="my-campaigns"]');
    
    const campaignCard = page.locator(`[data-campaign-id="${campaignId}"]`);
    await expect(campaignCard).toBeVisible();
    
    // Check campaign status
    const campaignStatus = await campaignCard.locator('[data-testid="campaign-status"]').textContent();
    expect(['pending', 'active', 'review']).toContain(campaignStatus?.toLowerCase());
  });

  test('@advertiser-app Create premium campaign with advanced targeting', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/');
    await completeAdvertiserRegistration(page, testAdvertisers.newAdvertiser);
    await completeAccountVerification(page);
    
    // Add sufficient credit for premium campaign
    await addAccountCredit(page, 3000000);
    
    // Create premium campaign
    const { campaignId } = await createCampaign(page, testCampaigns.premiumCampaign);
    
    // Configure advanced targeting
    await page.click(`[data-campaign-id="${campaignId}"] [data-testid="edit-campaign"]`);
    await page.click('[data-testid="advanced-targeting-tab"]');
    
    // Set demographic targeting
    await page.selectOption('[data-testid="age-range-start"]', '25');
    await page.selectOption('[data-testid="age-range-end"]', '45');
    await page.check('[data-testid="gender-all"]');
    
    // Set interest targeting
    const interests = ['패션', '뷰티', '라이프스타일', '쇼핑'];
    for (const interest of interests) {
      await page.check(`[data-testid="interest-${interest}"]`);
    }
    
    // Set influencer tier targeting
    await page.check('[data-testid="tier-micro"]'); // 1K-10K followers
    await page.check('[data-testid="tier-macro"]'); // 10K-100K followers
    
    // Set location targeting
    await page.fill('[data-testid="target-cities"]', '서울, 부산, 대구, 인천');
    
    // Save targeting settings
    await page.click('[data-testid="save-targeting"]');
    await expect(page.locator('[data-testid="targeting-saved"]')).toBeVisible();
  });

  test('@advertiser-app Campaign template creation and management', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/');
    await completeAdvertiserRegistration(page, testAdvertisers.newAdvertiser);
    await completeAccountVerification(page);
    
    // Navigate to template management
    await page.click('[data-testid="templates-menu"]');
    await page.click('[data-testid="create-template-button"]');
    
    await page.waitForSelector('[data-testid="template-form"]');
    
    // Create social media post template
    await page.fill('[data-testid="template-name-input"]', testTemplates.socialMediaPost.name);
    await page.selectOption('[data-testid="template-type-select"]', testTemplates.socialMediaPost.type);
    await page.fill('[data-testid="template-content-input"]', testTemplates.socialMediaPost.content);
    
    // Add hashtags
    for (const hashtag of testTemplates.socialMediaPost.hashtags) {
      await page.fill('[data-testid="hashtag-input"]', hashtag);
      await page.click('[data-testid="add-hashtag-button"]');
    }
    
    // Add requirements
    for (const requirement of testTemplates.socialMediaPost.requirements) {
      await page.fill('[data-testid="requirement-input"]', requirement);
      await page.click('[data-testid="add-requirement-button"]');
    }
    
    // Save template
    await page.click('[data-testid="save-template-button"]');
    await expect(page.locator('[data-testid="template-created-success"]')).toBeVisible();
    
    // Verify template in list
    const templateCard = page.locator('[data-testid="template-card"]').first();
    await expect(templateCard.locator('[data-testid="template-name"]'))
      .toContainText(testTemplates.socialMediaPost.name);
    
    // Test template usage in campaign
    await page.click('[data-testid="campaigns-menu"]');
    await page.click('[data-testid="create-campaign-button"]');
    
    // Select template
    await page.click('[data-testid="use-template-button"]');
    await page.click(`[data-testid="select-template-${testTemplates.socialMediaPost.name}"]`);
    
    // Verify template content is loaded
    const contentValue = await page.inputValue('[data-testid="campaign-description-input"]');
    expect(contentValue).toContain(testTemplates.socialMediaPost.content);
  });

  test('@advertiser-app Campaign budget management and optimization', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/');
    await completeAdvertiserRegistration(page, testAdvertisers.newAdvertiser);
    await completeAccountVerification(page);
    
    await addAccountCredit(page, 1000000);
    const { campaignId } = await createCampaign(page, testCampaigns.basicCampaign);
    
    // Navigate to budget management
    await page.click('[data-testid="campaigns-menu"]');
    await page.click(`[data-campaign-id="${campaignId}"] [data-testid="manage-budget"]`);
    
    await page.waitForSelector('[data-testid="budget-management-panel"]');
    
    // Check current budget status
    const totalBudget = await page.textContent('[data-testid="total-budget-display"]');
    const spentBudget = await page.textContent('[data-testid="spent-budget-display"]');
    const remainingBudget = await page.textContent('[data-testid="remaining-budget-display"]');
    
    expect(totalBudget).toBeTruthy();
    expect(spentBudget).toBeTruthy();
    expect(remainingBudget).toBeTruthy();
    
    // Modify daily budget
    await page.click('[data-testid="edit-daily-budget"]');
    await page.fill('[data-testid="daily-budget-input"]', '75000');
    await page.click('[data-testid="update-budget-button"]');
    
    await expect(page.locator('[data-testid="budget-updated-success"]')).toBeVisible();
    
    // Set budget alerts
    await page.click('[data-testid="budget-alerts-tab"]');
    await page.check('[data-testid="alert-50-percent"]');
    await page.check('[data-testid="alert-90-percent"]');
    await page.fill('[data-testid="custom-alert-percentage"]', '75');
    
    await page.click('[data-testid="save-alerts"]');
    await expect(page.locator('[data-testid="alerts-saved"]')).toBeVisible();
  });
});

test.describe('Analytics and Performance Tracking Journey', () => {
  test('@advertiser-app Campaign performance analytics dashboard', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/');
    await completeAdvertiserRegistration(page, testAdvertisers.newAdvertiser);
    await completeAccountVerification(page);
    
    await addAccountCredit(page, 1000000);
    const { campaignId } = await createCampaign(page, testCampaigns.basicCampaign);
    
    // Navigate to analytics
    await page.click('[data-testid="analytics-menu"]');
    await page.click(`[data-testid="campaign-analytics-${campaignId}"]`);
    
    await page.waitForSelector('[data-testid="analytics-dashboard"]');
    
    // Check key metrics
    const metrics = ['impressions', 'clicks', 'conversions', 'participants', 'ctr', 'cpc'];
    
    for (const metric of metrics) {
      const metricValue = page.locator(`[data-testid="${metric}-value"]`);
      await expect(metricValue).toBeVisible();
      
      const value = await metricValue.textContent();
      expect(value).toBeTruthy();
    }
    
    // Test date range filtering
    await page.click('[data-testid="date-range-selector"]');
    await page.click('[data-testid="last-7-days"]');
    
    await page.waitForSelector('[data-testid="analytics-chart"]');
    
    // Verify chart updates
    const chartData = page.locator('[data-testid="chart-data-point"]');
    const dataPointCount = await chartData.count();
    expect(dataPointCount).toBeGreaterThanOrEqual(0);
    
    // Test metric comparison
    await page.click('[data-testid="compare-periods"]');
    await page.click('[data-testid="previous-period"]');
    
    // Check comparison indicators
    const comparisonMetrics = page.locator('[data-testid="metric-comparison"]');
    const comparisonCount = await comparisonMetrics.count();
    expect(comparisonCount).toBeGreaterThan(0);
  });

  test('@advertiser-app Audience demographics and insights', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/');
    await completeAdvertiserRegistration(page, testAdvertisers.newAdvertiser);
    await completeAccountVerification(page);
    
    await addAccountCredit(page, 1000000);
    const { campaignId } = await createCampaign(page, testCampaigns.basicCampaign);
    
    // Navigate to audience insights
    await page.click('[data-testid="analytics-menu"]');
    await page.click(`[data-testid="audience-insights-${campaignId}"]`);
    
    await page.waitForSelector('[data-testid="audience-dashboard"]');
    
    // Check demographic breakdowns
    const demographics = ['age', 'gender', 'location', 'interests'];
    
    for (const demographic of demographics) {
      const demographicChart = page.locator(`[data-testid="${demographic}-chart"]`);
      await expect(demographicChart).toBeVisible();
      
      // Test chart interactions
      await demographicChart.hover();
      
      const tooltip = page.locator('[data-testid="chart-tooltip"]');
      if (await tooltip.isVisible()) {
        const tooltipContent = await tooltip.textContent();
        expect(tooltipContent).toBeTruthy();
      }
    }
    
    // Check top performing segments
    const topSegments = page.locator('[data-testid="top-segment"]');
    const segmentCount = await topSegments.count();
    
    if (segmentCount > 0) {
      const firstSegment = topSegments.first();
      await expect(firstSegment.locator('[data-testid="segment-name"]')).toBeVisible();
      await expect(firstSegment.locator('[data-testid="segment-performance"]')).toBeVisible();
    }
  });

  test('@advertiser-app Performance comparison and benchmarking', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/');
    await completeAdvertiserRegistration(page, testAdvertisers.newAdvertiser);
    await completeAccountVerification(page);
    
    await addAccountCredit(page, 2000000);
    
    // Create multiple campaigns for comparison
    const campaign1 = await createCampaign(page, testCampaigns.basicCampaign);
    const campaign2 = await createCampaign(page, testCampaigns.premiumCampaign);
    
    // Navigate to comparison view
    await page.click('[data-testid="analytics-menu"]');
    await page.click('[data-testid="campaign-comparison"]');
    
    await page.waitForSelector('[data-testid="comparison-dashboard"]');
    
    // Select campaigns to compare
    await page.check(`[data-testid="compare-campaign-${campaign1.campaignId}"]`);
    await page.check(`[data-testid="compare-campaign-${campaign2.campaignId}"]`);
    
    await page.click('[data-testid="generate-comparison"]');
    
    // Verify comparison results
    await expect(page.locator('[data-testid="comparison-chart"]')).toBeVisible();
    
    const comparisonMetrics = page.locator('[data-testid="comparison-metric"]');
    const metricCount = await comparisonMetrics.count();
    expect(metricCount).toBeGreaterThan(0);
    
    // Check industry benchmarks
    await page.click('[data-testid="industry-benchmarks-tab"]');
    
    const benchmarkData = page.locator('[data-testid="benchmark-metric"]');
    const benchmarkCount = await benchmarkData.count();
    
    if (benchmarkCount > 0) {
      const firstBenchmark = benchmarkData.first();
      await expect(firstBenchmark.locator('[data-testid="metric-name"]')).toBeVisible();
      await expect(firstBenchmark.locator('[data-testid="industry-average"]')).toBeVisible();
      await expect(firstBenchmark.locator('[data-testid="your-performance"]')).toBeVisible();
    }
  });
});

test.describe('Deeplink Generation and Tracking Journey', () => {
  test('@advertiser-app Generate and manage deeplinks', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/');
    await completeAdvertiserRegistration(page, testAdvertisers.newAdvertiser);
    await completeAccountVerification(page);
    
    // Generate deeplink
    const deeplink = await generateDeeplink(page, {
      landingUrl: 'https://example.com/product/special-offer',
      utmSource: 'instagram',
      utmMedium: 'influencer',
      utmCampaign: 'summer-sale-2024'
    });
    
    // Test deeplink customization
    await page.click('[data-testid="customize-deeplink"]');
    
    // Add custom parameters
    await page.fill('[data-testid="custom-param-key"]', 'promo_code');
    await page.fill('[data-testid="custom-param-value"]', 'SUMMER20');
    await page.click('[data-testid="add-custom-param"]');
    
    // Set expiry date
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const dateString = futureDate.toISOString().split('T')[0];
    
    await page.fill('[data-testid="expiry-date-input"]', dateString);
    
    // Update deeplink
    await page.click('[data-testid="update-deeplink"]');
    
    const updatedDeeplink = await page.inputValue('[data-testid="generated-deeplink"]');
    expect(updatedDeeplink).toContain('promo_code=SUMMER20');
    
    // Test deeplink sharing
    await page.click('[data-testid="share-deeplink"]');
    
    const shareOptions = page.locator('[data-testid="share-option"]');
    const shareCount = await shareOptions.count();
    expect(shareCount).toBeGreaterThan(0);
    
    // Test QR code generation
    await page.click('[data-testid="generate-qr-code"]');
    await expect(page.locator('[data-testid="qr-code-image"]')).toBeVisible();
  });

  test('@advertiser-app Deeplink analytics and click tracking', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/');
    await completeAdvertiserRegistration(page, testAdvertisers.newAdvertiser);
    await completeAccountVerification(page);
    
    // Generate multiple deeplinks for different channels
    const channels = [
      { name: 'Instagram', utmSource: 'instagram', utmMedium: 'social' },
      { name: 'YouTube', utmSource: 'youtube', utmMedium: 'video' },
      { name: 'Blog', utmSource: 'blog', utmMedium: 'content' }
    ];
    
    for (const channel of channels) {
      await generateDeeplink(page, {
        landingUrl: 'https://example.com/landing',
        utmSource: channel.utmSource,
        utmMedium: channel.utmMedium,
        utmCampaign: 'multi-channel-test'
      });
    }
    
    // Navigate to deeplink analytics
    await page.click('[data-testid="deeplinks-menu"]');
    await page.click('[data-testid="deeplink-analytics"]');
    
    await page.waitForSelector('[data-testid="deeplink-analytics-dashboard"]');
    
    // Check link performance metrics
    const analyticsMetrics = ['total-clicks', 'unique-clicks', 'conversion-rate', 'top-sources'];
    
    for (const metric of analyticsMetrics) {
      const metricCard = page.locator(`[data-testid="${metric}-card"]`);
      await expect(metricCard).toBeVisible();
    }
    
    // Test channel comparison
    await page.click('[data-testid="channel-comparison-tab"]');
    
    const channelCards = page.locator('[data-testid="channel-performance-card"]');
    const channelCount = await channelCards.count();
    
    if (channelCount > 0) {
      const firstChannel = channelCards.first();
      await expect(firstChannel.locator('[data-testid="channel-name"]')).toBeVisible();
      await expect(firstChannel.locator('[data-testid="click-count"]')).toBeVisible();
      await expect(firstChannel.locator('[data-testid="conversion-rate"]')).toBeVisible();
    }
  });

  test('@advertiser-app Bulk deeplink generation and management', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/');
    await completeAdvertiserRegistration(page, testAdvertisers.newAdvertiser);
    await completeAccountVerification(page);
    
    // Navigate to bulk deeplink generation
    await page.click('[data-testid="deeplinks-menu"]');
    await page.click('[data-testid="bulk-generation"]');
    
    await page.waitForSelector('[data-testid="bulk-generation-form"]');
    
    // Upload CSV with link parameters
    const csvContent = `landing_url,utm_source,utm_medium,utm_campaign,custom_param
https://example.com/product1,instagram,social,product1-launch,category=electronics
https://example.com/product2,youtube,video,product2-demo,category=fashion
https://example.com/product3,blog,content,product3-review,category=beauty`;
    
    const csvFile = page.locator('[data-testid="csv-upload"]');
    await csvFile.setInputFiles({
      name: 'deeplinks.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    });
    
    // Process bulk generation
    await page.click('[data-testid="process-bulk-generation"]');
    
    // Wait for processing to complete
    await expect(page.locator('[data-testid="bulk-generation-complete"]')).toBeVisible({ timeout: 30000 });
    
    // Verify generated links
    const generatedLinks = page.locator('[data-testid="generated-link-row"]');
    const linkCount = await generatedLinks.count();
    expect(linkCount).toBe(3);
    
    // Test bulk export
    await page.click('[data-testid="export-links"]');
    
    // Check download
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-csv"]');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toContain('.csv');
  });
});

test.describe('Payment and Billing Journey', () => {
  test('@advertiser-app Payment processing and credit management', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/');
    await completeAdvertiserRegistration(page, testAdvertisers.newAdvertiser);
    await completeAccountVerification(page);
    
    // Test payment processing
    await addAccountCredit(page, 500000);
    
    // Verify payment history
    await page.click('[data-testid="billing-menu"]');
    await page.click('[data-testid="payment-history"]');
    
    await page.waitForSelector('[data-testid="payment-history-table"]');
    
    const paymentRows = page.locator('[data-testid="payment-row"]');
    const paymentCount = await paymentRows.count();
    expect(paymentCount).toBeGreaterThan(0);
    
    // Verify payment details
    const firstPayment = paymentRows.first();
    await expect(firstPayment.locator('[data-testid="payment-amount"]')).toBeVisible();
    await expect(firstPayment.locator('[data-testid="payment-date"]')).toBeVisible();
    await expect(firstPayment.locator('[data-testid="payment-status"]')).toBeVisible();
    
    // Test auto-recharge setup
    await page.click('[data-testid="auto-recharge-settings"]');
    
    await page.check('[data-testid="enable-auto-recharge"]');
    await page.fill('[data-testid="recharge-threshold"]', '100000');
    await page.fill('[data-testid="recharge-amount"]', '500000');
    
    await page.click('[data-testid="save-auto-recharge"]');
    await expect(page.locator('[data-testid="auto-recharge-enabled"]')).toBeVisible();
  });

  test('@advertiser-app Invoice generation and tax management', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/');
    await completeAdvertiserRegistration(page, testAdvertisers.newAdvertiser);
    await completeAccountVerification(page);
    
    await addAccountCredit(page, 1000000);
    
    // Create and run a campaign to generate expenses
    await createCampaign(page, testCampaigns.basicCampaign);
    
    // Navigate to invoice management
    await page.click('[data-testid="billing-menu"]');
    await page.click('[data-testid="invoices"]');
    
    await page.waitForSelector('[data-testid="invoice-list"]');
    
    // Generate invoice if expenses exist
    const generateInvoiceButton = page.locator('[data-testid="generate-invoice"]');
    if (await generateInvoiceButton.isVisible()) {
      await generateInvoiceButton.click();
      
      await page.waitForSelector('[data-testid="invoice-generation-form"]');
      
      // Fill invoice details
      await page.fill('[data-testid="invoice-company-name"]', testAdvertisers.newAdvertiser.businessName);
      await page.fill('[data-testid="invoice-address"]', '서울시 강남구 테헤란로 123');
      await page.fill('[data-testid="tax-id"]', testAdvertisers.newAdvertiser.businessNumber);
      
      await page.click('[data-testid="generate-invoice-button"]');
      
      // Wait for invoice generation
      await expect(page.locator('[data-testid="invoice-generated"]')).toBeVisible();
      
      // Download invoice
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="download-invoice"]');
      const download = await downloadPromise;
      
      expect(download.suggestedFilename()).toContain('.pdf');
    }
    
    // Check tax settings
    await page.click('[data-testid="tax-settings"]');
    
    await page.selectOption('[data-testid="tax-type"]', 'vat');
    await page.fill('[data-testid="vat-rate"]', '10');
    
    await page.click('[data-testid="save-tax-settings"]');
    await expect(page.locator('[data-testid="tax-settings-saved"]')).toBeVisible();
  });

  test('@advertiser-app Budget monitoring and alerts', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/');
    await completeAdvertiserRegistration(page, testAdvertisers.newAdvertiser);
    await completeAccountVerification(page);
    
    await addAccountCredit(page, 1000000);
    const { campaignId } = await createCampaign(page, testCampaigns.basicCampaign);
    
    // Set up budget monitoring
    await page.click('[data-testid="billing-menu"]');
    await page.click('[data-testid="budget-monitoring"]');
    
    await page.waitForSelector('[data-testid="budget-monitoring-dashboard"]');
    
    // Configure global budget alerts
    await page.check('[data-testid="low-balance-alert"]');
    await page.fill('[data-testid="low-balance-threshold"]', '100000');
    
    await page.check('[data-testid="daily-spend-alert"]');
    await page.fill('[data-testid="daily-spend-limit"]', '50000');
    
    await page.check('[data-testid="monthly-spend-alert"]');
    await page.fill('[data-testid="monthly-spend-limit"]', '1000000');
    
    // Set notification preferences
    await page.check('[data-testid="email-notifications"]');
    await page.check('[data-testid="sms-notifications"]');
    await page.fill('[data-testid="notification-phone"]', testAdvertisers.newAdvertiser.contactPhone);
    
    await page.click('[data-testid="save-budget-alerts"]');
    await expect(page.locator('[data-testid="budget-alerts-saved"]')).toBeVisible();
    
    // Check spending overview
    const spendingMetrics = ['total-spent', 'remaining-balance', 'daily-average', 'projected-monthly'];
    
    for (const metric of spendingMetrics) {
      const metricValue = page.locator(`[data-testid="${metric}"]`);
      await expect(metricValue).toBeVisible();
    }
  });
});

test.describe('@tablet @advertiser-app Tablet Advertiser Experience', () => {
  test.use({ viewport: { width: 768, height: 1024 } }); // iPad dimensions

  test('Tablet-optimized campaign management', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/');
    await completeAdvertiserRegistration(page, testAdvertisers.newAdvertiser);
    await completeAccountVerification(page);
    
    // Check tablet navigation
    await expect(page.locator('[data-testid="tablet-sidebar"]')).toBeVisible();
    
    // Test campaign creation on tablet
    await addAccountCredit(page, 1000000);
    
    await page.tap('[data-testid="campaigns-menu"]');
    await page.tap('[data-testid="create-campaign-button"]');
    
    // Verify tablet-optimized form layout
    const campaignForm = page.locator('[data-testid="campaign-form"]');
    await expect(campaignForm).toBeVisible();
    
    const formWidth = await campaignForm.evaluate(el => el.clientWidth);
    expect(formWidth).toBeLessThan(800); // Should be tablet-optimized
    
    // Test swipe gestures for analytics charts
    await createCampaign(page, testCampaigns.basicCampaign);
    
    await page.click('[data-testid="analytics-menu"]');
    await page.waitForSelector('[data-testid="analytics-chart"]');
    
    // Test chart interactions on tablet
    const analyticsChart = page.locator('[data-testid="analytics-chart"]');
    await analyticsChart.hover();
    
    // Verify tablet-specific UI elements
    await expect(page.locator('[data-testid="tablet-chart-controls"]')).toBeVisible();
  });
});