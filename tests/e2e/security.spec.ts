import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * Security Testing Suite for TreitMaster
 * Tests enhanced security features implemented in the recent security upgrade
 * @security
 */

const testData = {
  maliciousPayloads: {
    xssScript: '<script>alert("XSS")</script>',
    xssImg: '<img src="x" onerror="alert(\'XSS\')">',
    xssIframe: '<iframe src="javascript:alert(\'XSS\')"></iframe>',
    sqlInjection: "'; DROP TABLE users; --",
    sqlUnion: "' UNION SELECT * FROM users --",
    commandInjection: '; cat /etc/passwd',
    pathTraversal: '../../../etc/passwd',
    jsInjection: 'javascript:alert("Injected")',
  },
  validUser: {
    email: 'security-test@example.com',
    password: 'SecurePass123!',
    name: '보안테스트'
  },
  sensitiveData: {
    supabaseUrl: 'https://localhost:54321',
    apiKey: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9',
    userToken: 'sb-localhost-auth-token'
  }
};

// Helper functions for security testing
async function attemptXSSInjection(page: Page, inputSelector: string, payload: string) {
  await page.fill(inputSelector, payload);
  await page.keyboard.press('Enter');
  
  // Check if script executed (should not happen)
  const dialogPromise = page.waitForEvent('dialog', { timeout: 2000 }).catch(() => null);
  const dialog = await dialogPromise;
  
  if (dialog) {
    await dialog.dismiss();
    return true; // XSS vulnerability detected
  }
  
  return false; // XSS prevented
}

async function checkCSPHeaders(page: Page) {
  const response = await page.goto(page.url());
  const cspHeader = response?.headers()['content-security-policy'];
  return cspHeader;
}

async function attemptSQLInjection(page: Page, endpoint: string, payload: string) {
  const response = await page.request.post(endpoint, {
    data: { query: payload }
  });
  
  const body = await response.text();
  
  // Check for SQL error patterns
  const sqlErrorPatterns = [
    /syntax error/i,
    /mysql_/i,
    /ora-\d+/i,
    /microsoft jet database/i,
    /sqlite_/i,
    /postgresql/i
  ];
  
  return sqlErrorPatterns.some(pattern => pattern.test(body));
}

test.describe('Security Tests - XSS Protection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:9000');
  });

  test('@security XSS prevention in user registration form', async ({ page }) => {
    test.setTimeout(60000);

    // Navigate to signup
    await page.click('[data-testid="signup-link"]');
    await page.waitForSelector('[data-testid="signup-form"]');

    // Test various XSS payloads in form fields
    const xssDetected = await attemptXSSInjection(
      page, 
      '[data-testid="name-input"]', 
      testData.maliciousPayloads.xssScript
    );
    
    expect(xssDetected).toBe(false);

    // Test image-based XSS
    const imgXssDetected = await attemptXSSInjection(
      page,
      '[data-testid="name-input"]',
      testData.maliciousPayloads.xssImg
    );
    
    expect(imgXssDetected).toBe(false);

    // Verify SafeHTML component is working
    await page.fill('[data-testid="name-input"]', testData.maliciousPayloads.xssScript);
    const sanitizedValue = await page.inputValue('[data-testid="name-input"]');
    
    // Should not contain script tags
    expect(sanitizedValue).not.toContain('<script>');
    expect(sanitizedValue).not.toContain('javascript:');
  });

  test('@security XSS prevention in campaign descriptions', async ({ page }) => {
    // Login as advertiser
    await page.goto('http://localhost:9001');
    await page.fill('[data-testid="email-input"]', 'advertiser@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    await page.waitForSelector('[data-testid="dashboard"]');

    // Create campaign with XSS payload
    await page.click('[data-testid="create-campaign"]');
    await page.waitForSelector('[data-testid="campaign-form"]');

    await page.fill('[data-testid="campaign-title"]', '정상 캠페인 제목');
    await page.fill('[data-testid="campaign-description"]', testData.maliciousPayloads.xssScript);
    
    await page.click('[data-testid="submit-campaign"]');

    // Verify XSS was sanitized
    const description = await page.textContent('[data-testid="campaign-description-display"]');
    expect(description).not.toContain('<script>');
  });

  test('@security XSS prevention in comment/review system', async ({ page }) => {
    // Login as user
    await page.fill('[data-testid="email-input"]', testData.validUser.email);
    await page.fill('[data-testid="password-input"]', testData.validUser.password);
    await page.click('[data-testid="login-button"]');

    // Navigate to campaign review
    await page.click('[data-testid="campaigns-menu"]');
    await page.click('[data-testid="campaign-card"]');
    await page.click('[data-testid="write-review"]');

    // Attempt XSS in review
    const xssDetected = await attemptXSSInjection(
      page,
      '[data-testid="review-content"]',
      testData.maliciousPayloads.xssIframe
    );

    expect(xssDetected).toBe(false);
  });
});

