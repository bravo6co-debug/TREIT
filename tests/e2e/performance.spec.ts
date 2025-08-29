import { test, expect, Page } from '@playwright/test';

/**
 * Performance E2E Tests for TreitMaster
 * Tests application performance, load times, and resource efficiency
 * @performance
 */

const performanceThresholds = {
  pageLoad: 5000,        // 5 seconds max for page load
  apiResponse: 2000,     // 2 seconds max for API responses
  resourceLoad: 3000,    // 3 seconds max for resource loading
  interaction: 1000,     // 1 second max for user interactions
  memoryUsage: 100,      // 100MB max memory usage
  bundleSize: 5000,      // 5MB max for initial bundle
  cumulativeLayoutShift: 0.1,    // CLS threshold
  firstContentfulPaint: 2000,    // FCP threshold
  largestContentfulPaint: 4000   // LCP threshold
};

const testUsers = {
  user: {
    email: 'perf-user@example.com',
    password: 'PerfTest123!'
  },
  advertiser: {
    email: 'perf-advertiser@company.com',
    password: 'PerfTest123!'
  }
};

// Helper functions for performance testing
async function measurePageLoadTime(page: Page, url: string) {
  const startTime = Date.now();
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  const endTime = Date.now();
  
  return endTime - startTime;
}

async function measureApiResponseTime(page: Page, apiEndpoint: string) {
  const startTime = Date.now();
  
  const responsePromise = page.waitForResponse(response => 
    response.url().includes(apiEndpoint) && response.status() === 200
  );
  
  // Trigger API call
  await page.reload();
  await responsePromise;
  
  const endTime = Date.now();
  return endTime - startTime;
}

async function getWebVitals(page: Page) {
  return await page.evaluate(() => {
    return new Promise((resolve) => {
      const vitals = {};
      
      // Get FCP (First Contentful Paint)
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
          vitals.fcp = fcpEntry.startTime;
        }
      }).observe({ entryTypes: ['paint'] });
      
      // Get LCP (Largest Contentful Paint)
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lcpEntry = entries[entries.length - 1];
        vitals.lcp = lcpEntry.startTime;
      }).observe({ entryTypes: ['largest-contentful-paint'] });
      
      // Get CLS (Cumulative Layout Shift)
      let clsValue = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.hadRecentInput) continue;
          clsValue += entry.value;
        }
        vitals.cls = clsValue;
      }).observe({ entryTypes: ['layout-shift'] });
      
      // Get FID (First Input Delay) - simulated
      vitals.fid = performance.now();
      
      setTimeout(() => resolve(vitals), 3000);
    });
  });
}

async function measureMemoryUsage(page: Page) {
  return await page.evaluate(() => {
    if ('memory' in performance) {
      return {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      };
    }
    return null;
  });
}

