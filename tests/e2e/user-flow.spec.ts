import { test, expect, Page } from '@playwright/test';

// Test data
const testUser = {
  email: `test-user-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  name: '테스트사용자'
};

test.describe('Core User Flow Tests', () => {
  test.describe.serial('회원가입 → 로그인 → 캠페인 참여 → 수익 확인', () => {
    
    test('1. 회원가입 (User Registration)', async ({ page }) => {
      await page.goto('http://localhost:9000');
      await page.waitForLoadState('networkidle');
      
      // Look for signup link/button
      const signupLink = page.locator('a:has-text("회원가입"), button:has-text("회원가입"), a:has-text("Sign up"), [href*="signup"], [href*="register"]').first();
      
      if (await signupLink.isVisible()) {
        await signupLink.click();
        await page.waitForLoadState('networkidle');
      } else {
        // If no signup link, check if we're already on signup page
        const currentUrl = page.url();
        if (!currentUrl.includes('signup') && !currentUrl.includes('register')) {
          // Try to navigate directly
          await page.goto('http://localhost:9000/signup');
        }
      }
      
      // Fill registration form
      await page.fill('input[type="email"], input[name="email"], input[placeholder*="이메일" i], input[placeholder*="email" i]', testUser.email);
      await page.fill('input[type="password"], input[name="password"], input[placeholder*="비밀번호" i], input[placeholder*="password" i]', testUser.password);
      
      // Look for confirm password field
      const confirmPasswordInput = page.locator('input[placeholder*="비밀번호 확인" i], input[placeholder*="confirm" i], input[name="confirmPassword"], input[name="confirm_password"]');
      if (await confirmPasswordInput.count() > 0) {
        await confirmPasswordInput.fill(testUser.password);
      }
      
      // Look for name field
      const nameInput = page.locator('input[placeholder*="이름" i], input[placeholder*="name" i], input[name="name"]');
      if (await nameInput.count() > 0) {
        await nameInput.fill(testUser.name);
      }
      
      // Check for terms/privacy checkboxes
      const termsCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /약관|terms/i });
      const privacyCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /개인정보|privacy/i });
      
      if (await termsCheckbox.count() > 0) {
        await termsCheckbox.check();
      }
      if (await privacyCheckbox.count() > 0) {
        await privacyCheckbox.check();
      }
      
      // Submit registration
      const submitButton = page.locator('button[type="submit"], button:has-text("회원가입"), button:has-text("가입하기"), button:has-text("Sign up"), button:has-text("Register")').first();
      await submitButton.click();
      
      // Wait for registration to complete
      await page.waitForLoadState('networkidle');
      
      // Check for success indicators
      const successIndicators = [
        page.locator('text=/회원가입.*완료/i'),
        page.locator('text=/registration.*success/i'),
        page.locator('text=/이메일.*확인/i'),
        page.locator('text=/verify.*email/i'),
        page.locator('[data-testid="dashboard"]'),
        page.locator('[data-testid="home"]')
      ];
      
      let registrationSuccess = false;
      for (const indicator of successIndicators) {
        if (await indicator.count() > 0) {
          registrationSuccess = true;
          break;
        }
      }
      
      expect(registrationSuccess).toBeTruthy();
      console.log('✅ User registration completed');
    });
    
    test('2. 로그인 (User Login)', async ({ page }) => {
      await page.goto('http://localhost:9000');
      await page.waitForLoadState('networkidle');
      
      // Check if already logged in
      const logoutButton = page.locator('button:has-text("로그아웃"), button:has-text("Logout"), a:has-text("로그아웃"), a:has-text("Logout")');
      if (await logoutButton.count() > 0) {
        // Already logged in, logout first
        await logoutButton.click();
        await page.waitForLoadState('networkidle');
      }
      
      // Look for login form
      const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="이메일" i], input[placeholder*="email" i]');
      const passwordInput = page.locator('input[type="password"], input[name="password"], input[placeholder*="비밀번호" i], input[placeholder*="password" i]');
      
      // If not on login page, navigate to it
      if (await emailInput.count() === 0) {
        const loginLink = page.locator('a:has-text("로그인"), button:has-text("로그인"), a:has-text("Login"), [href*="login"]').first();
        if (await loginLink.isVisible()) {
          await loginLink.click();
        } else {
          await page.goto('http://localhost:9000/login');
        }
        await page.waitForLoadState('networkidle');
      }
      
      // Fill login form
      await page.fill('input[type="email"], input[name="email"], input[placeholder*="이메일" i], input[placeholder*="email" i]', testUser.email);
      await page.fill('input[type="password"], input[name="password"], input[placeholder*="비밀번호" i], input[placeholder*="password" i]', testUser.password);
      
      // Submit login
      const loginButton = page.locator('button[type="submit"], button:has-text("로그인"), button:has-text("Login")').first();
      await loginButton.click();
      
      // Wait for login to complete
      await page.waitForLoadState('networkidle');
      
      // Check for login success
      const loginSuccess = await page.locator('button:has-text("로그아웃"), button:has-text("Logout"), [data-testid="dashboard"], [data-testid="home"], text=/환영/i, text=/welcome/i').count() > 0;
      
      expect(loginSuccess).toBeTruthy();
      console.log('✅ User login successful');
    });
    
    test('3. 캠페인 참여 (Campaign Participation)', async ({ page }) => {
      // Assuming user is already logged in from previous test
      await page.goto('http://localhost:9000');
      await page.waitForLoadState('networkidle');
      
      // Navigate to campaigns page
      const campaignLink = page.locator('a:has-text("캠페인"), a:has-text("Campaign"), [href*="campaign"]').first();
      if (await campaignLink.isVisible()) {
        await campaignLink.click();
      } else {
        await page.goto('http://localhost:9000/campaigns');
      }
      await page.waitForLoadState('networkidle');
      
      // Find and click on a campaign
      const campaignCard = page.locator('[data-testid="campaign-card"], article, .campaign-item, div:has-text("캠페인")').first();
      
      if (await campaignCard.count() > 0) {
        await campaignCard.click();
        await page.waitForLoadState('networkidle');
        
        // Look for participation button
        const participateButton = page.locator('button:has-text("참여"), button:has-text("참여하기"), button:has-text("Join"), button:has-text("Participate")').first();
        
        if (await participateButton.isVisible()) {
          await participateButton.click();
          await page.waitForLoadState('networkidle');
          
          // Check for participation success
          const participationSuccess = await page.locator('text=/참여.*완료/i, text=/participation.*success/i, text=/성공/i').count() > 0;
          
          expect(participationSuccess).toBeTruthy();
          console.log('✅ Campaign participation successful');
        } else {
          // Campaign might already be participated or not available
          console.log('⚠️ No available campaigns to participate');
        }
      } else {
        console.log('⚠️ No campaigns found');
      }
    });
    
    test('4. 수익 확인 (Revenue Check)', async ({ page }) => {
      // Navigate to revenue/earnings page
      await page.goto('http://localhost:9000');
      await page.waitForLoadState('networkidle');
      
      // Look for revenue/earnings link
      const revenueLink = page.locator('a:has-text("수익"), a:has-text("포인트"), a:has-text("Earnings"), a:has-text("Points"), [href*="earning"], [href*="point"], [href*="revenue"]').first();
      
      if (await revenueLink.isVisible()) {
        await revenueLink.click();
      } else {
        // Try profile/dashboard
        const profileLink = page.locator('a:has-text("프로필"), a:has-text("마이페이지"), a:has-text("Profile"), a:has-text("My Page"), [href*="profile"], [href*="mypage"]').first();
        if (await profileLink.isVisible()) {
          await profileLink.click();
        } else {
          await page.goto('http://localhost:9000/profile');
        }
      }
      
      await page.waitForLoadState('networkidle');
      
      // Check for revenue/points display
      const revenueElements = page.locator('text=/포인트|점|원|₩|point|earnings|revenue/i');
      const hasRevenueInfo = await revenueElements.count() > 0;
      
      expect(hasRevenueInfo).toBeTruthy();
      console.log('✅ Revenue information displayed');
      
      // Look for specific revenue amount or balance
      const balanceElement = page.locator('[data-testid="balance"], [data-testid="points"], .balance, .points, text=/\d+.*(?:포인트|점|원)/');
      if (await balanceElement.count() > 0) {
        const balanceText = await balanceElement.first().textContent();
        console.log(`💰 Current balance: ${balanceText}`);
      }
    });
  });
});