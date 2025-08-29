/**
 * 환경변수 검증 시스템
 * 각 앱에서 필요한 환경변수를 검증하고 타입 안전성을 보장
 */

// 환경변수 타입 정의
export interface ClientEnvConfig {
  // Supabase 공개 설정
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  
  // 앱 URLs
  VITE_USER_APP_URL: string;
  VITE_ADVERTISER_APP_URL: string;
  VITE_ADMIN_APP_URL: string;
  
  // 앱 이름
  VITE_USER_APP_NAME: string;
  VITE_ADVERTISER_APP_NAME: string;
  VITE_ADMIN_APP_NAME: string;
  
  // Auth 설정
  VITE_AUTH_REDIRECT_URL: string;
  VITE_AUTH_SITE_URL: string;
  
  // 외부 서비스
  VITE_GOOGLE_OAUTH_CLIENT_ID?: string;
  VITE_ANALYTICS_PUBLIC_KEY?: string;
  
  // 환경 및 디버그
  VITE_NODE_ENV: 'development' | 'production' | 'test';
  VITE_DEBUG_MODE: boolean;
  VITE_ENABLE_LOGGING: boolean;
  
  // 기능 플래그
  VITE_FEATURE_REFERRAL_SYSTEM: boolean;
  VITE_FEATURE_LEVEL_SYSTEM: boolean;
  VITE_FEATURE_SOCIAL_LOGIN: boolean;
  
  // Rate Limiting 표시
  VITE_RATE_LIMIT_DISPLAY_INFO: boolean;
}

export interface ServerEnvConfig {
  // Supabase 서버 전용
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_JWT_SECRET: string;
  SUPABASE_DB_URL: string;
  SUPABASE_DB_PASSWORD: string;
  SUPABASE_STORAGE_URL: string;
  SUPABASE_FUNCTIONS_URL: string;
  SUPABASE_PROJECT_REF: string;
  SUPABASE_PROJECT_ID: string;
  
  // 결제 시스템
  PAYMENT_GATEWAY_URL: string;
  PAYMENT_GATEWAY_KEY: string;
  PAYMENT_GATEWAY_SECRET: string;
  PAYMENT_WEBHOOK_SECRET: string;
  PAYMENT_MERCHANT_ID: string;
  
  // 외부 서비스 API
  ANALYTICS_API_KEY?: string;
  ANALYTICS_SECRET_KEY?: string;
  GOOGLE_OAUTH_CLIENT_SECRET?: string;
  
  // 이메일 서비스
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER: string;
  SMTP_PASS: string;
  SMTP_SECURE: boolean;
  
  // 웹훅 URLs
  SLACK_WEBHOOK_URL?: string;
  DISCORD_WEBHOOK_URL?: string;
  
  // 보안 설정
  JWT_SECRET: string;
  ENCRYPTION_KEY: string;
  SALT_ROUNDS: number;
  
  // Rate Limiting
  REDIS_URL?: string;
  RATE_LIMIT_REQUESTS_PER_MINUTE: number;
  RATE_LIMIT_REQUESTS_PER_HOUR: number;
  
  // 환경
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  
  // 로깅 및 모니터링
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';
  LOG_FILE_PATH?: string;
  SENTRY_DSN?: string;
  NEW_RELIC_LICENSE_KEY?: string;
}

// 검증 함수들
export class EnvValidator {
  private static isValidUrl(value: string): boolean {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }
  
  private static isValidEmail(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }
  
  private static isValidPort(value: string | number): boolean {
    const port = typeof value === 'string' ? parseInt(value, 10) : value;
    return Number.isInteger(port) && port > 0 && port <= 65535;
  }
  
  private static parseBoolean(value: string | undefined): boolean {
    if (value === undefined) return false;
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  }
  
  private static parseNumber(value: string | undefined): number {
    if (value === undefined) return 0;
    const num = parseInt(value, 10);
    return isNaN(num) ? 0 : num;
  }

