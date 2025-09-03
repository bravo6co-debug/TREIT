import { test, expect } from '@playwright/test';

test.describe('Debug Tests', () => {
  test('Inspect user app structure', async ({ page }) => {
    await page.goto('http://localhost:9000');
    
    // Wait for React app to load
    await page.waitForSelector('#root > *', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await page.screenshot({ path: 'debug-homepage.png' });
    
    // Get all visible text
    const visibleText = await page.evaluate(() => {
      return document.body.innerText;
    });
    console.log('Visible text on page:', visibleText);
    
    // Find all input fields
    const inputs = await page.$$eval('input', elements => 
      elements.map(el => ({
        type: el.type,
        name: el.name,
        placeholder: el.placeholder,
        id: el.id,
        className: el.className
      }))
    );
    console.log('Input fields found:', inputs);
    
    // Find all buttons
    const buttons = await page.$$eval('button', elements => 
      elements.map(el => ({
        text: el.innerText,
        type: el.type,
        className: el.className
      }))
    );
    console.log('Buttons found:', buttons);
    
    // Find all links
    const links = await page.$$eval('a', elements => 
      elements.map(el => ({
        text: el.innerText,
        href: el.href
      }))
    );
    console.log('Links found:', links);
    
    // Check current URL
    console.log('Current URL:', page.url());
  });
});