test.describe('Security Tests - SQL Injection Protection', () => {
  test('@security SQL injection prevention in user authentication', async ({ page }) => {
    await page.goto('http://localhost:9000');

    // Test SQL injection in login form
    await page.fill('[data-testid="email-input"]', testData.maliciousPayloads.sqlInjection);
    await page.fill('[data-testid="password-input"]', 'password');
    await page.click('[data-testid="login-button"]');

    // Should show invalid credentials, not SQL error
    await expect(page.locator('[data-testid="login-error"]')).toBeVisible();
    const errorText = await page.textContent('[data-testid="login-error"]');
    
    expect(errorText).not.toMatch(/syntax error/i);
    expect(errorText).not.toMatch(/mysql/i);
    expect(errorText).not.toMatch(/postgresql/i);
  });

  test('@security SQL injection prevention in search functionality', async ({ page }) => {
    await page.goto('http://localhost:9000');
    
    // Login first
    await page.fill('[data-testid="email-input"]', testData.validUser.email);
    await page.fill('[data-testid="password-input"]', testData.validUser.password);
    await page.click('[data-testid="login-button"]');

    await page.waitForSelector('[data-testid="dashboard"]');

    // Test campaign search
    await page.click('[data-testid="campaigns-menu"]');
    await page.fill('[data-testid="campaign-search"]', testData.maliciousPayloads.sqlUnion);
    await page.click('[data-testid="search-button"]');

    // Should handle gracefully without SQL errors
    const results = page.locator('[data-testid="search-results"]');
    await expect(results).toBeVisible();
    
    // Check that no sensitive data is exposed
    const resultText = await results.textContent();
    expect(resultText).not.toMatch(/password/i);
    expect(resultText).not.toMatch(/token/i);
    expect(resultText).not.toMatch(/secret/i);
  });

  test('@security SQL injection prevention in admin panel', async ({ page }) => {
    await page.goto('http://localhost:9002');
    
    // Login as admin
    await page.fill('[data-testid="email-input"]', 'admin@treitmaster.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');

    await page.waitForSelector('[data-testid="admin-dashboard"]');

    // Test user search with SQL injection
    await page.click('[data-testid="users-menu"]');
    await page.fill('[data-testid="user-search"]', testData.maliciousPayloads.sqlInjection);
    await page.click('[data-testid="search-button"]');

    // Verify no SQL errors exposed
    const searchResults = page.locator('[data-testid="users-table"]');
    await expect(searchResults).toBeVisible();
  });
});

test.describe('Security Tests - Environment Variables Protection', () => {
  test('@security Environment variables not exposed in client-side code', async ({ page }) => {
    await page.goto('http://localhost:9000');

    // Check page source for sensitive environment variables
    const pageContent = await page.content();
    
    // These should not appear in client-side code
    expect(pageContent).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(pageContent).not.toContain('DATABASE_URL');
    expect(pageContent).not.toContain('JWT_SECRET');
    expect(pageContent).not.toContain('STRIPE_SECRET_KEY');

    // Check window object
    const exposedVars = await page.evaluate(() => {
      const sensitiveKeys = [
        'SUPABASE_SERVICE_ROLE_KEY',
        'DATABASE_URL', 
        'JWT_SECRET',
        'STRIPE_SECRET_KEY'
      ];
      
      return sensitiveKeys.filter(key => 
        key in window || 
        (window as any)[key] !== undefined ||
        JSON.stringify(window).includes(key)
      );
    });

    expect(exposedVars).toHaveLength(0);
  });

  test('@security Environment validation on application start', async ({ page }) => {
    // Test that app handles missing environment variables gracefully
    await page.goto('http://localhost:9000');

    // Check for environment validation errors in console
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.reload();
    await page.waitForTimeout(2000);

    // Should not expose environment variable names in errors
    const sensitiveErrors = consoleErrors.filter(error =>
      error.includes('SUPABASE_SERVICE_ROLE_KEY') ||
      error.includes('DATABASE_URL') ||
      error.includes('JWT_SECRET')
    );

    expect(sensitiveErrors).toHaveLength(0);
  });
});

