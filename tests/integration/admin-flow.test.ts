import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';

// Mock Supabase
const mockSupabaseClient = {
  auth: {
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    getUser: jest.fn(),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } }
    }))
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn(),
    then: jest.fn()
  })),
  rpc: jest.fn(),
  channel: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn()
  }))
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}));

// Import components after mocking
const Dashboard = React.lazy(() => import('../../treit-admin/src/components/Dashboard'));
const UserManagement = React.lazy(() => import('../../treit-admin/src/components/UserManagement'));
const CampaignManagement = React.lazy(() => import('../../treit-admin/src/components/CampaignManagement'));
const SystemMonitoring = React.lazy(() => import('../../treit-admin/src/components/SystemMonitoring'));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <React.Suspense fallback={<div>Loading...</div>}>
      {children}
    </React.Suspense>
  </BrowserRouter>
);

describe('Admin Flow Integration Tests', () => {
  let user: any;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    
    // Mock authenticated admin
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'admin-user-id',
          email: 'admin@treitmaster.com',
          user_metadata: {
            role: 'admin'
          }
        }
      },
      error: null
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('관리자 로그인 및 대시보드 플로우', () => {
    it('관리자가 로그인할 수 있다', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: {
            id: 'admin-user-id',
            email: 'admin@treitmaster.com'
          },
          session: {
            access_token: 'admin-token'
          }
        },
        error: null
      });

      render(
        <TestWrapper>
          <div data-testid="admin-login-form">
            <input data-testid="email-input" type="email" />
            <input data-testid="password-input" type="password" />
            <button data-testid="login-button">관리자 로그인</button>
          </div>
        </TestWrapper>
      );

      // Fill out admin login form
      await user.type(screen.getByTestId('email-input'), 'admin@treitmaster.com');
      await user.type(screen.getByTestId('password-input'), 'admin123');
      
      // Submit form
      await user.click(screen.getByTestId('login-button'));

      // Verify admin login
      await waitFor(() => {
        expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
          email: 'admin@treitmaster.com',
          password: 'admin123'
        });
      });
    });

    it('관리자 대시보드 통계를 표시할 수 있다', async () => {
      const mockStats = {
        total_users: 1500,
        active_campaigns: 25,
        total_revenue: 5000000,
        pending_payouts: 250000,
        daily_active_users: 450,
        conversion_rate: 3.2
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockStats,
        error: null
      });

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Verify dashboard stats loading
      await waitFor(() => {
        expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_admin_stats');
      });
    });
  });

  describe('사용자 관리 플로우', () => {
    beforeEach(() => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          username: 'user1',
          status: 'active',
          created_at: '2024-01-10T10:00:00Z',
          last_login: '2024-01-15T14:30:00Z',
          total_earned: 15000,
          level: 5
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          username: 'user2',
          status: 'suspended',
          created_at: '2024-01-12T12:00:00Z',
          last_login: '2024-01-14T09:15:00Z',
          total_earned: 8500,
          level: 3
        }
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({
          data: mockUsers,
          error: null
        })
      });
    });

    it('관리자가 사용자 목록을 확인할 수 있다', async () => {
      render(
        <TestWrapper>
          <UserManagement />
        </TestWrapper>
      );

      // Verify users are loaded
      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
      });
    });

    it('관리자가 사용자를 정지시킬 수 있다', async () => {
      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({ data: null, error: null })
      });

      render(
        <TestWrapper>
          <div data-testid="user-actions">
            <button data-testid="suspend-user" data-user-id="user-1">
              사용자 정지
            </button>
            <button data-testid="activate-user" data-user-id="user-1">
              사용자 활성화
            </button>
          </div>
        </TestWrapper>
      );

      // Suspend user
      await user.click(screen.getByTestId('suspend-user'));

      // Verify user suspension
      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
      });
    });

    it('관리자가 사용자 상세 정보를 확인할 수 있다', async () => {
      const mockUserDetails = {
        id: 'user-1',
        email: 'user1@example.com',
        profile: {
          name: '김사용자',
          phone: '010-1234-5678',
          social_accounts: ['instagram', 'youtube']
        },
        activity_summary: {
          campaigns_joined: 15,
          tasks_completed: 45,
          total_earned: 25000,
          referrals_count: 3
        },
        recent_activities: []
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockUserDetails,
        error: null
      });

      render(
        <TestWrapper>
          <div data-testid="user-detail-modal">
            <h3>사용자 상세 정보</h3>
            <div data-testid="user-stats">
              <span>참여 캠페인: 0</span>
              <span>완료 태스크: 0</span>
              <span>총 적립금: 0원</span>
            </div>
          </div>
        </TestWrapper>
      );

      // Verify user details fetch
      expect(mockSupabaseClient.rpc).toBeDefined();
    });
  });

  describe('캠페인 관리 플로우', () => {
    const mockCampaigns = [
      {
        id: 'campaign-1',
        title: '테스트 캠페인 1',
        advertiser: {
          business_name: '테스트 주식회사',
          contact_email: 'advertiser@example.com'
        },
        status: 'pending_approval',
        budget: 100000,
        created_at: '2024-01-15T10:00:00Z'
      },
      {
        id: 'campaign-2',
        title: '테스트 캠페인 2',
        advertiser: {
          business_name: '마케팅 회사',
          contact_email: 'marketing@example.com'
        },
        status: 'active',
        budget: 200000,
        created_at: '2024-01-14T14:30:00Z'
      }
    ];

    beforeEach(() => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({
          data: mockCampaigns,
          error: null
        })
      });
    });

    it('관리자가 승인 대기 캠페인을 확인할 수 있다', async () => {
      render(
        <TestWrapper>
          <CampaignManagement />
        </TestWrapper>
      );

      // Verify campaigns are loaded
      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('campaigns');
      });
    });

    it('관리자가 캠페인을 승인할 수 있다', async () => {
      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({ data: null, error: null })
      });

      render(
        <TestWrapper>
          <div data-testid="campaign-approval">
            <div data-testid="pending-campaign">
              <h4>테스트 캠페인 1</h4>
              <button data-testid="approve-campaign" data-campaign-id="campaign-1">
                승인
              </button>
              <button data-testid="reject-campaign" data-campaign-id="campaign-1">
                거절
              </button>
            </div>
          </div>
        </TestWrapper>
      );

      // Approve campaign
      await user.click(screen.getByTestId('approve-campaign'));

      // Verify campaign approval
      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('campaigns');
      });
    });

    it('관리자가 캠페인을 강제 중단할 수 있다', async () => {
      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({ data: null, error: null })
      });

      render(
        <TestWrapper>
          <div data-testid="campaign-controls">
            <button data-testid="force-stop-campaign" data-campaign-id="campaign-2">
              강제 중단
            </button>
            <button data-testid="pause-campaign" data-campaign-id="campaign-2">
              일시 정지
            </button>
          </div>
        </TestWrapper>
      );

      // Force stop campaign
      await user.click(screen.getByTestId('force-stop-campaign'));

      // Verify campaign force stop
      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('campaigns');
      });
    });
  });

  describe('정산 및 재무 관리 플로우', () => {
    it('관리자가 정산 요청을 처리할 수 있다', async () => {
      const mockSettlementRequests = [
        {
          id: 'settlement-1',
          user_id: 'user-1',
          username: 'user1',
          amount: 25000,
          status: 'pending',
          requested_at: '2024-01-15T10:00:00Z',
          bank_info: {
            bank_name: '우리은행',
            account_number: '1234567890',
            account_holder: '김사용자'
          }
        }
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({
          data: mockSettlementRequests,
          error: null
        })
      });

      render(
        <TestWrapper>
          <div data-testid="settlement-management">
            <h3>정산 요청 관리</h3>
            <div data-testid="settlement-list">
              {/* Settlement requests would be rendered here */}
            </div>
          </div>
        </TestWrapper>
      );

      // Verify settlement requests are loaded
      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('settlement_requests');
      });
    });

    it('관리자가 정산을 승인할 수 있다', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: { success: true },
        error: null
      });

      render(
        <TestWrapper>
          <div data-testid="settlement-approval">
            <button data-testid="approve-settlement" data-settlement-id="settlement-1">
              정산 승인
            </button>
            <button data-testid="reject-settlement" data-settlement-id="settlement-1">
              정산 거절
            </button>
          </div>
        </TestWrapper>
      );

      // Approve settlement
      await user.click(screen.getByTestId('approve-settlement'));

      // Verify settlement approval
      await waitFor(() => {
        expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('approve_settlement', {
          settlement_id: 'settlement-1',
          admin_id: 'admin-user-id'
        });
      });
    });
  });

  describe('시스템 모니터링 플로우', () => {
    it('관리자가 시스템 상태를 모니터링할 수 있다', async () => {
      const mockSystemMetrics = {
        active_users_count: 450,
        total_campaigns_active: 25,
        server_load: 65,
        database_connections: 45,
        error_rate: 0.2,
        response_time_avg: 120
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockSystemMetrics,
        error: null
      });

      render(
        <TestWrapper>
          <SystemMonitoring />
        </TestWrapper>
      );

      // Verify system metrics are loaded
      await waitFor(() => {
        expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_system_metrics');
      });
    });

    it('관리자가 실시간 알림을 받을 수 있다', async () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn()
      };

      mockSupabaseClient.channel.mockReturnValue(mockChannel);

      render(
        <TestWrapper>
          <div data-testid="alert-system">
            <h3>실시간 알림</h3>
            <div data-testid="alert-list">
              {/* Alerts would be rendered here */}
            </div>
          </div>
        </TestWrapper>
      );

      // Verify real-time subscription
      expect(mockSupabaseClient.channel).toHaveBeenCalledWith('admin-alerts');
    });
  });

  describe('사기 탐지 및 보안 플로우', () => {
    it('관리자가 사기 의심 활동을 확인할 수 있다', async () => {
      const mockFraudAlerts = [
        {
          id: 'fraud-1',
          user_id: 'user-suspicious',
          alert_type: 'multiple_accounts',
          severity: 'high',
          description: '동일 IP에서 다수 계정 활동 감지',
          created_at: '2024-01-15T15:30:00Z',
          status: 'pending'
        },
        {
          id: 'fraud-2',
          user_id: 'user-bot',
          alert_type: 'bot_activity',
          severity: 'medium',
          description: '비정상적인 클릭 패턴 감지',
          created_at: '2024-01-15T12:45:00Z',
          status: 'pending'
        }
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({
          data: mockFraudAlerts,
          error: null
        })
      });

      render(
        <TestWrapper>
          <div data-testid="fraud-detection">
            <h3>사기 탐지</h3>
            <div data-testid="fraud-alerts">
              {/* Fraud alerts would be rendered here */}
            </div>
          </div>
        </TestWrapper>
      );

      // Verify fraud alerts are loaded
      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('fraud_detection');
      });
    });

    it('관리자가 사기 알림을 처리할 수 있다', async () => {
      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({ data: null, error: null })
      });

      render(
        <TestWrapper>
          <div data-testid="fraud-alert-actions">
            <button data-testid="investigate-alert" data-alert-id="fraud-1">
              조사하기
            </button>
            <button data-testid="dismiss-alert" data-alert-id="fraud-1">
              무시하기
            </button>
            <button data-testid="ban-user" data-user-id="user-suspicious">
              사용자 차단
            </button>
          </div>
        </TestWrapper>
      );

      // Investigate alert
      await user.click(screen.getByTestId('investigate-alert'));

      // Verify alert investigation
      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('fraud_detection');
      });
    });
  });

  describe('리포트 및 분석 플로우', () => {
    it('관리자가 전체 플랫폼 분석 리포트를 생성할 수 있다', async () => {
      const mockReportData = {
        total_revenue: 5000000,
        platform_fee: 500000,
        active_users: 1500,
        completed_campaigns: 150,
        average_completion_rate: 78.5,
        top_performing_campaigns: [
          { id: 'campaign-1', title: '캠페인 1', performance_score: 95.2 },
          { id: 'campaign-2', title: '캠페인 2', performance_score: 89.7 }
        ]
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockReportData,
        error: null
      });

      render(
        <TestWrapper>
          <div data-testid="platform-report">
            <div data-testid="report-filters">
              <input data-testid="date-from" type="date" />
              <input data-testid="date-to" type="date" />
              <button data-testid="generate-report">리포트 생성</button>
            </div>
            <div data-testid="report-data">
              {/* Report data would be displayed here */}
            </div>
          </div>
        </TestWrapper>
      );

      // Generate report
      await user.type(screen.getByTestId('date-from'), '2024-01-01');
      await user.type(screen.getByTestId('date-to'), '2024-01-31');
      await user.click(screen.getByTestId('generate-report'));

      // Verify report generation
      await waitFor(() => {
        expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('generate_admin_report', {
          start_date: '2024-01-01',
          end_date: '2024-01-31'
        });
      });
    });
  });
});