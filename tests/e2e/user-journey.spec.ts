import { test, expect, Page } from '@playwright/test';

/**
 * User Journey E2E Tests for TreitMaster
 * Tests complete user workflows and core functionality
 * @user-app
 */

const testUsers = {
  newUser: {
    email: `test-user-${Date.now()}@example.com`,
    password: 'SecurePass123!',
    name: '김테스트',
    phone: '010-1234-5678',
    instagram: 'test_instagram_user',
    referralCode: 'NEWUSER2024'
  },
  existingUser: {
    email: 'existing-user@example.com',
    password: 'ExistingPass123!',
    name: '기존사용자'
  }
};

// Helper functions for user journey testing
async function completeUserRegistration(page: Page, userData: any) {
  await page.click('[data-testid="signup-link"]');
  await page.waitForSelector('[data-testid="signup-form"]');
  
  // Fill registration form
  await page.fill('[data-testid="email-input"]', userData.email);
  await page.fill('[data-testid="password-input"]', userData.password);
  await page.fill('[data-testid="confirm-password-input"]', userData.password);
  await page.fill('[data-testid="name-input"]', userData.name);
  await page.fill('[data-testid="phone-input"]', userData.phone);
  
  // Add referral code if provided
  if (userData.referralCode) {
    await page.fill('[data-testid="referral-code-input"]', userData.referralCode);
  }
  
  // Agree to terms
  await page.check('[data-testid="terms-checkbox"]');
  await page.check('[data-testid="privacy-checkbox"]');
  
  // Submit registration
  await page.click('[data-testid="signup-button"]');
  
  // Handle email verification (mock or wait for success)
  try {
    await page.waitForSelector('[data-testid="email-verification-sent"]', { timeout: 10000 });
    
    // For testing, simulate email verification
    await page.evaluate(() => {
      window.postMessage({ type: 'EMAIL_VERIFIED' }, '*');
    });
    
    await page.waitForSelector('[data-testid="home-screen"]', { timeout: 15000 });
  } catch (error) {
    // If direct login after registration
    await page.waitForSelector('[data-testid="home-screen"]', { timeout: 15000 });
  }
}

async function completeProfileSetup(page: Page, userData: any) {
  // Navigate to profile setup
  await page.click('[data-testid="profile-menu"]');
  await page.click('[data-testid="account-info"]');
  
  // Fill additional profile information
  const profilePicInput = page.locator('[data-testid="profile-pic-input"]');
  if (await profilePicInput.isVisible()) {
    await profilePicInput.setInputFiles({
      name: 'profile.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake image data')
    });
  }
  
  // Connect social media accounts
  if (userData.instagram) {
    await page.click('[data-testid="connect-instagram"]');
    await page.fill('[data-testid="instagram-username"]', userData.instagram);
    await page.click('[data-testid="verify-instagram"]');
    
    // Wait for verification (mock)
    await expect(page.locator('[data-testid="instagram-verified"]')).toBeVisible({ timeout: 10000 });
  }
  
  // Set interests and preferences
  const interests = ['패션', '뷰티', '기술', '여행'];
  for (const interest of interests) {
    const interestCheckbox = page.locator(`[data-testid="interest-${interest}"]`);
    if (await interestCheckbox.isVisible()) {
      await interestCheckbox.check();
    }
  }
  
  // Save profile
  await page.click('[data-testid="save-profile"]');
  await expect(page.locator('[data-testid="profile-saved-success"]')).toBeVisible();
}