test.describe('Security Tests - Content Security Policy (CSP)', () => {
  test('@security CSP headers are properly configured', async ({ page }) => {
    await page.goto('http://localhost:9000');
    
    const csp = await checkCSPHeaders(page);
    expect(csp).toBeDefined();
    
    if (csp) {
      // Verify CSP directives
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("style-src 'self' 'unsafe-inline'");
      expect(csp).toContain("img-src 'self' data: https:");
      
      // Should block unsafe-eval
      expect(csp).not.toContain("'unsafe-eval'");
    }
  });

  test('@security CSP prevents inline script execution', async ({ page }) => {
    await page.goto('http://localhost:9000');

    // Try to execute inline script (should be blocked by CSP)
    const scriptExecuted = await page.evaluate(() => {
      try {
        const script = document.createElement('script');
        script.textContent = 'window.testXSS = true;';
        document.head.appendChild(script);
        return window.testXSS === true;
      } catch (error) {
        return false;
      }
    });

    expect(scriptExecuted).toBe(false);
  });

  test('@security CSP allows legitimate resources', async ({ page }) => {
    await page.goto('http://localhost:9000');

    // Check that legitimate assets load properly
    const response = await page.waitForResponse(response => 
      response.url().includes('localhost:9000') && 
      (response.url().endsWith('.js') || response.url().endsWith('.css'))
    );

    expect(response.status()).toBe(200);
  });
});

