import { db } from '../supabase';
import { toast } from 'sonner';

export interface Campaign {
  id: string;
  business_id: string;
  name: string;
  description: string;
  category: string;
  budget: number;
  spent: number;
  cpc_rate: number;
  start_date: string;
  end_date: string;
  target_clicks: number;
  current_clicks: number;
  destination_url: string;
  image_url?: string;
  is_active: boolean;
  approval_status: string;
  created_at: string;
  // Calculated fields
  effective_cpc?: number; // CPC with level bonus
  remaining_budget?: number;
}

export interface UserCampaign {
  id: string;
  user_id: string;
  campaign_id: string;
  tracking_code: string;
  total_clicks: number;
  total_earnings: number;
  status: string;
  shared_url?: string;
  created_at: string;
  campaign?: Campaign;
}

// 사용 가능한 캠페인 목록 가져오기
export async function getAvailableCampaigns(userId: string) {
  try {
    console.log('Fetching available campaigns for user:', userId);

    // 먼저 사용자 정보와 레벨 정보 가져오기
    const { data: userData, error: userError } = await db
      .from('users')
      .select(`
        *,
        level_config:level_config!level(
          cpc_bonus_rate
        )
      `)
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      toast.error('사용자 정보를 불러올 수 없습니다');
      return [];
    }

    const bonusRate = userData?.level_config?.cpc_bonus_rate || 0;

    // 활성 캠페인 가져오기
    const { data: campaigns, error } = await db
      .from('campaigns')
      .select('*')
      .eq('is_active', true)
      .eq('approval_status', 'APPROVED')
      .lte('start_date', new Date().toISOString())
      .gte('end_date', new Date().toISOString())
      .order('cpc_rate', { ascending: false });

    if (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('캠페인을 불러올 수 없습니다');
      return [];
    }

    // 이미 참여 중인 캠페인 확인
    const { data: userCampaigns, error: ucError } = await db
      .from('user_campaigns')
      .select('campaign_id')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE');

    if (ucError) {
      console.error('Error fetching user campaigns:', ucError);
    }

    const participatingIds = userCampaigns?.map(uc => uc.campaign_id) || [];

    // 참여하지 않은 캠페인만 필터링하고 레벨 보너스 적용
    const availableCampaigns = campaigns
      ?.filter(campaign => !participatingIds.includes(campaign.id))
      .filter(campaign => campaign.budget > campaign.spent) // 예산이 남은 캠페인만
      .map(campaign => ({
        ...campaign,
        effective_cpc: campaign.cpc_rate + (campaign.cpc_rate * bonusRate / 100),
        remaining_budget: campaign.budget - campaign.spent
      })) || [];

    console.log('Available campaigns:', availableCampaigns.length);
    return availableCampaigns;

  } catch (error) {
    console.error('Error in getAvailableCampaigns:', error);
    toast.error('캠페인 목록을 불러오는데 실패했습니다');
    return [];
  }
}

// 내가 참여 중인 캠페인 목록
export async function getMyCampaigns(userId: string) {
  try {
    const { data, error } = await db
      .from('user_campaigns')
      .select(`
        *,
        campaign:campaigns(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching my campaigns:', error);
      toast.error('참여 중인 캠페인을 불러올 수 없습니다');
      return [];
    }

    return data || [];

  } catch (error) {
    console.error('Error in getMyCampaigns:', error);
    toast.error('캠페인 목록을 불러오는데 실패했습니다');
    return [];
  }
}

// 캠페인 참여하기
export async function participateInCampaign(userId: string, campaignId: string) {
  try {
    console.log('Participating in campaign:', { userId, campaignId });

    // 이미 참여 중인지 확인
    const { data: existing, error: checkError } = await db
      .from('user_campaigns')
      .select('id')
      .eq('user_id', userId)
      .eq('campaign_id', campaignId)
      .single();

    if (existing) {
      toast.warning('이미 참여 중인 캠페인입니다');
      return null;
    }

    // 트래킹 코드 생성
    const trackingCode = generateTrackingCode();

    // 캠페인 참여 레코드 생성
    const { data, error } = await db
      .from('user_campaigns')
      .insert({
        user_id: userId,
        campaign_id: campaignId,
        tracking_code: trackingCode,
        status: 'ACTIVE',
        total_clicks: 0,
        total_earnings: 0
      })
      .select()
      .single();

    if (error) {
      console.error('Error participating in campaign:', error);
      toast.error('캠페인 참여에 실패했습니다');
      return null;
    }

    toast.success('캠페인에 성공적으로 참여했습니다!');
    return data;

  } catch (error) {
    console.error('Error in participateInCampaign:', error);
    toast.error('캠페인 참여 중 오류가 발생했습니다');
    return null;
  }
}

// 트래킹 코드 생성
function generateTrackingCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 트래킹 URL 생성
export function generateTrackingUrl(trackingCode: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/track/${trackingCode}`;
}

// 캠페인 상세 정보 가져오기
export async function getCampaignDetail(campaignId: string) {
  try {
    const { data, error } = await db
      .from('campaigns')
      .select(`
        *,
        business:businesses(
          business_name,
          logo_url
        )
      `)
      .eq('id', campaignId)
      .single();

    if (error) {
      console.error('Error fetching campaign detail:', error);
      toast.error('캠페인 정보를 불러올 수 없습니다');
      return null;
    }

    return data;

  } catch (error) {
    console.error('Error in getCampaignDetail:', error);
    toast.error('캠페인 정보를 불러오는데 실패했습니다');
    return null;
  }
}

// 캠페인 통계 가져오기
export async function getCampaignStats(userId: string, campaignId: string) {
  try {
    const { data, error } = await db
      .from('user_campaigns')
      .select('*')
      .eq('user_id', userId)
      .eq('campaign_id', campaignId)
      .single();

    if (error) {
      console.error('Error fetching campaign stats:', error);
      return null;
    }

    // 오늘의 클릭 수 가져오기
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: todayClicks, error: clickError } = await db
      .from('click_events')
      .select('id')
      .eq('user_id', userId)
      .eq('campaign_id', campaignId)
      .gte('click_time', today.toISOString())
      .count();

    if (clickError) {
      console.error('Error fetching today clicks:', clickError);
    }

    return {
      ...data,
      today_clicks: todayClicks || 0
    };

  } catch (error) {
    console.error('Error in getCampaignStats:', error);
    return null;
  }
}