async function participateInCampaign(page: Page) {
  // Navigate to campaigns
  await page.click('[data-testid="campaigns-menu"]');
  await page.waitForSelector('[data-testid="campaign-list"]');
  
  // Filter for available campaigns
  await page.click('[data-testid="filter-available"]');
  await page.waitForSelector('[data-testid="campaign-card"]');
  
  // Select first available campaign
  const firstCampaign = page.locator('[data-testid="campaign-card"]').first();
  const campaignTitle = await firstCampaign.locator('[data-testid="campaign-title"]').textContent();
  
  await firstCampaign.click();
  await page.waitForSelector('[data-testid="campaign-details"]');
  
  // Join campaign
  await page.click('[data-testid="join-campaign-button"]');
  await expect(page.locator('[data-testid="campaign-joined-success"]')).toBeVisible();
  
  // Complete tasks
  const tasks = page.locator('[data-testid="campaign-task"]');
  const taskCount = await tasks.count();
  
  for (let i = 0; i < Math.min(taskCount, 3); i++) {
    const task = tasks.nth(i);
    await task.click();
    
    // Complete different types of tasks
    const taskType = await task.getAttribute('data-task-type');
    
    switch (taskType) {
      case 'follow':
        await page.fill('[data-testid="social-handle-proof"]', '@completed_follow');
        break;
      case 'share':
        await page.fill('[data-testid="share-url-proof"]', 'https://instagram.com/p/shared');
        break;
      case 'review':
        await page.fill('[data-testid="review-text"]', '정말 좋은 제품이네요! 추천합니다.');
        await page.selectOption('[data-testid="review-rating"]', '5');
        break;
      case 'visit':
        await page.fill('[data-testid="visit-proof"]', 'Visited and explored the website');
        break;
      default:
        await page.fill('[data-testid="task-proof-input"]', 'Task completed successfully');
    }
    
    // Submit task completion
    await page.click('[data-testid="submit-task"]');
    await expect(page.locator('[data-testid="task-submitted-success"]')).toBeVisible();
  }
  
  return { campaignTitle, completedTasks: Math.min(taskCount, 3) };
}

async function claimDailyBonuses(page: Page) {
  // Navigate to daily bonus section
  await page.click('[data-testid="home-menu"]');
  await page.waitForSelector('[data-testid="daily-bonus-section"]');
  
  // Check if daily bonus is available
  const bonusButton = page.locator('[data-testid="claim-daily-bonus"]');
  if (await bonusButton.isVisible() && await bonusButton.isEnabled()) {
    await bonusButton.click();
    
    // Handle bonus animation or popup
    await expect(page.locator('[data-testid="bonus-claimed-animation"]')).toBeVisible({ timeout: 10000 });
    await page.waitForSelector('[data-testid="bonus-claimed-animation"]', { state: 'hidden', timeout: 15000 });
    
    return true;
  }
  
  return false;
}

test.describe('User Registration and Onboarding Journey', () => {
  test('@user-app Complete new user registration flow', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/');
    
    // Complete registration
    await completeUserRegistration(page, testUsers.newUser);
    
    // Verify successful registration
    await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-name-display"]')).toContainText(testUsers.newUser.name);
    
    // Check initial XP and level
    const initialXP = await page.textContent('[data-testid="user-xp"]');
    const initialLevel = await page.textContent('[data-testid="user-level"]');
    
    expect(parseInt(initialXP || '0')).toBeGreaterThanOrEqual(0);
    expect(parseInt(initialLevel || '1')).toBeGreaterThanOrEqual(1);
    
    // Verify referral bonus if code was used
    if (testUsers.newUser.referralCode) {
      const bonusNotification = page.locator('[data-testid="referral-bonus-notification"]');
      if (await bonusNotification.isVisible()) {
        expect(await bonusNotification.textContent()).toContain('추천');
      }
    }
  });

  test('@user-app Profile setup and social media connection', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/');
    await completeUserRegistration(page, testUsers.newUser);
    
    // Complete profile setup
    await completeProfileSetup(page, testUsers.newUser);
    
    // Verify profile completion
    await page.click('[data-testid="profile-menu"]');
    await page.click('[data-testid="account-info"]');
    
    // Check profile completion percentage
    const completionPercentage = await page.textContent('[data-testid="profile-completion"]');
    const percentage = parseInt(completionPercentage?.replace('%', '') || '0');
    expect(percentage).toBeGreaterThan(80);
    
    // Verify social media connection
    await expect(page.locator('[data-testid="instagram-connected"]')).toBeVisible();
  });

  test('@user-app First-time user tutorial completion', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('/');
    await completeUserRegistration(page, testUsers.newUser);
    
    // Check if tutorial starts automatically
    const tutorialModal = page.locator('[data-testid="tutorial-modal"]');
    if (await tutorialModal.isVisible()) {
      // Go through tutorial steps
      const tutorialSteps = ['welcome', 'campaigns', 'earnings', 'referrals', 'completion'];
      
      for (const step of tutorialSteps) {
        await expect(page.locator(`[data-testid="tutorial-${step}"]`)).toBeVisible();
        await page.click('[data-testid="tutorial-next"]');
      }
      
      // Complete tutorial
      await page.click('[data-testid="tutorial-finish"]');
      await expect(page.locator('[data-testid="tutorial-completed"]')).toBeVisible();
    }
  });
});

