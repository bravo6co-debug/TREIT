import { supabase } from '../supabase'

// 결제 관련 타입 정의
export interface PaymentMethod {
  id: string
  type: 'card' | 'bank' | 'mobile' | 'digital'
  name: string
  isDefault: boolean
  metadata: {
    cardLast4?: string
    cardBrand?: string
    bankName?: string
    bankAccount?: string
    phoneNumber?: string
  }
  createdAt: string
  updatedAt: string
}

export interface PaymentRequest {
  amount: number
  currency: string
  paymentMethodId: string
  description?: string
  metadata?: Record<string, any>
  returnUrl?: string
  webhookUrl?: string
}

export interface PaymentResponse {
  transactionId: string
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  amount: number
  currency: string
  paymentMethod: PaymentMethod
  paymentUrl?: string
  qrCode?: string
  createdAt: string
  updatedAt: string
}

export interface Transaction {
  id: string
  transactionId: string
  userId: string
  type: 'deposit' | 'payment' | 'refund' | 'withdrawal'
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  paymentMethodId: string
  campaignId?: string
  description: string
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface RefundRequest {
  transactionId: string
  amount?: number // partial refund amount, full refund if not specified
  reason: string
}

export interface BillingStats {
  totalDeposits: number
  totalSpent: number
  totalRefunds: number
  currentBalance: number
  monthlySpending: number
  pendingTransactions: number
}

// 결제 API 클래스
export class PaymentAPI {
  private baseUrl: string
  private apiKey: string

  constructor() {
    // 환경 변수에서 결제 서비스 설정 가져오기
    this.baseUrl = import.meta.env.VITE_PAYMENT_API_URL || 'https://api.payment-service.com'
    this.apiKey = import.meta.env.VITE_PAYMENT_API_KEY || 'test_api_key'
  }

  /**
   * 사용자의 결제 수단 목록 조회
   */
  async getPaymentMethods(userId: string): Promise<{ data: PaymentMethod[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      return { data: data || [], error: null }
    } catch (error) {
      console.error('Get payment methods error:', error)
      return { data: null, error }
    }
  }

  /**
   * 새로운 결제 수단 등록
   */
  async addPaymentMethod(
    userId: string, 
    paymentMethodData: Omit<PaymentMethod, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<{ data: PaymentMethod | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .insert({
          user_id: userId,
          ...paymentMethodData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      console.error('Add payment method error:', error)
      return { data: null, error }
    }
  }

  /**
   * 결제 수단 삭제
   */
  async removePaymentMethod(paymentMethodId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentMethodId)

      if (error) throw error

      return { error: null }
    } catch (error) {
      console.error('Remove payment method error:', error)
      return { error }
    }
  }

  /**
   * 결제 처리
   */
  async processPayment(
    userId: string,
    paymentRequest: PaymentRequest
  ): Promise<{ data: PaymentResponse | null; error: any }> {
    try {
      // 1. 거래 기록 생성
      const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          transaction_id: transactionId,
          user_id: userId,
          type: 'deposit',
          amount: paymentRequest.amount,
          currency: paymentRequest.currency,
          status: 'pending',
          payment_method_id: paymentRequest.paymentMethodId,
          description: paymentRequest.description || 'Account deposit',
          metadata: paymentRequest.metadata,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (transactionError) throw transactionError

      // 2. 실제 결제 처리 (외부 결제 서비스 연동)
      const paymentResponse = await this.callExternalPaymentAPI(paymentRequest, transactionId)

      // 3. 결제 결과에 따른 거래 상태 업데이트
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          status: paymentResponse.status,
          updated_at: new Date().toISOString()
        })
        .eq('transaction_id', transactionId)

      if (updateError) throw updateError

      // 4. 결제 성공 시 사용자 잔액 업데이트
      if (paymentResponse.status === 'completed') {
        await this.updateUserBalance(userId, paymentRequest.amount)
      }