test.describe('Page Load Performance Tests', () => {
  test('@performance User app initial page load performance', async ({ page }) => {
    test.setTimeout(60000);

    // Measure initial page load time
    const loadTime = await measurePageLoadTime(page, 'http://localhost:9000');
    
    console.log(`User app load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(performanceThresholds.pageLoad);
    
    // Get Web Vitals
    const vitals = await getWebVitals(page);
    console.log('Web Vitals:', vitals);
    
    if (vitals.fcp) {
      expect(vitals.fcp).toBeLessThan(performanceThresholds.firstContentfulPaint);
    }
    
    if (vitals.lcp) {
      expect(vitals.lcp).toBeLessThan(performanceThresholds.largestContentfulPaint);
    }
    
    if (vitals.cls) {
      expect(vitals.cls).toBeLessThan(performanceThresholds.cumulativeLayoutShift);
    }
  });

  test('@performance Advertiser app initial page load performance', async ({ page }) => {
    test.setTimeout(60000);

    const loadTime = await measurePageLoadTime(page, 'http://localhost:9001');
    
    console.log(`Advertiser app load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(performanceThresholds.pageLoad);
    
    // Check bundle size by monitoring network requests
    const jsRequests = [];
    const cssRequests = [];
    
    page.on('response', response => {
      const url = response.url();
      if (url.endsWith('.js')) {
        jsRequests.push({
          url,
          size: response.headers()['content-length'] || 0
        });
      } else if (url.endsWith('.css')) {
        cssRequests.push({
          url,
          size: response.headers()['content-length'] || 0
        });
      }
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    const totalJsSize = jsRequests.reduce((sum, req) => sum + parseInt(req.size), 0);
    const totalCssSize = cssRequests.reduce((sum, req) => sum + parseInt(req.size), 0);
    
    console.log(`Total JS size: ${totalJsSize} bytes`);
    console.log(`Total CSS size: ${totalCssSize} bytes`);
    
    // Check if bundle sizes are reasonable
    expect(totalJsSize).toBeLessThan(performanceThresholds.bundleSize * 1024); // Convert MB to bytes
  });

  test('@performance Admin app initial page load performance', async ({ page }) => {
    test.setTimeout(60000);

    const loadTime = await measurePageLoadTime(page, 'http://localhost:9002');
    
    console.log(`Admin app load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(performanceThresholds.pageLoad);
    
    // Test admin dashboard components load time
    const dashboardComponents = [
      '[data-testid="user-metrics"]',
      '[data-testid="campaign-metrics"]', 
      '[data-testid="financial-metrics"]',
      '[data-testid="system-metrics"]'
    ];
    
    for (const component of dashboardComponents) {
      const startTime = Date.now();
      await page.waitForSelector(component, { timeout: 10000 });
      const componentLoadTime = Date.now() - startTime;
      
      console.log(`Component ${component} load time: ${componentLoadTime}ms`);
      expect(componentLoadTime).toBeLessThan(performanceThresholds.resourceLoad);
    }
  });
});

test.describe('API Performance Tests', () => {
  test('@performance User authentication API performance', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('http://localhost:9000');
    
    // Measure login API response time
    const loginStartTime = Date.now();
    
    await page.fill('[data-testid="email-input"]', testUsers.user.email);
    await page.fill('[data-testid="password-input"]', testUsers.user.password);
    
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/auth/') && response.status() < 400
    );
    
    await page.click('[data-testid="login-button"]');
    await responsePromise;
    
    const loginTime = Date.now() - loginStartTime;
    console.log(`Login API response time: ${loginTime}ms`);
    expect(loginTime).toBeLessThan(performanceThresholds.apiResponse);
  });

  test('@performance Campaign data loading performance', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('http://localhost:9000');
    
    // Login first
    await page.fill('[data-testid="email-input"]', testUsers.user.email);
    await page.fill('[data-testid="password-input"]', testUsers.user.password);
    await page.click('[data-testid="login-button"]');
    
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
    
    // Measure campaigns API response time
    const campaignsStartTime = Date.now();
    
    const campaignResponsePromise = page.waitForResponse(response => 
      response.url().includes('/campaigns') && response.status() === 200
    );
    
    await page.click('[data-testid="campaigns-menu"]');
    await campaignResponsePromise;
    
    const campaignsTime = Date.now() - campaignsStartTime;
    console.log(`Campaigns API response time: ${campaignsTime}ms`);
    expect(campaignsTime).toBeLessThan(performanceThresholds.apiResponse);
    
    // Test campaign list rendering performance
    const renderStartTime = Date.now();
    await page.waitForSelector('[data-testid="campaign-list"]');
    const renderTime = Date.now() - renderStartTime;
    
    console.log(`Campaign list render time: ${renderTime}ms`);
    expect(renderTime).toBeLessThan(performanceThresholds.interaction);
  });

  test('@performance Analytics data loading performance', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('http://localhost:9001');
    
    // Login as advertiser
    await page.fill('[data-testid="email-input"]', testUsers.advertiser.email);
    await page.fill('[data-testid="password-input"]', testUsers.advertiser.password);
    await page.click('[data-testid="login-button"]');
    
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
    
    // Measure analytics API response time
    const analyticsStartTime = Date.now();
    
    const analyticsResponsePromise = page.waitForResponse(response => 
      response.url().includes('/analytics') && response.status() === 200
    );
    
    await page.click('[data-testid="analytics-menu"]');
    await analyticsResponsePromise;
    
    const analyticsTime = Date.now() - analyticsStartTime;
    console.log(`Analytics API response time: ${analyticsTime}ms`);
    expect(analyticsTime).toBeLessThan(performanceThresholds.apiResponse * 1.5); // Analytics might be slower
    
    // Test chart rendering performance
    const chartRenderStartTime = Date.now();
    await page.waitForSelector('[data-testid="analytics-chart"]');
    const chartRenderTime = Date.now() - chartRenderStartTime;
    
    console.log(`Chart render time: ${chartRenderTime}ms`);
    expect(chartRenderTime).toBeLessThan(performanceThresholds.resourceLoad);
  });
});

test.describe('User Interaction Performance Tests', () => {
  test('@performance Navigation and routing performance', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('http://localhost:9000');
    
    // Login
    await page.fill('[data-testid="email-input"]', testUsers.user.email);
    await page.fill('[data-testid="password-input"]', testUsers.user.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForSelector('[data-testid="dashboard"]');
    
    // Test navigation between major sections
    const navigationRoutes = [
      { menu: '[data-testid="campaigns-menu"]', target: '[data-testid="campaign-list"]' },
      { menu: '[data-testid="wallet-menu"]', target: '[data-testid="wallet-dashboard"]' },
      { menu: '[data-testid="profile-menu"]', target: '[data-testid="profile-info"]' },
      { menu: '[data-testid="home-menu"]', target: '[data-testid="home-screen"]' }
    ];
    
    for (const route of navigationRoutes) {
      const navStartTime = Date.now();
      await page.click(route.menu);
      await page.waitForSelector(route.target, { timeout: 10000 });
      const navTime = Date.now() - navStartTime;
      
      console.log(`Navigation to ${route.menu} time: ${navTime}ms`);
      expect(navTime).toBeLessThan(performanceThresholds.interaction);
    }
  });

  test('@performance Form interactions and submissions', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('http://localhost:9000');
    
    // Test registration form performance
    await page.click('[data-testid="signup-link"]');
    await page.waitForSelector('[data-testid="signup-form"]');
    
    // Measure form field responsiveness
    const fieldInteractionTests = [
      { field: '[data-testid="email-input"]', value: 'test@example.com' },
      { field: '[data-testid="password-input"]', value: 'password123' },
      { field: '[data-testid="name-input"]', value: '테스트사용자' }
    ];
    
    for (const fieldTest of fieldInteractionTests) {
      const inputStartTime = Date.now();
      await page.fill(fieldTest.field, fieldTest.value);
      const inputTime = Date.now() - inputStartTime;
      
      console.log(`Field ${fieldTest.field} input time: ${inputTime}ms`);
      expect(inputTime).toBeLessThan(performanceThresholds.interaction);
    }
    
    // Test form validation responsiveness
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    
    const validationStartTime = Date.now();
    await page.click('[data-testid="signup-button"]');
    await page.waitForSelector('[data-testid="validation-error"]', { timeout: 5000 });
    const validationTime = Date.now() - validationStartTime;
    
    console.log(`Form validation time: ${validationTime}ms`);
    expect(validationTime).toBeLessThan(performanceThresholds.interaction);
  });

  test('@performance Search and filtering performance', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('http://localhost:9000');
    
    // Login
    await page.fill('[data-testid="email-input"]', testUsers.user.email);
    await page.fill('[data-testid="password-input"]', testUsers.user.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForSelector('[data-testid="dashboard"]');
    
    // Navigate to campaigns
    await page.click('[data-testid="campaigns-menu"]');
    await page.waitForSelector('[data-testid="campaign-list"]');
    
    // Test search performance
    const searchStartTime = Date.now();
    await page.fill('[data-testid="campaign-search"]', '뷰티');
    await page.waitForSelector('[data-testid="search-results"]', { timeout: 10000 });
    const searchTime = Date.now() - searchStartTime;
    
    console.log(`Search response time: ${searchTime}ms`);
    expect(searchTime).toBeLessThan(performanceThresholds.apiResponse);
    
    // Test filter performance
    const filterStartTime = Date.now();
    await page.selectOption('[data-testid="category-filter"]', '패션');
    await page.waitForSelector('[data-testid="filtered-campaigns"]', { timeout: 10000 });
    const filterTime = Date.now() - filterStartTime;
    
    console.log(`Filter response time: ${filterTime}ms`);
    expect(filterTime).toBeLessThan(performanceThresholds.interaction);
  });
});

test.describe('Resource Usage Performance Tests', () => {
  test('@performance Memory usage monitoring', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('http://localhost:9000');
    
    // Get initial memory usage
    const initialMemory = await measureMemoryUsage(page);
    console.log('Initial memory usage:', initialMemory);
    
    // Login and navigate through app
    await page.fill('[data-testid="email-input"]', testUsers.user.email);
    await page.fill('[data-testid="password-input"]', testUsers.user.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForSelector('[data-testid="dashboard"]');
    
    // Navigate through multiple sections to test for memory leaks
    const navigationSequence = [
      '[data-testid="campaigns-menu"]',
      '[data-testid="wallet-menu"]',
      '[data-testid="profile-menu"]',
      '[data-testid="referral-menu"]',
      '[data-testid="home-menu"]'
    ];
    
    for (let i = 0; i < 5; i++) { // Repeat navigation to stress test
      for (const menu of navigationSequence) {
        await page.click(menu);
        await page.waitForTimeout(1000);
      }
    }
    
    // Get final memory usage
    const finalMemory = await measureMemoryUsage(page);
    console.log('Final memory usage:', finalMemory);
    
    if (initialMemory && finalMemory) {
      const memoryGrowth = (finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize) / (1024 * 1024);
      console.log(`Memory growth: ${memoryGrowth.toFixed(2)}MB`);
      
      // Memory growth should be reasonable
      expect(memoryGrowth).toBeLessThan(performanceThresholds.memoryUsage);
    }
  });

  test('@performance Network resource optimization', async ({ page }) => {
    test.setTimeout(90000);

    const resourceSizes = [];
    const duplicateRequests = new Map();
    
    // Monitor network requests
    page.on('response', response => {
      const url = response.url();
      const size = parseInt(response.headers()['content-length'] || '0');
      
      resourceSizes.push({ url, size, type: response.request().resourceType() });
      
      // Track duplicate requests
      if (duplicateRequests.has(url)) {
        duplicateRequests.set(url, duplicateRequests.get(url) + 1);
      } else {
        duplicateRequests.set(url, 1);
      }
    });
    
    await page.goto('http://localhost:9000');
    await page.waitForLoadState('networkidle');
    
    // Analyze resource usage
    const totalSize = resourceSizes.reduce((sum, resource) => sum + resource.size, 0);
    const imageResources = resourceSizes.filter(r => r.type === 'image');
    const totalImageSize = imageResources.reduce((sum, resource) => sum + resource.size, 0);
    
    console.log(`Total resources size: ${(totalSize / 1024).toFixed(2)}KB`);
    console.log(`Total image size: ${(totalImageSize / 1024).toFixed(2)}KB`);
    console.log(`Number of requests: ${resourceSizes.length}`);
    
    // Check for excessive resource usage
    expect(totalSize).toBeLessThan(10 * 1024 * 1024); // Less than 10MB total
    
    // Check for duplicate requests (potential optimization opportunity)
    const duplicates = Array.from(duplicateRequests.entries()).filter(([, count]) => count > 1);
    console.log(`Duplicate requests: ${duplicates.length}`);
    
    // Should not have too many duplicate requests
    expect(duplicates.length).toBeLessThan(5);
    
    // Check for unoptimized images
    const largeImages = imageResources.filter(img => img.size > 500 * 1024); // > 500KB
    console.log(`Large images (>500KB): ${largeImages.length}`);
    
    // Log large images for optimization review
    largeImages.forEach(img => {
      console.log(`Large image: ${img.url} - ${(img.size / 1024).toFixed(2)}KB`);
    });
  });

  test('@performance Database query performance simulation', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('http://localhost:9001'); // Advertiser app for more complex data
    
    // Login as advertiser
    await page.fill('[data-testid="email-input"]', testUsers.advertiser.email);
    await page.fill('[data-testid="password-input"]', testUsers.advertiser.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForSelector('[data-testid="dashboard"]');
    
    // Test complex data loading scenarios
    const dataLoadingTests = [
      {
        name: 'Campaign Analytics',
        trigger: () => page.click('[data-testid="analytics-menu"]'),
        target: '[data-testid="analytics-dashboard"]'
      },
      {
        name: 'User Demographics',
        trigger: () => page.click('[data-testid="audience-insights"]'),
        target: '[data-testid="demographics-chart"]'
      },
      {
        name: 'Performance Reports',
        trigger: () => page.click('[data-testid="performance-reports"]'),
        target: '[data-testid="performance-table"]'
      }
    ];
    
    for (const test of dataLoadingTests) {
      const startTime = Date.now();
      
      // Monitor API calls during data loading
      const apiCalls = [];
      const apiListener = (response) => {
        if (response.url().includes('/api/')) {
          apiCalls.push({
            url: response.url(),
            status: response.status(),
            timing: Date.now() - startTime
          });
        }
      };
      
      page.on('response', apiListener);
      
      await test.trigger();
      await page.waitForSelector(test.target, { timeout: 10000 });
      
      page.off('response', apiListener);
      
      const totalTime = Date.now() - startTime;
      console.log(`${test.name} load time: ${totalTime}ms`);
      console.log(`${test.name} API calls: ${apiCalls.length}`);
      
      // Check performance thresholds
      expect(totalTime).toBeLessThan(performanceThresholds.resourceLoad);
      
      // Check API response times
      for (const apiCall of apiCalls) {
        expect(apiCall.timing).toBeLessThan(performanceThresholds.apiResponse);
      }
    }
  });
});

test.describe('Mobile Performance Tests', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('@performance @mobile Mobile page load performance', async ({ page }) => {
    test.setTimeout(90000);

    // Test mobile-specific performance
    const mobileLoadTime = await measurePageLoadTime(page, 'http://localhost:9000');
    
    console.log(`Mobile app load time: ${mobileLoadTime}ms`);
    // Mobile might be slightly slower due to viewport and touch optimizations
    expect(mobileLoadTime).toBeLessThan(performanceThresholds.pageLoad * 1.2);
    
    // Test mobile-specific interactions
    await page.tap('[data-testid="mobile-menu-button"]');
    const menuTime = Date.now();
    await page.waitForSelector('[data-testid="mobile-nav-menu"]');
    const mobileMenuTime = Date.now() - menuTime;
    
    console.log(`Mobile menu response time: ${mobileMenuTime}ms`);
    expect(mobileMenuTime).toBeLessThan(performanceThresholds.interaction);
  });

  test('@performance @mobile Mobile scroll and touch performance', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('http://localhost:9000');
    
    // Login
    await page.fill('[data-testid="email-input"]', testUsers.user.email);
    await page.fill('[data-testid="password-input"]', testUsers.user.password);
    await page.tap('[data-testid="login-button"]');
    await page.waitForSelector('[data-testid="dashboard"]');
    
    // Navigate to campaign list
    await page.tap('[data-testid="campaigns-menu"]');
    await page.waitForSelector('[data-testid="campaign-list"]');
    
    // Test scrolling performance
    const scrollStartTime = Date.now();
    
    // Simulate long scroll
    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(100);
    }
    
    const scrollTime = Date.now() - scrollStartTime;
    console.log(`Mobile scroll performance: ${scrollTime}ms for 10 scroll actions`);
    
    // Should maintain smooth scrolling
    expect(scrollTime / 10).toBeLessThan(200); // Less than 200ms per scroll action
  });
});

test.describe('Concurrent User Performance Tests', () => {
  test('@performance Multiple browser contexts simulation', async ({ browser }) => {
    test.setTimeout(180000);

    const contexts = [];
    const pages = [];
    
    try {
      // Create multiple browser contexts to simulate concurrent users
      for (let i = 0; i < 5; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        contexts.push(context);
        pages.push(page);
      }
      
      // Navigate all pages simultaneously
      const navigationPromises = pages.map(async (page, index) => {
        const startTime = Date.now();
        await page.goto('http://localhost:9000');
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;
        
        console.log(`Context ${index + 1} load time: ${loadTime}ms`);
        return loadTime;
      });
      
      const loadTimes = await Promise.all(navigationPromises);
      
      // Check that concurrent loading doesn't significantly degrade performance
      const averageLoadTime = loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length;
      console.log(`Average concurrent load time: ${averageLoadTime}ms`);
      
      expect(averageLoadTime).toBeLessThan(performanceThresholds.pageLoad * 1.5);
      
      // Test concurrent user interactions
      const interactionPromises = pages.map(async (page, index) => {
        const user = index % 2 === 0 ? testUsers.user : testUsers.advertiser;
        
        await page.fill('[data-testid="email-input"]', `${user.email}_${index}`);
        await page.fill('[data-testid="password-input"]', user.password);
        
        const loginStartTime = Date.now();
        await page.click('[data-testid="login-button"]');
        
        // Wait for either dashboard or login error
        try {
          await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
          return Date.now() - loginStartTime;
        } catch {
          // Login might fail for test users, that's ok
          return Date.now() - loginStartTime;
        }
      });
      
      const loginTimes = await Promise.all(interactionPromises);
      const averageLoginTime = loginTimes.reduce((sum, time) => sum + time, 0) / loginTimes.length;
      
      console.log(`Average concurrent login time: ${averageLoginTime}ms`);
      expect(averageLoginTime).toBeLessThan(performanceThresholds.apiResponse * 2);
      
    } finally {
      // Clean up contexts
      for (const context of contexts) {
        await context.close();
      }
    }
  });
});

test.describe('Performance Regression Detection', () => {
  test('@performance Baseline performance measurement', async ({ page }) => {
    test.setTimeout(120000);

    // This test establishes baseline performance metrics
    const performanceBaseline = {
      pageLoad: [],
      apiResponse: [],
      memoryUsage: [],
      resourceCount: 0
    };
    
    // Measure multiple iterations for statistical significance
    for (let i = 0; i < 3; i++) {
      // Page load measurement
      const loadTime = await measurePageLoadTime(page, 'http://localhost:9000');
      performanceBaseline.pageLoad.push(loadTime);
      
      // Memory measurement
      const memory = await measureMemoryUsage(page);
      if (memory) {
        performanceBaseline.memoryUsage.push(memory.usedJSHeapSize / (1024 * 1024));
      }
      
      // Count resources
      let resourceCount = 0;
      const resourceListener = () => resourceCount++;
      page.on('response', resourceListener);
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      page.off('response', resourceListener);
      performanceBaseline.resourceCount = Math.max(performanceBaseline.resourceCount, resourceCount);
    }
    
    // Calculate averages
    const avgLoadTime = performanceBaseline.pageLoad.reduce((sum, time) => sum + time, 0) / performanceBaseline.pageLoad.length;
    const avgMemory = performanceBaseline.memoryUsage.reduce((sum, mem) => sum + mem, 0) / performanceBaseline.memoryUsage.length;
    
    console.log('Performance Baseline:');
    console.log(`Average load time: ${avgLoadTime.toFixed(2)}ms`);
    console.log(`Average memory usage: ${avgMemory.toFixed(2)}MB`);
    console.log(`Resource count: ${performanceBaseline.resourceCount}`);
    
    // Store baseline (in real implementation, this would be saved to a file or database)
    await page.evaluate((baseline) => {
      window.localStorage.setItem('performanceBaseline', JSON.stringify(baseline));
    }, {
      avgLoadTime,
      avgMemory,
      resourceCount: performanceBaseline.resourceCount
    });
    
    // Assert that baseline meets minimum requirements
    expect(avgLoadTime).toBeLessThan(performanceThresholds.pageLoad);
    expect(avgMemory).toBeLessThan(performanceThresholds.memoryUsage);
  });
});