test.describe('Campaign Participation Journey', () => {
  test('@user-app Browse, filter, and join campaigns', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/');
    await completeUserRegistration(page, testUsers.newUser);
    
    // Browse campaigns
    await page.click('[data-testid="campaigns-menu"]');
    await page.waitForSelector('[data-testid="campaign-list"]');
    
    // Test filtering
    await page.selectOption('[data-testid="campaign-category-filter"]', '뷰티');
    await page.waitForSelector('[data-testid="campaign-card"]');
    
    let campaignCount = await page.locator('[data-testid="campaign-card"]').count();
    expect(campaignCount).toBeGreaterThan(0);
    
    // Test sorting
    await page.selectOption('[data-testid="campaign-sort"]', 'reward-high');
    await page.waitForTimeout(2000); // Wait for re-sorting
    
    // Verify sorting (highest reward first)
    const firstReward = await page.locator('[data-testid="campaign-card"]').first()
      .locator('[data-testid="campaign-reward"]').textContent();
    const secondReward = await page.locator('[data-testid="campaign-card"]').nth(1)
      .locator('[data-testid="campaign-reward"]').textContent();
    
    const firstAmount = parseInt(firstReward?.replace(/\D/g, '') || '0');
    const secondAmount = parseInt(secondReward?.replace(/\D/g, '') || '0');
    
    expect(firstAmount).toBeGreaterThanOrEqual(secondAmount);
    
    // Join a campaign
    const { campaignTitle, completedTasks } = await participateInCampaign(page);
    
    expect(campaignTitle).toBeTruthy();
    expect(completedTasks).toBeGreaterThan(0);
  });

  test('@user-app Complete various campaign task types', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/');
    await completeUserRegistration(page, testUsers.newUser);
    
    // Participate in multiple campaigns
    await participateInCampaign(page);
    
    // Navigate to my campaigns
    await page.click('[data-testid="my-campaigns-menu"]');
    await page.waitForSelector('[data-testid="my-campaigns-list"]');
    
    // Check campaign status
    const activeCampaigns = page.locator('[data-testid="active-campaign"]');
    const activeCampaignCount = await activeCampaigns.count();
    
    expect(activeCampaignCount).toBeGreaterThan(0);
    
    // Verify task completion status
    const completedTasks = page.locator('[data-testid="completed-task"]');
    const completedTaskCount = await completedTasks.count();
    
    expect(completedTaskCount).toBeGreaterThan(0);
  });

  test('@user-app Campaign task review and approval process', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/');
    await completeUserRegistration(page, testUsers.newUser);
    
    // Complete campaign tasks
    await participateInCampaign(page);
    
    // Check task review status
    await page.click('[data-testid="my-campaigns-menu"]');
    
    const pendingTasks = page.locator('[data-testid="pending-review-task"]');
    const pendingTaskCount = await pendingTasks.count();
    
    if (pendingTaskCount > 0) {
      // Click on first pending task
      await pendingTasks.first().click();
      
      // Check task details
      await expect(page.locator('[data-testid="task-review-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="review-submitted-date"]')).toBeVisible();
      
      // Check estimated review time
      const reviewTime = await page.textContent('[data-testid="estimated-review-time"]');
      expect(reviewTime).toBeTruthy();
    }
  });
});