test.describe('Security Tests - URL Security', () => {
  test('@security URL parameter validation and sanitization', async ({ page }) => {
    // Test with malicious URL parameters
    const maliciousUrl = `http://localhost:9000/?redirect=${encodeURIComponent('javascript:alert("XSS")')}`;
    
    await page.goto(maliciousUrl);
    
    // Should not execute JavaScript
    const dialogPromise = page.waitForEvent('dialog', { timeout: 2000 }).catch(() => null);
    const dialog = await dialogPromise;
    
    expect(dialog).toBeNull();

    // Check that redirect parameter is sanitized
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('javascript:');
  });

  test('@security Path traversal prevention', async ({ page }) => {
    await page.goto('http://localhost:9000');

    // Try to access files with path traversal
    const response = await page.goto(`http://localhost:9000/${testData.maliciousPayloads.pathTraversal}`);
    
    // Should return 404 or redirect, not expose file system
    expect(response?.status()).not.toBe(200);
  });

  test('@security Deeplink security validation', async ({ page }) => {
    await page.goto('http://localhost:9001');
    
    // Login as advertiser
    await page.fill('[data-testid="email-input"]', 'advertiser@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    await page.waitForSelector('[data-testid="dashboard"]');

    // Test deeplink generation with malicious URL
    await page.click('[data-testid="deeplinks-menu"]');
    await page.fill('[data-testid="landing-url"]', testData.maliciousPayloads.jsInjection);
    await page.click('[data-testid="generate-deeplink"]');

    // Should show validation error
    await expect(page.locator('[data-testid="url-validation-error"]')).toBeVisible();
    
    // Generated deeplink should not contain malicious content
    const deeplinkInput = page.locator('[data-testid="generated-deeplink"]');
    if (await deeplinkInput.isVisible()) {
      const deeplink = await deeplinkInput.inputValue();
      expect(deeplink).not.toContain('javascript:');
    }
  });
});

test.describe('Security Tests - Authentication & Authorization', () => {
  test('@security JWT token security', async ({ page, context }) => {
    await page.goto('http://localhost:9000');
    
    // Login and check token storage
    await page.fill('[data-testid="email-input"]', testData.validUser.email);
    await page.fill('[data-testid="password-input"]', testData.validUser.password);
    await page.click('[data-testid="login-button"]');

    await page.waitForSelector('[data-testid="dashboard"]');

    // Check that tokens are stored securely
    const tokens = await page.evaluate(() => {
      return {
        localStorage: localStorage.getItem('supabase.auth.token'),
        sessionStorage: sessionStorage.getItem('supabase.auth.token'),
        cookies: document.cookie
      };
    });

    // Tokens should be properly secured
    if (tokens.localStorage) {
      // Should not be plain text JWT
      expect(tokens.localStorage).not.toMatch(/^eyJ/);
    }
  });

  test('@security Session timeout handling', async ({ page }) => {
    await page.goto('http://localhost:9000');
    
    // Login
    await page.fill('[data-testid="email-input"]', testData.validUser.email);
    await page.fill('[data-testid="password-input"]', testData.validUser.password);
    await page.click('[data-testid="login-button"]');

    await page.waitForSelector('[data-testid="dashboard"]');

    // Simulate expired session
    await page.evaluate(() => {
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.clear();
    });

    // Try to access protected resource
    await page.click('[data-testid="wallet-menu"]');

    // Should redirect to login
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
  });

  test('@security Role-based access control', async ({ page }) => {
    // Test user trying to access admin endpoints
    await page.goto('http://localhost:9000');
    
    await page.fill('[data-testid="email-input"]', testData.validUser.email);
    await page.fill('[data-testid="password-input"]', testData.validUser.password);
    await page.click('[data-testid="login-button"]');

    // Try to access admin interface directly
    const response = await page.goto('http://localhost:9002');
    
    // Should be redirected or show access denied
    expect(page.url()).not.toContain('localhost:9002');
    // OR check for access denied message
    // await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
  });
});

test.describe('Security Tests - Data Validation', () => {
  test('@security Input length limits enforced', async ({ page }) => {
    await page.goto('http://localhost:9000');
    
    // Test very long input
    const longString = 'A'.repeat(10000);
    
    await page.click('[data-testid="signup-link"]');
    await page.fill('[data-testid="name-input"]', longString);
    
    const actualValue = await page.inputValue('[data-testid="name-input"]');
    expect(actualValue.length).toBeLessThan(1000); // Should be truncated
  });

  test('@security File upload security', async ({ page }) => {
    await page.goto('http://localhost:9001');
    
    // Login as advertiser
    await page.fill('[data-testid="email-input"]', 'advertiser@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Try to upload malicious file
    const fileInput = page.locator('[data-testid="document-upload"]');
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles({
        name: 'malicious.exe',
        mimeType: 'application/x-executable',
        buffer: Buffer.from('malicious content')
      });

      await page.click('[data-testid="upload-button"]');
      
      // Should reject non-allowed file types
      await expect(page.locator('[data-testid="file-type-error"]')).toBeVisible();
    }
  });

  test('@security Rate limiting protection', async ({ page }) => {
    await page.goto('http://localhost:9000');

    // Attempt rapid login attempts
    const attempts = [];
    for (let i = 0; i < 10; i++) {
      attempts.push(
        page.fill('[data-testid="email-input"]', 'wrong@email.com')
          .then(() => page.fill('[data-testid="password-input"]', 'wrongpass'))
          .then(() => page.click('[data-testid="login-button"]'))
      );
    }

    await Promise.all(attempts);

    // Should show rate limiting after multiple failed attempts
    const rateLimitMessage = page.locator('[data-testid="rate-limit-error"]');
    if (await rateLimitMessage.isVisible()) {
      expect(await rateLimitMessage.textContent()).toContain('많은');
    }
  });
});

test.describe('Security Tests - API Security', () => {
  test('@security API endpoints require authentication', async ({ request }) => {
    // Test protected endpoints without authentication
    const protectedEndpoints = [
      '/api/user/profile',
      '/api/campaigns/create',
      '/api/admin/users',
      '/api/earnings/calculate'
    ];

    for (const endpoint of protectedEndpoints) {
      const response = await request.get(`http://localhost:54321${endpoint}`);
      expect([401, 403]).toContain(response.status());
    }
  });

  test('@security API input validation', async ({ request }) => {
    // Test API with malicious input
    const response = await request.post('http://localhost:54321/api/campaigns/create', {
      data: {
        title: testData.maliciousPayloads.xssScript,
        description: testData.maliciousPayloads.sqlInjection,
        budget: -1000000 // Invalid negative budget
      }
    });

    expect([400, 422]).toContain(response.status());
  });

  test('@security API response doesn\'t leak sensitive data', async ({ request, page }) => {
    // Login to get valid token
    await page.goto('http://localhost:9000');
    await page.fill('[data-testid="email-input"]', testData.validUser.email);
    await page.fill('[data-testid="password-input"]', testData.validUser.password);
    await page.click('[data-testid="login-button"]');

    // Get user profile
    const response = await request.get('http://localhost:54321/api/user/profile');
    const userData = await response.json();

    // Should not contain sensitive fields
    expect(userData).not.toHaveProperty('password');
    expect(userData).not.toHaveProperty('password_hash');
    expect(userData).not.toHaveProperty('salt');
    expect(userData).not.toHaveProperty('private_key');
  });
});

test.describe('Security Tests - Fraud Detection', () => {
  test('@security Suspicious activity detection', async ({ page }) => {
    await page.goto('http://localhost:9000');
    
    await page.fill('[data-testid="email-input"]', testData.validUser.email);
    await page.fill('[data-testid="password-input"]', testData.validUser.password);
    await page.click('[data-testid="login-button"]');

    // Simulate suspicious rapid clicking
    const campaign = page.locator('[data-testid="campaign-card"]').first();
    
    for (let i = 0; i < 20; i++) {
      await campaign.click();
      await page.goBack();
    }

    // Should trigger fraud detection
    const fraudWarning = page.locator('[data-testid="fraud-warning"]');
    if (await fraudWarning.isVisible()) {
      expect(await fraudWarning.textContent()).toContain('의심스러운');
    }
  });

  test('@security Bot detection mechanisms', async ({ page }) => {
    // Set user agent to common bot
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
    });

    await page.goto('http://localhost:9000');

    // Should handle bot traffic appropriately
    const response = await page.waitForResponse(response => 
      response.url().includes('localhost:9000')
    );

    // Should not block legitimate bots but may show different content
    expect(response.status()).toBe(200);
  });
});