// 랭킹 시스템 API
import { supabase } from '../supabase';

export interface RankingUser {
  user_id: string;
  username: string;
  level: number;
  total_xp: number;
  rank: number;
  is_new_user: boolean;
  avatar_url?: string;
}

export interface MyRanking {
  rank: number;
  total_xp: number;
  percentile: number;
  is_new_user: boolean;
  boost_multiplier: number;
}

export interface WeekInfo {
  week_start: string;
  week_end: string;
  days_remaining: number;
  hours_remaining: number;
}

export interface MileageInfo {
  balance: number;
  total_earned: number;
  total_spent: number;
}

// 현재 주 정보 가져오기
export const getCurrentWeekInfo = (): WeekInfo => {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1);
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  const msRemaining = sunday.getTime() - now.getTime();
  const daysRemaining = Math.floor(msRemaining / (1000 * 60 * 60 * 24));
  const hoursRemaining = Math.floor((msRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  return {
    week_start: monday.toISOString().split('T')[0],
    week_end: sunday.toISOString().split('T')[0],
    days_remaining: daysRemaining,
    hours_remaining: hoursRemaining
  };
};

// 전체 랭킹 조회 (TOP 100)
export const fetchWeeklyRankings = async (): Promise<RankingUser[]> => {
  try {
    const { data, error } = await supabase.rpc('calculate_current_rankings');
    
    if (error) {
      console.error('Error fetching rankings:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Failed to fetch rankings:', error);
    return [];
  }
};

// 내 랭킹 조회
export const fetchMyRanking = async (userId: string): Promise<MyRanking | null> => {
  try {
    const { data, error } = await supabase.rpc('get_my_ranking', { 
      p_user_id: userId 
    });
    
    if (error) {
      console.error('Error fetching my ranking:', error);
      return null;
    }
    
    return data?.[0] || null;
  } catch (error) {
    console.error('Failed to fetch my ranking:', error);
    return null;
  }
};

// XP 로그 추가 (랭킹 시스템에 기록)
export const logXPGain = async (
  userId: string,
  xpAmount: number,
  sourceType: string,
  sourceDescription?: string
): Promise<void> => {
  try {
    const { error } = await supabase.rpc('add_xp_log', {
      p_user_id: userId,
      p_xp_amount: xpAmount,
      p_source_type: sourceType,
      p_source_description: sourceDescription
    });
    
    if (error) {
      console.error('Error logging XP gain:', error);
    }
  } catch (error) {
    console.error('Failed to log XP gain:', error);
  }
};

// 내 마일리지 조회
export const fetchMyMileage = async (userId: string): Promise<MileageInfo | null> => {
  try {
    const { data, error } = await supabase
      .from('user_mileage')
      .select('balance, total_earned, total_spent')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      // 마일리지 레코드가 없는 경우 기본값 반환
      if (error.code === 'PGRST116') {
        return {
          balance: 0,
          total_earned: 0,
          total_spent: 0
        };
      }
      console.error('Error fetching mileage:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Failed to fetch mileage:', error);
    return null;
  }
};

// 지난 주 랭킹 히스토리 조회
export const fetchLastWeekRanking = async (userId: string): Promise<number | null> => {
  try {
    const lastMonday = new Date();
    lastMonday.setDate(lastMonday.getDate() - lastMonday.getDay() - 6);
    lastMonday.setHours(0, 0, 0, 0);
    const weekStart = lastMonday.toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('weekly_ranking_history')
      .select('final_rank')
      .eq('user_id', userId)
      .eq('week_start', weekStart)
      .single();
    
    if (error) {
      return null;
    }
    
    return data?.final_rank || null;
  } catch (error) {
    console.error('Failed to fetch last week ranking:', error);
    return null;
  }
};

// 랭킹 보상 정보
export const RANKING_REWARDS = [
  { rank: 1, reward: 10000, emoji: '🥇' },
  { rank: 2, reward: 7000, emoji: '🥈' },
  { rank: 3, reward: 5000, emoji: '🥉' },
  { rank: 4, reward: 3000, emoji: '🏅' },
  { rank: 5, reward: 3000, emoji: '🏅' },
  { rank: 6, reward: 2000, emoji: '🎖️' },
  { rank: 7, reward: 2000, emoji: '🎖️' },
  { rank: 8, reward: 2000, emoji: '🎖️' },
  { rank: 9, reward: 2000, emoji: '🎖️' },
  { rank: 10, reward: 2000, emoji: '🎖️' }
];

// 순위별 보상 금액 가져오기
export const getRewardByRank = (rank: number): number => {
  const reward = RANKING_REWARDS.find(r => r.rank === rank);
  return reward?.reward || 0;
};

// 순위별 이모지 가져오기
export const getRankEmoji = (rank: number): string => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  if (rank <= 5) return '🏅';
  if (rank <= 10) return '🎖️';
  if (rank <= 20) return '⭐';
  if (rank <= 50) return '✨';
  return '';
};

// 순위 변동 표시
export const getRankChange = (currentRank: number, previousRank: number | null): string => {
  if (!previousRank) return 'NEW';
  if (currentRank < previousRank) return `↑${previousRank - currentRank}`;
  if (currentRank > previousRank) return `↓${currentRank - previousRank}`;
  return '-';
};

// 실시간 랭킹 업데이트 구독
export const subscribeToRankingUpdates = (callback: (payload: any) => void) => {
  const channel = supabase
    .channel('ranking-updates')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'weekly_xp_rankings'
      },
      callback
    )
    .subscribe();
  
  return channel;
};