test.describe('Rewards and Level System Journey', () => {
  test('@user-app XP earning and level progression', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/');
    await completeUserRegistration(page, testUsers.newUser);
    
    // Record initial XP and level
    await page.click('[data-testid="profile-menu"]');
    const initialXP = parseInt(await page.textContent('[data-testid="user-xp"]') || '0');
    const initialLevel = parseInt(await page.textContent('[data-testid="user-level"]') || '1');
    
    // Participate in campaigns to earn XP
    await participateInCampaign(page);
    
    // Claim daily bonus
    await claimDailyBonuses(page);
    
    // Complete profile (earns XP)
    await completeProfileSetup(page, testUsers.newUser);
    
    // Check XP gain
    await page.click('[data-testid="profile-menu"]');
    const finalXP = parseInt(await page.textContent('[data-testid="user-xp"]') || '0');
    const finalLevel = parseInt(await page.textContent('[data-testid="user-level"]') || '1');
    
    expect(finalXP).toBeGreaterThan(initialXP);
    expect(finalLevel).toBeGreaterThanOrEqual(initialLevel);
    
    // Check level progress bar
    const progressBar = page.locator('[data-testid="level-progress-bar"]');
    await expect(progressBar).toBeVisible();
    
    const progressPercent = await progressBar.getAttribute('aria-valuenow');
    expect(parseInt(progressPercent || '0')).toBeGreaterThan(0);
  });

  test('@user-app Level up rewards and achievements', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/');
    await completeUserRegistration(page, testUsers.newUser);
    
    // Simulate activities to trigger level up
    await participateInCampaign(page);
    await completeProfileSetup(page, testUsers.newUser);
    await claimDailyBonuses(page);
    
    // Check for level up notification
    const levelUpNotification = page.locator('[data-testid="level-up-notification"]');
    if (await levelUpNotification.isVisible()) {
      // Verify level up rewards
      await expect(page.locator('[data-testid="level-up-rewards"]')).toBeVisible();
      
      const rewardList = page.locator('[data-testid="level-reward-item"]');
      const rewardCount = await rewardList.count();
      expect(rewardCount).toBeGreaterThan(0);
      
      // Close level up modal
      await page.click('[data-testid="level-up-close"]');
    }
    
    // Check achievements page
    await page.click('[data-testid="achievements-menu"]');
    await page.waitForSelector('[data-testid="achievements-list"]');
    
    const unlockedAchievements = page.locator('[data-testid="unlocked-achievement"]');
    const unlockedCount = await unlockedAchievements.count();
    
    expect(unlockedCount).toBeGreaterThan(0);
  });

  test('@user-app Daily bonus and streak system', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('/');
    await completeUserRegistration(page, testUsers.newUser);
    
    // Claim daily bonus
    const bonusClaimed = await claimDailyBonuses(page);
    
    if (bonusClaimed) {
      // Check streak counter
      const streakCount = await page.textContent('[data-testid="daily-streak-count"]');
      expect(parseInt(streakCount || '0')).toBeGreaterThanOrEqual(1);
      
      // Check next bonus timer
      const nextBonusTimer = page.locator('[data-testid="next-bonus-timer"]');
      await expect(nextBonusTimer).toBeVisible();
      
      const timerText = await nextBonusTimer.textContent();
      expect(timerText).toMatch(/\d{2}:\d{2}:\d{2}/); // Should show time format
    }
    
    // Check bonus calendar
    await page.click('[data-testid="bonus-calendar-toggle"]');
    await expect(page.locator('[data-testid="attendance-calendar"]')).toBeVisible();
    
    // Today should be marked as claimed
    const todayCell = page.locator('[data-testid="calendar-today"]');
    await expect(todayCell).toHaveClass(/claimed/);
  });
});

