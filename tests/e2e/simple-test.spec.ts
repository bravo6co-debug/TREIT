import { test, expect } from '@playwright/test';

// Get environment variables with fallbacks
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qbdctgumggdtfewttela.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZGN0Z3VtZ2dkdGZld3R0ZWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NjIxMDEsImV4cCI6MjA3MjAzODEwMX0.WzbMhCyFDmibNhHjNBfpK70V8a1pF-ordZBLo63XKwE';

test.describe('Simple Connection Test', () => {
  test('User app is accessible @user-app', async ({ page }) => {
    // User app 접속 테스트
    await page.goto('http://localhost:9000');
    
    // 페이지가 로드되었는지 확인
    await expect(page).toHaveURL(/localhost:900\d/);
    
    // 기본 요소가 있는지 확인 (타이틀이나 주요 컴포넌트)
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    
    console.log('✅ User app is running and accessible');
  });

  test('Advertiser app is accessible @advertiser-app', async ({ page }) => {
    // Advertiser app 접속 테스트
    await page.goto('http://localhost:9001');
    
    // 페이지가 로드되었는지 확인
    await expect(page).toHaveURL(/localhost:900\d/);
    
    // 기본 요소가 있는지 확인
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    
    console.log('✅ Advertiser app is running and accessible');
  });

  test('Admin app is accessible @admin-app', async ({ page }) => {
    // Admin app 접속 테스트
    await page.goto('http://localhost:9002');
    
    // 페이지가 로드되었는지 확인
    await expect(page).toHaveURL(/localhost:900\d/);
    
    // 기본 요소가 있는지 확인
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    
    console.log('✅ Admin app is running and accessible');
  });

  test('Supabase connection works', async ({ request }) => {
    // Supabase API 연결 테스트
    const response = await request.get(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY
      }
    });
    
    expect(response.status()).toBe(200);
    console.log('✅ Supabase API is accessible');
  });

  test('Level data exists in database', async ({ request }) => {
    // 레벨 데이터 조회 테스트
    const response = await request.get(`${SUPABASE_URL}/rest/v1/level_config?select=level,grade&limit=5`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY
      }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.length).toBeGreaterThan(0);
    console.log('✅ Level data found:', data.length, 'records');
  });
});