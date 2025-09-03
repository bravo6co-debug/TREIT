const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Use VITE_ prefixed variables from .env.local
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Debug: Check environment variables
console.log('Environment check:');
console.log('SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
console.log('SERVICE_KEY:', SERVICE_KEY ? '✓' : '✗');

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.');
  console.error('필요한 변수: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function testClickTrackingSystem() {
  console.log('🚀 클릭 추적 시스템 테스트 시작...\n');

  try {
    // 1. 테스트용 사용자 생성 또는 조회
    console.log('1️⃣ 테스트 사용자 확인...');
    const testUserEmail = 'click-test@example.com';
    
    let { data: testUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', testUserEmail)
      .single();

    if (userError) {
      // 사용자가 없으면 생성
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: testUserEmail,
          username: 'clicktester',
          full_name: 'Click Test User',
          level: 5,
          xp: 500,
          total_earnings: 0,
          balance: 0,
          referral_code: 'CLICKTEST123'
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ 사용자 생성 실패:', createError);
        return;
      }
      testUser = newUser;
    }
    console.log('✅ 테스트 사용자:', testUser.email);

    // 2. 테스트용 비즈니스 생성 또는 조회
    console.log('\n2️⃣ 테스트 비즈니스 확인...');
    const testBusinessEmail = 'click-business@example.com';
    
    let { data: testBusiness, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .eq('email', testBusinessEmail)
      .single();

    if (businessError) {
      const { data: newBusiness, error: createError } = await supabase
        .from('businesses')
        .insert({
          email: testBusinessEmail,
          business_name: 'Click Test Company',
          representative_name: 'Test CEO',
          status: 'verified',
          balance: 100000,
          is_verified: true
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ 비즈니스 생성 실패:', createError);
        return;
      }
      testBusiness = newBusiness;
    }
    console.log('✅ 테스트 비즈니스:', testBusiness.business_name);

    // 3. 테스트 캠페인 생성
    console.log('\n3️⃣ 테스트 캠페인 생성...');
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert({
        business_id: testBusiness.id,
        title: '클릭 추적 테스트 캠페인',
        description: '클릭 추적 시스템 테스트용 캠페인',
        category: 'SHOPPING',
        cpc_rate: 500,
        daily_budget: 50000,
        total_budget: 500000,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        targeting: {
          age_min: 20,
          age_max: 50,
          gender: 'all',
          locations: ['서울', '경기']
        }
      })
      .select()
      .single();

    if (campaignError) {
      console.error('❌ 캠페인 생성 실패:', campaignError);
      return;
    }
    console.log('✅ 캠페인 생성됨:', campaign.title, `(CPC: ${campaign.cpc_rate}원)`);

    // 4. 사용자-캠페인 참여 생성
    console.log('\n4️⃣ 사용자 캠페인 참여 생성...');
    const trackingCode = 'test' + Date.now().toString(36);
    
    const { data: userCampaign, error: ucError } = await supabase
      .from('user_campaigns')
      .insert({
        user_id: testUser.id,
        campaign_id: campaign.id,
        tracking_code: trackingCode,
        status: 'active'
      })
      .select()
      .single();

    if (ucError) {
      console.error('❌ 사용자 캠페인 생성 실패:', ucError);
      return;
    }
    console.log('✅ 사용자 캠페인 생성됨, 추적 코드:', trackingCode);

    // 5. 딥링크 매핑 생성
    console.log('\n5️⃣ 딥링크 매핑 생성...');
    const { data: deeplink, error: deeplinkError } = await supabase
      .from('deeplink_mappings')
      .insert({
        tracking_code: trackingCode,
        original_url: 'https://example-shop.com/product/123',
        user_campaign_id: userCampaign.id,
        campaign_id: campaign.id,
        title: '테스트 딥링크',
        description: '클릭 추적 테스트용 딥링크',
        utm_source: 'treit',
        utm_medium: 'test',
        utm_campaign: 'click_tracking_test'
      })
      .select()
      .single();

    if (deeplinkError) {
      console.error('❌ 딥링크 생성 실패:', deeplinkError);
      console.error('상세 에러:', deeplinkError.details);
      return;
    }
    console.log('✅ 딥링크 생성됨:', deeplink.tracking_code);

    // 6. 클릭 이벤트 시뮬레이션
    console.log('\n6️⃣ 클릭 이벤트 생성...');
    const clickEvents = [];
    
    for (let i = 0; i < 5; i++) {
      const { data: clickEvent, error: clickError } = await supabase
        .from('click_events')
        .insert({
          user_campaign_id: userCampaign.id,
          campaign_id: campaign.id,
          user_id: testUser.id,
          ip_address: `192.168.1.${100 + i}`,
          user_agent: 'Mozilla/5.0 Test Browser',
          device_type: i % 2 === 0 ? 'MOBILE' : 'DESKTOP',
          referrer_url: 'https://social-media.com',
          landing_url: deeplink.original_url,
          session_id: `session_${Date.now()}_${i}`,
          is_unique: true,
          is_valid: true,
          commission_amount: campaign.cpc_rate,
          clicked_at: new Date().toISOString(),
          metadata: {
            test: true,
            iteration: i + 1
          }
        })
        .select()
        .single();

      if (clickError) {
        console.error(`❌ 클릭 이벤트 ${i + 1} 생성 실패:`, clickError);
        continue;
      }
      
      clickEvents.push(clickEvent);
      console.log(`✅ 클릭 이벤트 ${i + 1} 생성됨`);
      
      // 클릭 간 간격 두기 (실제 시나리오 시뮬레이션)
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 7. 통계 확인
    console.log('\n7️⃣ 통계 확인...');
    
    // 딥링크 통계
    const { data: updatedDeeplink } = await supabase
      .from('deeplink_mappings')
      .select('*')
      .eq('tracking_code', trackingCode)
      .single();
    
    console.log('📊 딥링크 통계:');
    console.log(`  - 총 클릭수: ${updatedDeeplink?.click_count || 0}`);
    console.log(`  - 유니크 클릭: ${updatedDeeplink?.unique_clicks || 0}`);
    
    // 캠페인 통계
    const { data: updatedCampaign } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaign.id)
      .single();
    
    console.log('\n📊 캠페인 통계:');
    console.log(`  - 총 클릭수: ${updatedCampaign?.total_clicks || 0}`);
    console.log(`  - 총 지출액: ${updatedCampaign?.total_spent || 0}원`);
    
    // 사용자 수익
    const { data: updatedUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', testUser.id)
      .single();
    
    console.log('\n📊 사용자 수익:');
    console.log(`  - 총 수익: ${updatedUser?.total_earnings || 0}원`);
    console.log(`  - 잔액: ${updatedUser?.balance || 0}원`);
    console.log(`  - 레벨: ${updatedUser?.level} (XP: ${updatedUser?.xp})`);

    // 8. 정리 (선택사항)
    console.log('\n8️⃣ 테스트 데이터 정리...');
    const cleanup = false; // true로 변경하면 테스트 데이터 삭제
    
    if (cleanup) {
      // 클릭 이벤트 삭제
      await supabase
        .from('click_events')
        .delete()
        .eq('user_campaign_id', userCampaign.id);
      
      // 딥링크 삭제
      await supabase
        .from('deeplink_mappings')
        .delete()
        .eq('tracking_code', trackingCode);
      
      // 사용자 캠페인 삭제
      await supabase
        .from('user_campaigns')
        .delete()
        .eq('id', userCampaign.id);
      
      // 캠페인 삭제
      await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaign.id);
      
      console.log('✅ 테스트 데이터 정리 완료');
    } else {
      console.log('ℹ️ 테스트 데이터 유지됨');
    }

    console.log('\n✨ 클릭 추적 시스템 테스트 완료!');
    console.log('🔗 딥링크 URL:', `https://tre-it.com/r/${trackingCode}`);

  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error);
  }
}

// 테스트 실행
testClickTrackingSystem();