test.describe('Social and Referral System Journey', () => {
  test('@user-app Referral link generation and tracking', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/');
    await completeUserRegistration(page, testUsers.newUser);
    
    // Navigate to referral section
    await page.click('[data-testid="referral-menu"]');
    await page.waitForSelector('[data-testid="referral-dashboard"]');
    
    // Generate referral link
    await page.click('[data-testid="generate-referral-link"]');
    
    const referralLink = await page.inputValue('[data-testid="referral-link-input"]');
    expect(referralLink).toContain('ref=');
    expect(referralLink).toContain(testUsers.newUser.email.replace('@', ''));
    
    // Copy referral link
    await page.click('[data-testid="copy-referral-link"]');
    
    // Verify copy success
    await expect(page.locator('[data-testid="copy-success-message"]')).toBeVisible();
    
    // Check referral statistics
    const referralCount = await page.textContent('[data-testid="total-referrals"]');
    const referralEarnings = await page.textContent('[data-testid="referral-earnings"]');
    
    expect(referralCount).toBeDefined();
    expect(referralEarnings).toBeDefined();
    
    // Share options
    const shareButtons = page.locator('[data-testid="share-button"]');
    const shareButtonCount = await shareButtons.count();
    expect(shareButtonCount).toBeGreaterThan(0);
  });

  test('@user-app Friend invitation and reward system', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/');
    await completeUserRegistration(page, testUsers.newUser);
    
    // Navigate to friends section
    await page.click('[data-testid="friends-menu"]');
    await page.waitForSelector('[data-testid="friends-dashboard"]');
    
    // Invite friends via email
    await page.click('[data-testid="invite-friends-button"]');
    
    const emailInputs = page.locator('[data-testid="friend-email-input"]');
    const testEmails = [
      'friend1@example.com',
      'friend2@example.com',
      'friend3@example.com'
    ];
    
    for (let i = 0; i < Math.min(testEmails.length, await emailInputs.count()); i++) {
      await emailInputs.nth(i).fill(testEmails[i]);
    }
    
    // Add custom invitation message
    await page.fill('[data-testid="invitation-message"]', 
      '안녕! TreitMaster에서 함께 캠페인 참여하고 보상 받아봐요!');
    
    // Send invitations
    await page.click('[data-testid="send-invitations"]');
    
    // Verify invitations sent
    await expect(page.locator('[data-testid="invitations-sent-success"]')).toBeVisible();
    
    // Check pending invitations
    const pendingInvitations = page.locator('[data-testid="pending-invitation"]');
    const pendingCount = await pendingInvitations.count();
    
    expect(pendingCount).toBe(testEmails.length);
  });

  test('@user-app Social leaderboard and rankings', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('/');
    await completeUserRegistration(page, testUsers.newUser);
    
    // Complete some activities to get ranking
    await participateInCampaign(page);
    await claimDailyBonuses(page);
    
    // Navigate to leaderboard
    await page.click('[data-testid="community-menu"]');
    await page.click('[data-testid="leaderboard-tab"]');
    
    await page.waitForSelector('[data-testid="leaderboard-list"]');
    
    // Check different leaderboard categories
    const categories = ['weekly', 'monthly', 'all-time'];
    
    for (const category of categories) {
      await page.click(`[data-testid="leaderboard-${category}"]`);
      await page.waitForSelector('[data-testid="leaderboard-list"]');
      
      const topUsers = page.locator('[data-testid="leaderboard-user"]');
      const topUserCount = await topUsers.count();
      
      expect(topUserCount).toBeGreaterThan(0);
      
      // Check if current user appears in ranking
      const userRanking = page.locator('[data-testid="user-current-ranking"]');
      if (await userRanking.isVisible()) {
        const ranking = await userRanking.textContent();
        expect(ranking).toMatch(/\d+/);
      }
    }
  });
});

