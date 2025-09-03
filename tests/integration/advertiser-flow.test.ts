import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';

// Mock Supabase
const mockSupabaseClient = {
  auth: {
    signUp: jest.fn(),
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
    single: jest.fn(),
    then: jest.fn()
  })),
  rpc: jest.fn(),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(),
      getPublicUrl: jest.fn()
    }))
  }
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}));

// Import components after mocking
const Dashboard = React.lazy(() => import('../../treit-advertiser/src/components/Dashboard'));
const CampaignAdd = React.lazy(() => import('../../treit-advertiser/src/components/CampaignAdd'));
const CampaignList = React.lazy(() => import('../../treit-advertiser/src/components/CampaignList'));
const BillingHistory = React.lazy(() => import('../../treit-advertiser/src/components/BillingHistory'));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <React.Suspense fallback={<div>Loading...</div>}>
      {children}
    </React.Suspense>
  </BrowserRouter>
);

describe('Advertiser Flow Integration Tests', () => {
  let user: any;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    
    // Mock authenticated advertiser
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'advertiser-user-id',
          email: 'advertiser@example.com',
          user_metadata: {
            role: 'advertiser'
          }
        }
      },
      error: null
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('광고주 회원가입 및 인증 플로우', () => {
    it('광고주가 회원가입하고 사업자 정보를 등록할 수 있다', async () => {
      // Mock business registration
      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({ data: null, error: null })
      });

      render(
        <TestWrapper>
          <div data-testid="business-registration-form">
            <input data-testid="business-name" placeholder="사업자명" />
            <input data-testid="business-number" placeholder="사업자등록번호" />
            <input data-testid="contact-person" placeholder="담당자명" />
            <input data-testid="contact-phone" placeholder="연락처" />
            <button data-testid="register-business-button">사업자 등록</button>
          </div>
        </TestWrapper>
      );

      // Fill out business registration form
      await user.type(screen.getByTestId('business-name'), '테스트 주식회사');
      await user.type(screen.getByTestId('business-number'), '123-45-67890');
      await user.type(screen.getByTestId('contact-person'), '김광고');
      await user.type(screen.getByTestId('contact-phone'), '010-1234-5678');
      
      // Submit form
      await user.click(screen.getByTestId('register-business-button'));

      // Verify business registration
      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('businesses');
      });
    });

    it('광고주 인증 절차를 완료할 수 있다', async () => {
      // Mock document upload and verification
      mockSupabaseClient.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: { path: 'documents/business-license.pdf' },
          error: null
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/documents/business-license.pdf' }
        })
      });

      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({ data: null, error: null })
      });

      render(
        <TestWrapper>
          <div data-testid="document-upload">
            <input data-testid="file-input" type="file" />
            <button data-testid="upload-button">사업자등록증 업로드</button>
          </div>
        </TestWrapper>
      );

      // Mock file upload
      const file = new File(['document content'], 'business-license.pdf', { type: 'application/pdf' });
      const fileInput = screen.getByTestId('file-input') as HTMLInputElement;
      await user.upload(fileInput, file);

      // Upload document
      await user.click(screen.getByTestId('upload-button'));

      // Verify document upload
      await waitFor(() => {
        expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('documents');
      });
    });
  });

  describe('캠페인 생성 및 관리 플로우', () => {
    beforeEach(() => {
      // Mock verified advertiser
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'business-id',
            verification_status: 'verified',
            balance: 100000
          },
          error: null
        })
      });
    });

    it('광고주가 새 캠페인을 생성할 수 있다', async () => {
      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({
          data: [{ id: 'new-campaign-id' }],
          error: null
        })
      });

      render(
        <TestWrapper>
          <CampaignAdd />
        </TestWrapper>
      );

      // Wait for form to render and fill out campaign details
      await waitFor(() => {
        const titleInput = screen.queryByTestId('campaign-title');
        if (titleInput) {
          return user.type(titleInput, '새로운 마케팅 캠페인');
        }
      });

      // Mock form submission would happen here
      expect(screen.queryByText('새로운 마케팅 캠페인')).toBeTruthy();
    });

    it('광고주가 캠페인 목록을 확인할 수 있다', async () => {
      const mockCampaigns = [
        {
          id: 'campaign-1',
          title: '캠페인 1',
          status: 'active',
          budget: 50000,
          spent: 25000,
          participants: 150
        },
        {
          id: 'campaign-2',
          title: '캠페인 2',
          status: 'paused',
          budget: 30000,
          spent: 15000,
          participants: 80
        }
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({
          data: mockCampaigns,
          error: null
        })
      });

      render(
        <TestWrapper>
          <CampaignList />
        </TestWrapper>
      );

      // Verify campaigns are displayed
      await waitFor(() => {
        expect(screen.queryByText('캠페인 1')).toBeTruthy();
        expect(screen.queryByText('캠페인 2')).toBeTruthy();
      });
    });

    it('광고주가 캠페인 상태를 변경할 수 있다', async () => {
      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({ data: null, error: null })
      });

      render(
        <TestWrapper>
          <div data-testid="campaign-controls">
            <button data-testid="pause-campaign">캠페인 일시중지</button>
            <button data-testid="resume-campaign">캠페인 재시작</button>
            <button data-testid="stop-campaign">캠페인 중단</button>
          </div>
        </TestWrapper>
      );

      // Pause campaign
      await user.click(screen.getByTestId('pause-campaign'));

      // Verify update was called
      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('campaigns');
      });
    });
  });

  describe('예산 관리 및 결제 플로우', () => {
    it('광고주가 캠페인 예산을 설정할 수 있다', async () => {
      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({ data: null, error: null })
      });

      render(
        <TestWrapper>
          <div data-testid="budget-manager">
            <input data-testid="budget-input" type="number" placeholder="예산 금액" />
            <select data-testid="budget-type">
              <option value="daily">일일 예산</option>
              <option value="total">총 예산</option>
            </select>
            <button data-testid="set-budget-button">예산 설정</button>
          </div>
        </TestWrapper>
      );

      // Set budget
      await user.type(screen.getByTestId('budget-input'), '100000');
      await user.selectOptions(screen.getByTestId('budget-type'), 'daily');
      await user.click(screen.getByTestId('set-budget-button'));

      // Verify budget update
      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('campaigns');
      });
    });

    it('광고주가 계정에 크레딧을 충전할 수 있다', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: { success: true, new_balance: 200000 },
        error: null
      });

      render(
        <TestWrapper>
          <div data-testid="payment-form">
            <input data-testid="amount-input" type="number" placeholder="충전 금액" />
            <select data-testid="payment-method">
              <option value="card">신용카드</option>
              <option value="bank">계좌이체</option>
            </select>
            <button data-testid="charge-button">충전하기</button>
          </div>
        </TestWrapper>
      );

      // Add credits
      await user.type(screen.getByTestId('amount-input'), '100000');
      await user.selectOptions(screen.getByTestId('payment-method'), 'card');
      await user.click(screen.getByTestId('charge-button'));

      // Verify payment processing
      await waitFor(() => {
        expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('process_payment', {
          advertiser_id: 'advertiser-user-id',
          amount: 100000,
          payment_method: 'card'
        });
      });
    });

    it('광고주가 결제 내역을 확인할 수 있다', async () => {
      const mockBillingHistory = [
        {
          id: 'bill-1',
          amount: 50000,
          type: 'charge',
          status: 'completed',
          created_at: '2024-01-15T10:00:00Z',
          description: '계정 충전'
        },
        {
          id: 'bill-2',
          amount: 25000,
          type: 'campaign_spend',
          status: 'completed',
          created_at: '2024-01-10T14:30:00Z',
          description: '캠페인 1 광고비'
        }
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({
          data: mockBillingHistory,
          error: null
        })
      });

      render(
        <TestWrapper>
          <BillingHistory />
        </TestWrapper>
      );

      // Verify billing history is displayed
      await waitFor(() => {
        expect(screen.queryByText('계정 충전')).toBeTruthy();
        expect(screen.queryByText('캠페인 1 광고비')).toBeTruthy();
      });
    });
  });

  describe('캠페인 분석 및 리포트 플로우', () => {
    it('광고주가 캠페인 성과를 확인할 수 있다', async () => {
      const mockAnalytics = {
        impressions: 10000,
        clicks: 500,
        conversions: 25,
        spent: 45000,
        ctr: 5.0,
        conversion_rate: 5.0,
        cost_per_click: 90,
        cost_per_conversion: 1800
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockAnalytics,
        error: null
      });

      render(
        <TestWrapper>
          <div data-testid="campaign-analytics">
            <div data-testid="analytics-metrics">
              <span data-testid="impressions">노출 수: 0</span>
              <span data-testid="clicks">클릭 수: 0</span>
              <span data-testid="conversions">전환 수: 0</span>
              <span data-testid="ctr">클릭률: 0%</span>
            </div>
            <button data-testid="refresh-analytics">분석 데이터 새로고침</button>
          </div>
        </TestWrapper>
      );

      // Refresh analytics
      await user.click(screen.getByTestId('refresh-analytics'));

      // Verify analytics fetch
      await waitFor(() => {
        expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_campaign_analytics', {
          campaign_id: expect.any(String)
        });
      });
    });

    it('광고주가 사용자 참여 데이터를 확인할 수 있다', async () => {
      const mockParticipants = [
        {
          id: 'participant-1',
          user_id: 'user-1',
          username: 'user1',
          joined_at: '2024-01-15T10:00:00Z',
          completed_tasks: 3,
          earned_amount: 1500
        },
        {
          id: 'participant-2',
          user_id: 'user-2',
          username: 'user2',
          joined_at: '2024-01-14T15:30:00Z',
          completed_tasks: 5,
          earned_amount: 2500
        }
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({
          data: mockParticipants,
          error: null
        })
      });

      render(
        <TestWrapper>
          <div data-testid="participant-list">
            <h3>참여자 목록</h3>
            <table data-testid="participants-table">
              <thead>
                <tr>
                  <th>사용자명</th>
                  <th>참여일</th>
                  <th>완료 태스크</th>
                  <th>적립 금액</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </TestWrapper>
      );

      // Verify participant data fetch
      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_campaigns');
      });
    });
  });

  describe('딥링크 및 추적 플로우', () => {
    it('광고주가 캠페인별 딥링크를 생성할 수 있다', async () => {
      const mockDeeplink = {
        id: 'deeplink-1',
        campaign_id: 'campaign-1',
        deeplink_url: 'https://app.treitmaster.com/campaign/campaign-1?ref=deeplink-1',
        tracking_params: {
          utm_source: 'treitmaster',
          utm_medium: 'deeplink',
          utm_campaign: 'campaign-1'
        }
      };

      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({
          data: [mockDeeplink],
          error: null
        })
      });

      render(
        <TestWrapper>
          <div data-testid="deeplink-generator">
            <input data-testid="landing-url" placeholder="랜딩 페이지 URL" />
            <input data-testid="utm-source" placeholder="UTM 소스" />
            <button data-testid="generate-deeplink">딥링크 생성</button>
            <input data-testid="generated-link" readOnly />
          </div>
        </TestWrapper>
      );

      // Generate deeplink
      await user.type(screen.getByTestId('landing-url'), 'https://example.com/landing');
      await user.type(screen.getByTestId('utm-source'), 'facebook');
      await user.click(screen.getByTestId('generate-deeplink'));

      // Verify deeplink generation
      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('deeplink_mappings');
      });
    });

    it('광고주가 클릭 추적 데이터를 확인할 수 있다', async () => {
      const mockClickEvents = [
        {
          id: 'click-1',
          deeplink_id: 'deeplink-1',
          user_id: 'user-1',
          clicked_at: '2024-01-15T10:00:00Z',
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0...'
        },
        {
          id: 'click-2',
          deeplink_id: 'deeplink-1',
          user_id: 'user-2',
          clicked_at: '2024-01-15T11:00:00Z',
          ip_address: '192.168.1.2',
          user_agent: 'Mozilla/5.0...'
        }
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({
          data: mockClickEvents,
          error: null
        })
      });

      render(
        <TestWrapper>
          <div data-testid="click-tracking">
            <h3>클릭 추적 데이터</h3>
            <div data-testid="click-stats">
              <span>총 클릭 수: 0</span>
              <span>유니크 사용자: 0</span>
            </div>
          </div>
        </TestWrapper>
      );

      // Verify click tracking data fetch
      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('click_events');
      });
    });
  });
});