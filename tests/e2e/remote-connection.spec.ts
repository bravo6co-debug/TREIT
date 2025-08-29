import { test, expect } from '@playwright/test';

/**
 * Remote Connection Test for TreitMaster
 * Tests basic connectivity to remote Supabase environment
 */
test.describe('Remote Environment Connection Tests', () => {
  test('Can connect to remote Supabase API', async ({ request }) => {
    // Test direct API connection
    const response = await request.get('https://qbdctgumggdtfewttela.supabase.co/rest/v1/', {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZGN0Z3VtZ2dkdGZld3R0ZWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NjIxMDEsImV4cCI6MjA3MjAzODEwMX0.WzbMhCyFDmibNhHjNBfpK70V8a1pF-ordZBLo63XKwE',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZGN0Z3VtZ2dkdGZld3R0ZWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NjIxMDEsImV4cCI6MjA3MjAzODEwMX0.WzbMhCyFDmibNhHjNBfpK70V8a1pF-ordZBLo63XKwE'
      }
    });
    
    expect(response.status()).toBeLessThan(500);
    console.log('Supabase API Status:', response.status());
  });

  test('Can access Supabase Auth', async ({ request }) => {
    const response = await request.get('https://qbdctgumggdtfewttela.supabase.co/auth/v1/settings', {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZGN0Z3VtZ2dkdGZld3R0ZWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NjIxMDEsImV4cCI6MjA3MjAzODEwMX0.WzbMhCyFDmibNhHjNBfpK70V8a1pF-ordZBLo63XKwE',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZGN0Z3VtZ2dkdGZld3R0ZWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NjIxMDEsImV4cCI6MjA3MjAzODEwMX0.WzbMhCyFDmibNhHjNBfpK70V8a1pF-ordZBLo63XKwE'
      }
    });
    
    expect(response.status()).toBeLessThan(500);
    console.log('Supabase Auth Status:', response.status());
    
    if (response.ok()) {
      const data = await response.json();
      console.log('Auth Settings:', JSON.stringify(data, null, 2));
    }
  });

  test('Database tables are accessible', async ({ request }) => {
    // Try to access level_config table (should exist if schema was applied)
    const response = await request.get('https://qbdctgumggdtfewttela.supabase.co/rest/v1/level_config?select=level,grade,required_xp&limit=5', {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZGN0Z3VtZ2dkdGZld3R0ZWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NjIxMDEsImV4cCI6MjA3MjAzODEwMX0.WzbMhCyFDmibNhHjNBfpK70V8a1pF-ordZBLo63XKwE',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZGN0Z3VtZ2dkdGZld3R0ZWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NjIxMDEsImV4cCI6MjA3MjAzODEwMX0.WzbMhCyFDmibNhHjNBfpK70V8a1pF-ordZBLo63XKwE'
      }
    });
    
    console.log('Level Config API Status:', response.status());
    
    if (response.ok()) {
      const data = await response.json();
      console.log('Level Config Data:', JSON.stringify(data, null, 2));
      expect(Array.isArray(data)).toBe(true);
    } else {
      console.log('Level config table might not exist yet');
      // This is expected if schema hasn't been applied yet
    }
  });

  test('Environment variables are set correctly', async ({ page }) => {
    // Create a simple HTML page to test environment variables
    await page.setContent(`
      <html>
        <body>
          <script>
            window.testConfig = {
              supabaseUrl: '${process.env.VITE_SUPABASE_URL || 'NOT_SET'}',
              hasApiKey: '${process.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'NOT_SET'}'
            };
          </script>
          <div id="config-test">Config loaded</div>
        </body>
      </html>
    `);

    const config = await page.evaluate(() => window.testConfig);
    console.log('Environment Config:', config);
    
    expect(config.supabaseUrl).toContain('qbdctgumggdtfewttela.supabase.co');
    expect(config.hasApiKey).toBe('SET');
  });
});