  /**
   * 클라이언트 환경변수 검증
   */
  static validateClientEnv(): ClientEnvConfig {
    const errors: string[] = [];
    
    // 필수 환경변수들
    const requiredVars = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY',
      'VITE_USER_APP_URL',
      'VITE_ADVERTISER_APP_URL',
      'VITE_ADMIN_APP_URL',
      'VITE_USER_APP_NAME',
      'VITE_ADVERTISER_APP_NAME',
      'VITE_ADMIN_APP_NAME',
      'VITE_AUTH_REDIRECT_URL',
      'VITE_AUTH_SITE_URL'
    ];
    
    // 필수 환경변수 존재 확인
    requiredVars.forEach(varName => {
      if (!import.meta.env[varName]) {
        errors.push(`Missing required environment variable: ${varName}`);
      }
    });
    
    // URL 검증
    const urlVars = [
      'VITE_SUPABASE_URL',
      'VITE_USER_APP_URL',
      'VITE_ADVERTISER_APP_URL',
      'VITE_ADMIN_APP_URL',
      'VITE_AUTH_REDIRECT_URL',
      'VITE_AUTH_SITE_URL'
    ];
    
    urlVars.forEach(varName => {
      const value = import.meta.env[varName];
      if (value && !this.isValidUrl(value)) {
        errors.push(`Invalid URL format for ${varName}: ${value}`);
      }
    });
    