      return { data: paymentResponse, error: null }
    } catch (error) {
      console.error('Process payment error:', error)
      return { data: null, error }
    }
  }

  /**
   * 외부 결제 API 호출
   */
  private async callExternalPaymentAPI(
    paymentRequest: PaymentRequest,
    transactionId: string
  ): Promise<PaymentResponse> {
    // 실제 환경에서는 외부 결제 서비스 (토스페이먼츠, 아임포트 등) API를 호출
    // 여기서는 Mock 처리
    
    // 결제 수단 정보 조회
    const { data: paymentMethod } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('id', paymentRequest.paymentMethodId)
      .single()

    // Mock 결제 처리 로직
    const isSuccess = Math.random() > 0.1 // 90% 성공률

    // 실제 API 호출 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 2000))

    return {
      transactionId,
      status: isSuccess ? 'completed' : 'failed',
      amount: paymentRequest.amount,
      currency: paymentRequest.currency,
      paymentMethod: paymentMethod || {} as PaymentMethod,
      paymentUrl: paymentMethod?.type === 'mobile' ? `https://payment.example.com/mobile/${transactionId}` : undefined,
      qrCode: paymentMethod?.type === 'mobile' ? `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==` : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  /**
   * 사용자 잔액 업데이트
   */
  private async updateUserBalance(userId: string, amount: number): Promise<void> {
    try {
      // 현재 잔액 조회
      const { data: profile } = await supabase
        .from('advertiser_profiles')
        .select('balance')
        .eq('id', userId)
        .single()

      const currentBalance = profile?.balance || 0
      const newBalance = currentBalance + amount

      // 잔액 업데이트
      await supabase
        .from('advertiser_profiles')
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

    } catch (error) {
      console.error('Update user balance error:', error)
      throw error
    }
  }

  /**
   * 환불 처리
   */
  async processRefund(
    userId: string,
    refundRequest: RefundRequest
  ): Promise<{ data: Transaction | null; error: any }> {
    try {
      // 1. 원본 거래 조회
      const { data: originalTransaction, error: transactionError } = await supabase
        .from('transactions')
        .select('*')
        .eq('transaction_id', refundRequest.transactionId)
        .eq('user_id', userId)
        .single()

      if (transactionError || !originalTransaction) {
        throw new Error('Original transaction not found')
      }

      // 2. 환불 가능성 검증
      if (originalTransaction.status !== 'completed') {
        throw new Error('Cannot refund incomplete transaction')
      }

      const refundAmount = refundRequest.amount || Math.abs(originalTransaction.amount)
      
      if (refundAmount > Math.abs(originalTransaction.amount)) {
        throw new Error('Refund amount exceeds original transaction amount')
      }

      // 3. 환불 거래 생성
      const refundTransactionId = `REF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const { data: refundTransaction, error: refundError } = await supabase
        .from('transactions')
        .insert({
          transaction_id: refundTransactionId,
          user_id: userId,
          type: 'refund',
          amount: refundAmount,
          currency: originalTransaction.currency,
          status: 'completed',
          payment_method_id: originalTransaction.payment_method_id,
          description: `Refund for ${refundRequest.transactionId}: ${refundRequest.reason}`,
          metadata: {
            original_transaction_id: refundRequest.transactionId,
            refund_reason: refundRequest.reason
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (refundError) throw refundError

      // 4. 사용자 잔액 업데이트
      await this.updateUserBalance(userId, refundAmount)

      return { data: refundTransaction, error: null }
    } catch (error) {
      console.error('Process refund error:', error)
      return { data: null, error }
    }
  }

  /**
   * 거래 내역 조회
   */
  async getTransactions(
    userId: string,
    options: {
      limit?: number
      offset?: number
      type?: string
      status?: string
      startDate?: string
      endDate?: string
    } = {}
  ): Promise<{ data: Transaction[] | null; error: any }> {
    try {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          payment_methods (
            type,
            name,
            metadata
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (options.type) {
        query = query.eq('type', options.type)
      }

      if (options.status) {
        query = query.eq('status', options.status)
      }

      if (options.startDate) {
        query = query.gte('created_at', options.startDate)
      }

      if (options.endDate) {
        query = query.lte('created_at', options.endDate)
      }

      if (options.limit) {
        const offset = options.offset || 0
        query = query.range(offset, offset + options.limit - 1)
      }

      const { data, error } = await query

      if (error) throw error

      return { data: data || [], error: null }
    } catch (error) {
      console.error('Get transactions error:', error)
      return { data: null, error }
    }
  }

  /**
   * 특정 거래 상세 조회
   */
  async getTransactionDetail(
    userId: string,
    transactionId: string
  ): Promise<{ data: Transaction | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          payment_methods (
            type,
            name,
            metadata
          )
        `)
        .eq('user_id', userId)
        .eq('transaction_id', transactionId)
        .single()

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      console.error('Get transaction detail error:', error)
      return { data: null, error }
    }
  }

  /**
   * 결제 통계 조회
   */
  async getBillingStats(userId: string): Promise<{ data: BillingStats | null; error: any }> {
    try {
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('type, amount, status, created_at')
        .eq('user_id', userId)

      if (error) throw error

      if (!transactions || transactions.length === 0) {
        return {
          data: {
            totalDeposits: 0,
            totalSpent: 0,
            totalRefunds: 0,
            currentBalance: 0,
            monthlySpending: 0,
            pendingTransactions: 0
          },
          error: null
        }
      }

      const completedTransactions = transactions.filter(t => t.status === 'completed')
      
      const totalDeposits = completedTransactions
        .filter(t => t.type === 'deposit')
        .reduce((sum, t) => sum + t.amount, 0)
      
      const totalSpent = Math.abs(completedTransactions
        .filter(t => t.type === 'payment')
        .reduce((sum, t) => sum + t.amount, 0))
      
      const totalRefunds = completedTransactions
        .filter(t => t.type === 'refund')
        .reduce((sum, t) => sum + t.amount, 0)

      const currentBalance = totalDeposits + totalRefunds - totalSpent

      // 이번 달 지출 계산
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthlySpending = Math.abs(completedTransactions
        .filter(t => 
          t.type === 'payment' && 
          new Date(t.created_at) >= monthStart
        )
        .reduce((sum, t) => sum + t.amount, 0))

      const pendingTransactions = transactions
        .filter(t => t.status === 'pending').length

      const stats: BillingStats = {
        totalDeposits,
        totalSpent,
        totalRefunds,
        currentBalance,
        monthlySpending,
        pendingTransactions
      }

      return { data: stats, error: null }
    } catch (error) {
      console.error('Get billing stats error:', error)
      return { data: null, error }
    }
  }

  /**
   * 결제 상태 확인 (Webhook 처리용)
   */
  async handlePaymentWebhook(webhookData: any): Promise<{ success: boolean; error?: any }> {
    try {
      const { transactionId, status, amount, metadata } = webhookData

      // 거래 상태 업데이트
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          status,
          metadata: { ...metadata, webhook_received_at: new Date().toISOString() },
          updated_at: new Date().toISOString()
        })
        .eq('transaction_id', transactionId)

      if (updateError) throw updateError

      // 결제 완료 시 추가 처리
      if (status === 'completed') {
        const { data: transaction } = await supabase
          .from('transactions')
          .select('user_id, amount')
          .eq('transaction_id', transactionId)
          .single()

        if (transaction) {
          await this.updateUserBalance(transaction.user_id, transaction.amount)
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Handle payment webhook error:', error)
      return { success: false, error }
    }
  }

  /**
   * 자동 결제 설정
   */
  async setupAutoPayment(
    userId: string,
    settings: {
      enabled: boolean
      threshold: number
      amount: number
      paymentMethodId: string
      maxMonthlyAmount: number
    }
  ): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('auto_payment_settings')
        .upsert({
          user_id: userId,
          enabled: settings.enabled,
          threshold: settings.threshold,
          amount: settings.amount,
          payment_method_id: settings.paymentMethodId,
          max_monthly_amount: settings.maxMonthlyAmount,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      return { error: null }
    } catch (error) {
      console.error('Setup auto payment error:', error)
      return { error }
    }
  }

  /**
   * 자동 결제 실행 (스케줄러에서 호출)
   */
  async executeAutoPayment(userId: string): Promise<{ success: boolean; error?: any }> {
    try {
      // 자동 결제 설정 조회
      const { data: settings, error: settingsError } = await supabase
        .from('auto_payment_settings')
        .select('*')
        .eq('user_id', userId)
        .eq('enabled', true)
        .single()

      if (settingsError || !settings) {
        return { success: false, error: 'Auto payment not configured' }
      }

      // 현재 잔액 확인
      const { data: profile } = await supabase
        .from('advertiser_profiles')
        .select('balance')
        .eq('id', userId)
        .single()

      const currentBalance = profile?.balance || 0

      // 자동 충전 조건 확인
      if (currentBalance >= settings.threshold) {
        return { success: false, error: 'Balance above threshold' }
      }

      // 월별 자동 충전 한도 확인
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      
      const { data: monthlyTransactions } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('type', 'deposit')
        .gte('created_at', monthStart.toISOString())

      const monthlyTotal = monthlyTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0

      if (monthlyTotal + settings.amount > settings.max_monthly_amount) {
        return { success: false, error: 'Monthly auto payment limit exceeded' }
      }

      // 자동 결제 실행
      const paymentRequest: PaymentRequest = {
        amount: settings.amount,
        currency: 'KRW',
        paymentMethodId: settings.payment_method_id,
        description: 'Auto payment - balance recharge',
        metadata: { auto_payment: true }
      }

      const { data: paymentResult, error: paymentError } = await this.processPayment(
        userId,
        paymentRequest
      )

      if (paymentError || !paymentResult) {
        throw paymentError || new Error('Auto payment failed')
      }

      return { success: paymentResult.status === 'completed' }
    } catch (error) {
      console.error('Execute auto payment error:', error)
      return { success: false, error }
    }
  }
}

// 싱글톤 인스턴스
export const paymentAPI = new PaymentAPI()

// 편의 함수들
export const getPaymentMethods = (userId: string) => paymentAPI.getPaymentMethods(userId)
export const processPayment = (userId: string, paymentRequest: PaymentRequest) => 
  paymentAPI.processPayment(userId, paymentRequest)
export const processRefund = (userId: string, refundRequest: RefundRequest) => 
  paymentAPI.processRefund(userId, refundRequest)
export const getTransactions = (userId: string, options?: any) => 
  paymentAPI.getTransactions(userId, options)
export const getBillingStats = (userId: string) => paymentAPI.getBillingStats(userId)
export const setupAutoPayment = (userId: string, settings: any) => 
  paymentAPI.setupAutoPayment(userId, settings)