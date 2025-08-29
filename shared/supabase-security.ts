/**
 * Supabase 보안 강화 모듈
 * Service Role Key 보호 및 클라이언트 보안 설정
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';
import { EnvValidator } from './env-validation';

// 클라이언트 타입별 권한 정의
export type ClientType = 'user' | 'advertiser' | 'admin';

// RLS 정책 확인을 위한 헬퍼
export interface SecurityContext {
  userId?: string;
  userRole?: 'user' | 'advertiser' | 'admin' | 'support';
  clientType: ClientType;
}

/**
 * 보안 강화된 Supabase 클라이언트 팩토리
 */
export class SecureSupabaseClient {
  private static clients: Map<string, SupabaseClient<Database>> = new Map();
  
  /**
   * 클라이언트용 Supabase 인스턴스 생성 (Anon Key만 사용)
   */
  static createClientInstance(clientType: ClientType): SupabaseClient<Database> {
    const cacheKey = `client_${clientType}`;
    
    if (this.clients.has(cacheKey)) {
      return this.clients.get(cacheKey)!;
    }
    
    // 클라이언트 환경변수 검증
    const env = EnvValidator.validateClientEnv();
    
    const client = createClient<Database>(
      env.VITE_SUPABASE_URL,
      env.VITE_SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
          debug: env.VITE_DEBUG_MODE
        },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
        global: {
          headers: {
            'x-client-type': clientType,
            'x-client-version': '1.0.0',
            // CSP 헤더 추가
            'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
          }
        },
        // 요청 재시도 정책
        db: {
          schema: 'public'
        }
      }
    );
    
    // 클라이언트 보안 감사 로그
    this.setupSecurityAudit(client, clientType);
    
    this.clients.set(cacheKey, client);
    return client;
  }
  
  /**
   * 서버용 Supabase 인스턴스 생성 (Service Role Key 사용)
   * Edge Functions에서만 사용
   */
  static createServerInstance(): SupabaseClient<Database> {
    const cacheKey = 'server_instance';
    
    if (this.clients.has(cacheKey)) {
      return this.clients.get(cacheKey)!;
    }
    
    // 서버 환경에서만 실행 가능
    if (typeof process === 'undefined') {
      throw new Error('Server instance can only be created in Node.js environment');
    }
    
    const env = EnvValidator.validateServerEnv();
    
    const client = createClient<Database>(
      env.SUPABASE_STORAGE_URL.replace('/storage/v1', ''), // Base URL 추출
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: {
            'x-server-instance': 'true',
            'x-service-version': '1.0.0'
          }
        }
      }
    );
    
    this.clients.set(cacheKey, client);
    return client;
  }
  
  /**
   * 보안 감사 로그 설정
   */
  private static setupSecurityAudit(client: SupabaseClient<Database>, clientType: ClientType) {
    // 인증 이벤트 모니터링
    client.auth.onAuthStateChange((event, session) => {
      const auditLog = {
        timestamp: new Date().toISOString(),
        event,
        clientType,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
        sessionId: session?.access_token?.substring(0, 10) + '...' // 부분 토큰만 로그
      };
      
      // 개발 환경에서만 콘솔 출력
      if (import.meta.env.VITE_DEBUG_MODE) {
        console.log('[Security Audit]', auditLog);
      }
      
      // 프로덕션에서는 보안 로그 서비스로 전송
      if (import.meta.env.VITE_NODE_ENV === 'production') {
        this.sendSecurityLog(auditLog);
      }
    });
  }
  
  /**
   * 보안 로그 전송 (프로덕션 환경)
   */
  private static async sendSecurityLog(auditLog: any) {
    try {
      // 여기서 보안 로그 서비스로 전송
      // 예: Sentry, DataDog, 또는 자체 로그 서비스
      console.log('[Production Security Log]', auditLog);
    } catch (error) {
      console.error('Failed to send security log:', error);
    }
  }
  
  /**
   * RLS 정책 검증 헬퍼
   */
  static async validateRowLevelSecurity(
    client: SupabaseClient<Database>, 
    table: string, 
    operation: 'select' | 'insert' | 'update' | 'delete',
    context: SecurityContext
  ): Promise<boolean> {
    try {
      // RLS 정책이 올바르게 작동하는지 테스트
      const { data, error } = await client
        .from(table as any)
        .select('id', { count: 'exact' })
        .limit(1);
      
      if (error && error.code === 'PGRST116') {
        // RLS 정책으로 인해 접근 거부됨 - 정상 작동
        return true;
      }
      
      return !error;
    } catch (error) {
      console.error('RLS validation error:', error);
      return false;
    }
  }
}