    // Supabase URL 보안 확인
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes('supabase.co')) {
      console.warn('Warning: Supabase URL does not appear to be an official Supabase domain');
    }
    
    // Anon Key 형식 확인 (JWT 형식인지)
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (anonKey && !anonKey.startsWith('eyJ')) {
      errors.push('VITE_SUPABASE_ANON_KEY does not appear to be a valid JWT token');
    }
    
    if (errors.length > 0) {
      throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
    }
    
    return {
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
      VITE_USER_APP_URL: import.meta.env.VITE_USER_APP_URL,
      VITE_ADVERTISER_APP_URL: import.meta.env.VITE_ADVERTISER_APP_URL,
      VITE_ADMIN_APP_URL: import.meta.env.VITE_ADMIN_APP_URL,
      VITE_USER_APP_NAME: import.meta.env.VITE_USER_APP_NAME,
      VITE_ADVERTISER_APP_NAME: import.meta.env.VITE_ADVERTISER_APP_NAME,
      VITE_ADMIN_APP_NAME: import.meta.env.VITE_ADMIN_APP_NAME,
      VITE_AUTH_REDIRECT_URL: import.meta.env.VITE_AUTH_REDIRECT_URL,
      VITE_AUTH_SITE_URL: import.meta.env.VITE_AUTH_SITE_URL,
      VITE_GOOGLE_OAUTH_CLIENT_ID: import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID,
      VITE_ANALYTICS_PUBLIC_KEY: import.meta.env.VITE_ANALYTICS_PUBLIC_KEY,
      VITE_NODE_ENV: import.meta.env.VITE_NODE_ENV || 'development',
      VITE_DEBUG_MODE: this.parseBoolean(import.meta.env.VITE_DEBUG_MODE),
      VITE_ENABLE_LOGGING: this.parseBoolean(import.meta.env.VITE_ENABLE_LOGGING),
      VITE_FEATURE_REFERRAL_SYSTEM: this.parseBoolean(import.meta.env.VITE_FEATURE_REFERRAL_SYSTEM),
      VITE_FEATURE_LEVEL_SYSTEM: this.parseBoolean(import.meta.env.VITE_FEATURE_LEVEL_SYSTEM),
      VITE_FEATURE_SOCIAL_LOGIN: this.parseBoolean(import.meta.env.VITE_FEATURE_SOCIAL_LOGIN),
      VITE_RATE_LIMIT_DISPLAY_INFO: this.parseBoolean(import.meta.env.VITE_RATE_LIMIT_DISPLAY_INFO),
    };
  }

  /**
   * 서버 환경변수 검증 (Node.js 환경용)
   */
  static validateServerEnv(): ServerEnvConfig {
    const errors: string[] = [];
    
    // process.env 접근 (Node.js 환경에서만)
    const env = typeof process !== 'undefined' ? process.env : {};
    
    // 필수 환경변수들
    const requiredVars = [
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_JWT_SECRET',
      'SUPABASE_DB_URL',
      'SUPABASE_PROJECT_REF',
      'PAYMENT_GATEWAY_URL',
      'PAYMENT_GATEWAY_KEY',
      'PAYMENT_WEBHOOK_SECRET',
      'JWT_SECRET',
      'ENCRYPTION_KEY'
    ];
    
    requiredVars.forEach(varName => {
      if (!env[varName]) {
        errors.push(`Missing required server environment variable: ${varName}`);
      }
    });
    
    // URL 검증
    if (env.SUPABASE_DB_URL && !this.isValidUrl(env.SUPABASE_DB_URL)) {
      errors.push('Invalid database URL format');
    }
    
    if (env.PAYMENT_GATEWAY_URL && !this.isValidUrl(env.PAYMENT_GATEWAY_URL)) {
      errors.push('Invalid payment gateway URL format');
    }
    
    // 포트 검증
    if (env.PORT && !this.isValidPort(env.PORT)) {
      errors.push('Invalid port number');
    }
    
    if (env.SMTP_PORT && !this.isValidPort(env.SMTP_PORT)) {
      errors.push('Invalid SMTP port number');
    }
    
    // 이메일 검증
    if (env.SMTP_USER && !this.isValidEmail(env.SMTP_USER)) {
      errors.push('Invalid SMTP user email format');
    }
    
    // 암호화 키 길이 검증
    if (env.ENCRYPTION_KEY && env.ENCRYPTION_KEY.length < 32) {
      errors.push('ENCRYPTION_KEY must be at least 32 characters long');
    }
    
    // JWT Secret 강도 검증
    if (env.JWT_SECRET && env.JWT_SECRET.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters long');
    }
    
    if (errors.length > 0) {
      throw new Error(`Server environment validation failed:\n${errors.join('\n')}`);
    }
    
    return {
      SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY || '',
      SUPABASE_JWT_SECRET: env.SUPABASE_JWT_SECRET || '',
      SUPABASE_DB_URL: env.SUPABASE_DB_URL || '',
      SUPABASE_DB_PASSWORD: env.SUPABASE_DB_PASSWORD || '',
      SUPABASE_STORAGE_URL: env.SUPABASE_STORAGE_URL || '',
      SUPABASE_FUNCTIONS_URL: env.SUPABASE_FUNCTIONS_URL || '',
      SUPABASE_PROJECT_REF: env.SUPABASE_PROJECT_REF || '',
      SUPABASE_PROJECT_ID: env.SUPABASE_PROJECT_ID || '',
      PAYMENT_GATEWAY_URL: env.PAYMENT_GATEWAY_URL || '',
      PAYMENT_GATEWAY_KEY: env.PAYMENT_GATEWAY_KEY || '',
      PAYMENT_GATEWAY_SECRET: env.PAYMENT_GATEWAY_SECRET || '',
      PAYMENT_WEBHOOK_SECRET: env.PAYMENT_WEBHOOK_SECRET || '',
      PAYMENT_MERCHANT_ID: env.PAYMENT_MERCHANT_ID || '',
      ANALYTICS_API_KEY: env.ANALYTICS_API_KEY,
      ANALYTICS_SECRET_KEY: env.ANALYTICS_SECRET_KEY,
      GOOGLE_OAUTH_CLIENT_SECRET: env.GOOGLE_OAUTH_CLIENT_SECRET,
      SMTP_HOST: env.SMTP_HOST || '',
      SMTP_PORT: this.parseNumber(env.SMTP_PORT) || 587,
      SMTP_USER: env.SMTP_USER || '',
      SMTP_PASS: env.SMTP_PASS || '',
      SMTP_SECURE: this.parseBoolean(env.SMTP_SECURE),
      SLACK_WEBHOOK_URL: env.SLACK_WEBHOOK_URL,
      DISCORD_WEBHOOK_URL: env.DISCORD_WEBHOOK_URL,
      JWT_SECRET: env.JWT_SECRET || '',
      ENCRYPTION_KEY: env.ENCRYPTION_KEY || '',
      SALT_ROUNDS: this.parseNumber(env.SALT_ROUNDS) || 12,
      REDIS_URL: env.REDIS_URL,
      RATE_LIMIT_REQUESTS_PER_MINUTE: this.parseNumber(env.RATE_LIMIT_REQUESTS_PER_MINUTE) || 100,
      RATE_LIMIT_REQUESTS_PER_HOUR: this.parseNumber(env.RATE_LIMIT_REQUESTS_PER_HOUR) || 1000,
      NODE_ENV: (env.NODE_ENV as any) || 'development',
      PORT: this.parseNumber(env.PORT) || 3000,
      LOG_LEVEL: (env.LOG_LEVEL as any) || 'info',
      LOG_FILE_PATH: env.LOG_FILE_PATH,
      SENTRY_DSN: env.SENTRY_DSN,
      NEW_RELIC_LICENSE_KEY: env.NEW_RELIC_LICENSE_KEY,
    };
  }

  /**
   * 개발 환경에서 민감한 정보 누출 검사
   */
  static checkForLeakedSecrets(): string[] {
    const warnings: string[] = [];
    
    // 브라우저 환경에서만 실행
    if (typeof window !== 'undefined') {
      const envVars = import.meta.env;
      
      // Vite 기본 제공 변수들 (허용목록)
      const viteDefaultVars = new Set([
        'BASE_URL', 'DEV', 'MODE', 'PROD', 'SSR'
      ]);
      
      // 허용된 공개 민감한 변수들 (Supabase anon key는 공개용)
      const allowedPublicVars = new Set([
        'VITE_SUPABASE_ANON_KEY', 'VITE_ANALYTICS_PUBLIC_KEY', 
        'VITE_GOOGLE_OAUTH_CLIENT_ID'
      ]);
      
      // 실제로 민감한 키워드들 (서버 전용이어야 함)
      const trueSensitiveKeywords = [
        'secret', 'private', 'service_role', 'webhook', 
        'smtp_pass', 'db_password', 'jwt_secret', 'encryption'
      ];
      
      Object.keys(envVars).forEach(key => {
        // VITE_ 접두사가 없는 변수 중 Vite 기본 변수가 아닌 경우만 경고
        if (!key.startsWith('VITE_') && !viteDefaultVars.has(key)) {
          warnings.push(`Non-VITE environment variable exposed to client: ${key}`);
        }
        
        // VITE_ 접두사가 있고 진짜 민감한 키워드가 포함되었지만 허용목록에 없는 경우만 경고
        const lowerKey = key.toLowerCase();
        if (key.startsWith('VITE_') && 
            !allowedPublicVars.has(key) &&
            trueSensitiveKeywords.some(keyword => lowerKey.includes(keyword))) {
          warnings.push(`Sensitive variable exposed to client: ${key}`);
        }
      });
    }
    
    return warnings;
  }
}

// 타입 가드 함수들
export function isClientEnv(): boolean {
  return typeof window !== 'undefined';
}

export function isServerEnv(): boolean {
  return typeof process !== 'undefined' && process.env !== undefined;
}

// 환경변수 초기화 함수
export function initializeEnv() {
  const warnings = EnvValidator.checkForLeakedSecrets();
  
  if (warnings.length > 0) {
    console.group('Environment Security Warnings:');
    warnings.forEach(warning => console.warn(warning));
    console.groupEnd();
  }
  
  if (isClientEnv()) {
    try {
      const clientEnv = EnvValidator.validateClientEnv();
      console.log('Client environment validation passed');
      return clientEnv;
    } catch (error) {
      console.error('Client environment validation failed:', error);
      throw error;
    }
  }
  
  if (isServerEnv()) {
    try {
      const serverEnv = EnvValidator.validateServerEnv();
      console.log('Server environment validation passed');
      return serverEnv;
    } catch (error) {
      console.error('Server environment validation failed:', error);
      throw error;
    }
  }
}

export default EnvValidator;