test.describe('Earnings and Wallet Journey', () => {
  test('@user-app Track earnings and balance', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/');
    await completeUserRegistration(page, testUsers.newUser);
    
    // Complete activities to earn money
    await participateInCampaign(page);
    
    // Navigate to wallet/earnings
    await page.click('[data-testid="wallet-menu"]');
    await page.waitForSelector('[data-testid="wallet-dashboard"]');
    
    // Check balance components
    const totalBalance = await page.textContent('[data-testid="total-balance"]');
    const availableBalance = await page.textContent('[data-testid="available-balance"]');
    const pendingBalance = await page.textContent('[data-testid="pending-balance"]');
    
    expect(totalBalance).toBeTruthy();
    expect(availableBalance).toBeTruthy();
    expect(pendingBalance).toBeTruthy();
    
    // Check earnings breakdown
    await page.click('[data-testid="earnings-breakdown"]');
    
    const campaignEarnings = await page.textContent('[data-testid="campaign-earnings"]');
    const referralEarnings = await page.textContent('[data-testid="referral-earnings"]');
    const bonusEarnings = await page.textContent('[data-testid="bonus-earnings"]');
    
    expect(campaignEarnings).toBeTruthy();
    expect(referralEarnings).toBeTruthy();
    expect(bonusEarnings).toBeTruthy();
    
    // Check transaction history
    await page.click('[data-testid="transaction-history"]');
    await page.waitForSelector('[data-testid="transaction-list"]');
    
    const transactions = page.locator('[data-testid="transaction-item"]');
    const transactionCount = await transactions.count();
    
    if (transactionCount > 0) {
      // Verify transaction details
      const firstTransaction = transactions.first();
      await expect(firstTransaction.locator('[data-testid="transaction-amount"]')).toBeVisible();
      await expect(firstTransaction.locator('[data-testid="transaction-date"]')).toBeVisible();
      await expect(firstTransaction.locator('[data-testid="transaction-type"]')).toBeVisible();
    }
  });

  test('@user-app Settlement request process', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/');
    await completeUserRegistration(page, testUsers.newUser);
    
    // Complete activities to earn money (simulate sufficient balance)
    await participateInCampaign(page);
    
    // Navigate to wallet
    await page.click('[data-testid="wallet-menu"]');
    await page.waitForSelector('[data-testid="wallet-dashboard"]');
    
    // Check available balance
    const balanceText = await page.textContent('[data-testid="available-balance"]');
    const balance = parseInt(balanceText?.replace(/\D/g, '') || '0');
    
    if (balance >= 10000) { // Minimum settlement amount
      // Request settlement
      await page.click('[data-testid="request-settlement"]');
      await page.waitForSelector('[data-testid="settlement-form"]');
      
      // Fill settlement form
      await page.fill('[data-testid="settlement-amount"]', '10000');
      await page.fill('[data-testid="bank-name"]', '우리은행');
      await page.fill('[data-testid="account-number"]', '1234567890123');
      await page.fill('[data-testid="account-holder"]', testUsers.newUser.name);
      
      // Verify settlement details
      await page.click('[data-testid="verify-settlement"]');
      
      // Submit settlement request
      await page.click('[data-testid="submit-settlement"]');
      
      // Verify success
      await expect(page.locator('[data-testid="settlement-request-success"]')).toBeVisible();
      
      // Check settlement status
      await page.click('[data-testid="settlement-history"]');
      
      const pendingSettlements = page.locator('[data-testid="pending-settlement"]');
      const pendingCount = await pendingSettlements.count();
      
      expect(pendingCount).toBe(1);
    }
  });

  test('@user-app Earnings analytics and insights', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('/');
    await completeUserRegistration(page, testUsers.newUser);
    
    // Complete various activities
    await participateInCampaign(page);
    await claimDailyBonuses(page);
    
    // Navigate to earnings analytics
    await page.click('[data-testid="wallet-menu"]');
    await page.click('[data-testid="earnings-analytics"]');
    
    await page.waitForSelector('[data-testid="earnings-chart"]');
    
    // Check analytics components
    await expect(page.locator('[data-testid="earnings-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="earnings-trend"]')).toBeVisible();
    
    // Test different time periods
    const periods = ['week', 'month', 'year'];
    
    for (const period of periods) {
      await page.click(`[data-testid="period-${period}"]`);
      await page.waitForSelector('[data-testid="earnings-chart"]');
      
      // Verify chart updates
      const chartData = page.locator('[data-testid="chart-data-point"]');
      const dataPoints = await chartData.count();
      
      expect(dataPoints).toBeGreaterThanOrEqual(0);
    }
    
    // Check earnings insights
    const insights = page.locator('[data-testid="earnings-insight"]');
    const insightCount = await insights.count();
    
    expect(insightCount).toBeGreaterThan(0);
  });
});

test.describe('@mobile @user-app Mobile User Experience Journey', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE dimensions

  test('Mobile registration and onboarding', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/');
    
    // Check mobile navigation
    await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();
    
    // Test mobile registration
    await page.tap('[data-testid="mobile-signup-button"]');
    await page.waitForSelector('[data-testid="mobile-signup-form"]');
    
    // Fill form on mobile
    await page.fill('[data-testid="email-input"]', testUsers.newUser.email);
    await page.fill('[data-testid="password-input"]', testUsers.newUser.password);
    await page.fill('[data-testid="name-input"]', testUsers.newUser.name);
    
    // Test mobile keyboard handling
    await page.keyboard.press('Enter');
    
    // Check mobile-specific UI elements
    await expect(page.locator('[data-testid="mobile-welcome-screen"]')).toBeVisible();
  });

  test('Mobile campaign browsing and participation', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/');
    await completeUserRegistration(page, testUsers.newUser);
    
    // Test mobile campaign browsing
    await page.tap('[data-testid="campaigns-tab"]');
    await page.waitForSelector('[data-testid="mobile-campaign-list"]');
    
    // Test swipe gestures if implemented
    const campaignCard = page.locator('[data-testid="campaign-card"]').first();
    
    // Simulate swipe to show more options
    await campaignCard.hover();
    
    // Test mobile campaign details view
    await campaignCard.tap();
    await page.waitForSelector('[data-testid="mobile-campaign-details"]');
    
    // Verify mobile-optimized layout
    const campaignDetails = page.locator('[data-testid="campaign-details"]');
    const width = await campaignDetails.evaluate(el => el.clientWidth);
    
    expect(width).toBeLessThan(400); // Should be mobile-optimized
  });
});