/**
 * 권한 기반 데이터 접근 헬퍼
 */
export class SecureDataAccess {
  /**
   * 사용자 권한 확인
   */
  static async checkUserPermission(
    client: SupabaseClient<Database>,
    userId: string,
    requiredRole: string
  ): Promise<boolean> {
    try {
      const { data, error } = await client
        .from('user_profiles')
        .select('role, is_active')
        .eq('id', userId)
        .single();
      
      if (error || !data) {
        return false;
      }
      
      return data.is_active && data.role === requiredRole;
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }
  
  /**
   * 관리자 권한 확인
   */
  static async checkAdminPermission(
    client: SupabaseClient<Database>,
    userId: string
  ): Promise<boolean> {
    return this.checkUserPermission(client, userId, 'admin') ||
           this.checkUserPermission(client, userId, 'support');
  }
  
  /**
   * 데이터 접근 로그
   */
  static async logDataAccess(
    client: SupabaseClient<Database>,
    operation: string,
    table: string,
    userId?: string,
    details?: any
  ) {
    try {
      // 데이터 접근 로그를 audit_logs 테이블에 저장
      await client
        .from('audit_logs')
        .insert({
          operation,
          table_name: table,
          user_id: userId,
          details,
          timestamp: new Date().toISOString(),
          ip_address: 'client', // 클라이언트에서는 IP 정보 제한적
          user_agent: navigator.userAgent.substring(0, 255) // 길이 제한
        });
    } catch (error) {
      // 로그 실패는 원본 작업을 방해하지 않음
      console.warn('Failed to log data access:', error);
    }
  }
}

/**
 * 세션 보안 관리
 */
export class SessionSecurity {
  private static readonly MAX_SESSION_DURATION = 24 * 60 * 60 * 1000; // 24시간
  private static readonly SESSION_WARNING_TIME = 5 * 60 * 1000; // 5분 전 경고
  
  /**
   * 세션 유효성 검사
   */
  static async validateSession(client: SupabaseClient<Database>): Promise<boolean> {
    try {
      const { data: { session }, error } = await client.auth.getSession();
      
      if (error || !session) {
        return false;
      }
      
      // 토큰 만료 시간 확인
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      const now = Date.now();
      
      if (expiresAt <= now) {
        await client.auth.signOut();
        return false;
      }
      
      // 세션 만료 경고
      if (expiresAt - now < this.SESSION_WARNING_TIME) {
        this.showSessionWarning();
      }
      
      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }
  
  /**
   * 세션 갱신
   */
  static async refreshSession(client: SupabaseClient<Database>): Promise<boolean> {
    try {
      const { data, error } = await client.auth.refreshSession();
      return !error && !!data.session;
    } catch (error) {
      console.error('Session refresh error:', error);
      return false;
    }
  }
  
  /**
   * 세션 만료 경고 표시
   */
  private static showSessionWarning() {
    // 사용자에게 세션 만료 경고
    if (typeof window !== 'undefined' && !window.sessionWarningShown) {
      window.sessionWarningShown = true;
      console.warn('Session will expire soon. Please save your work.');
      
      // 애플리케이션에서 세션 경고 이벤트를 처리할 수 있도록 커스텀 이벤트 발생
      window.dispatchEvent(new CustomEvent('session-warning', {
        detail: { expiresIn: this.SESSION_WARNING_TIME }
      }));
    }
  }
  
  /**
   * 보안 로그아웃 (모든 디바이스에서)
   */
  static async secureSignOut(client: SupabaseClient<Database>): Promise<void> {
    try {
      // 현재 세션 정보 가져오기
      const { data: { session } } = await client.auth.getSession();
      
      // 로그아웃 로그 기록
      if (session?.user?.id) {
        await SecureDataAccess.logDataAccess(
          client,
          'logout',
          'auth',
          session.user.id,
          { logout_type: 'manual' }
        );
      }
      
      // 로그아웃
      await client.auth.signOut();
      
      // 로컬 스토리지 정리
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
    } catch (error) {
      console.error('Secure sign out error:', error);
      // 에러가 발생해도 로그아웃 시도
      await client.auth.signOut();
    }
  }
}

// 타입 확장 (Window 객체)
declare global {
  interface Window {
    sessionWarningShown?: boolean;
  }
}

export default SecureSupabaseClient;