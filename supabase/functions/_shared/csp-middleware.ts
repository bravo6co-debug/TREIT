/**
 * Content Security Policy (CSP) Middleware
 * XSS 공격을 방지하기 위한 CSP 헤더 설정 유틸리티
 */

export interface CSPOptions {
  // Script sources
  scriptSrc?: string[];
  styleSrc?: string[];
  imgSrc?: string[];
  connectSrc?: string[];
  fontSrc?: string[];
  objectSrc?: string[];
  mediaSrc?: string[];
  frameSrc?: string[];
  frameAncestors?: string[];
  
  // Special directives
  upgradeInsecureRequests?: boolean;
  blockAllMixedContent?: boolean;
  reportUri?: string;
  reportTo?: string;
  
  // Development mode (더 관대한 정책)
  development?: boolean;
}

/**
 * 기본 CSP 설정
 */
const DEFAULT_CSP_OPTIONS: Required<Omit<CSPOptions, 'reportUri' | 'reportTo'>> = {
  scriptSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind CSS를 위해 inline styles 허용
  imgSrc: ["'self'", "data:", "https:", "blob:"],
  connectSrc: ["'self'", "https://api.supabase.co", "https://*.supabase.co"],
  fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
  objectSrc: ["'none'"],
  mediaSrc: ["'self'"],
  frameSrc: ["'none'"],
  frameAncestors: ["'none'"],
  upgradeInsecureRequests: true,
  blockAllMixedContent: true,
  development: false
};

/**
 * 개발 환경용 CSP 설정
 */
const DEVELOPMENT_CSP_OPTIONS: Partial<CSPOptions> = {
  scriptSrc: ["'self'", "'unsafe-eval'", "'unsafe-inline'", "localhost:*", "127.0.0.1:*"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  connectSrc: ["'self'", "ws:", "wss:", "http:", "https:", "localhost:*", "127.0.0.1:*"],
  upgradeInsecureRequests: false,
  development: true
};

/**
 * 앱별 특화된 CSP 설정
 */
export const APP_SPECIFIC_CSP = {
  'treit-app': {
    scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
    connectSrc: ["'self'", "https://*.supabase.co", "https://api.supabase.co"],
    imgSrc: ["'self'", "data:", "https:", "blob:", "https://*.supabase.co"]
  },
  'treit-advertiser': {
    scriptSrc: ["'self'", "https://js.stripe.com", "https://cdn.jsdelivr.net"],
    connectSrc: ["'self'", "https://*.supabase.co", "https://api.supabase.co", "https://api.stripe.com"],
    imgSrc: ["'self'", "data:", "https:", "blob:", "https://*.supabase.co"],
    frameSrc: ["https://js.stripe.com", "https://hooks.stripe.com"]
  },
  'treit-admin': {
    scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
    connectSrc: ["'self'", "https://*.supabase.co", "https://api.supabase.co"],
    imgSrc: ["'self'", "data:", "https:", "blob:", "https://*.supabase.co"]
  }
};

/**
 * CSP 헤더 문자열 생성
 */
export function generateCSPHeader(options: CSPOptions = {}): string {
  const config = { ...DEFAULT_CSP_OPTIONS, ...options };
  
  // 개발 모드에서는 더 관대한 설정 적용
  if (config.development) {
    Object.assign(config, DEVELOPMENT_CSP_OPTIONS);
  }

  const directives: string[] = [];

  // default-src
  directives.push("default-src 'self'");

  // script-src
  if (config.scriptSrc.length > 0) {
    directives.push(`script-src ${config.scriptSrc.join(' ')}`);
  }

  // style-src
  if (config.styleSrc.length > 0) {
    directives.push(`style-src ${config.styleSrc.join(' ')}`);
  }

  // img-src
  if (config.imgSrc.length > 0) {
    directives.push(`img-src ${config.imgSrc.join(' ')}`);
  }

  // connect-src
  if (config.connectSrc.length > 0) {
    directives.push(`connect-src ${config.connectSrc.join(' ')}`);
  }

  // font-src
  if (config.fontSrc.length > 0) {
    directives.push(`font-src ${config.fontSrc.join(' ')}`);
  }

  // object-src
  if (config.objectSrc.length > 0) {
    directives.push(`object-src ${config.objectSrc.join(' ')}`);
  }

  // media-src
  if (config.mediaSrc.length > 0) {
    directives.push(`media-src ${config.mediaSrc.join(' ')}`);
  }

  // frame-src
  if (config.frameSrc.length > 0) {
    directives.push(`frame-src ${config.frameSrc.join(' ')}`);
  }

  // frame-ancestors
  if (config.frameAncestors.length > 0) {
    directives.push(`frame-ancestors ${config.frameAncestors.join(' ')}`);
  }

  // upgrade-insecure-requests
  if (config.upgradeInsecureRequests) {
    directives.push('upgrade-insecure-requests');
  }

  // block-all-mixed-content
  if (config.blockAllMixedContent) {
    directives.push('block-all-mixed-content');
  }

  // report-uri
  if (config.reportUri) {
    directives.push(`report-uri ${config.reportUri}`);
  }

  // report-to
  if (config.reportTo) {
    directives.push(`report-to ${config.reportTo}`);
  }

  return directives.join('; ');
}

/**
 * CSP nonce 생성
 */
export function generateCSPNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Response에 CSP 헤더 추가
 */
export function addCSPHeaders(
  response: Response, 
  options: CSPOptions = {},
  nonce?: string
): Response {
  const headers = new Headers(response.headers);
  
  // nonce가 제공된 경우 script-src에 추가
  if (nonce) {
    options = {
      ...options,
      scriptSrc: [...(options.scriptSrc || DEFAULT_CSP_OPTIONS.scriptSrc), `'nonce-${nonce}'`]
    };
  }
  
  const cspHeader = generateCSPHeader(options);
  headers.set('Content-Security-Policy', cspHeader);
  
  // 추가 보안 헤더들
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

/**
 * CSP 위반 보고서 처리
 */
export interface CSPViolationReport {
  'csp-report': {
    'document-uri': string;
    'referrer': string;
    'violated-directive': string;
    'effective-directive': string;
    'original-policy': string;
    'blocked-uri': string;
    'source-file': string;
    'line-number': number;
    'column-number': number;
    'status-code': number;
  };
}

/**
 * CSP 위반 보고서 로깅
 */
export function logCSPViolation(report: CSPViolationReport, clientIP?: string): void {
  const violation = report['csp-report'];
  
  console.warn('CSP Violation Detected:', {
    timestamp: new Date().toISOString(),
    documentUri: violation['document-uri'],
    violatedDirective: violation['violated-directive'],
    blockedUri: violation['blocked-uri'],
    sourceFile: violation['source-file'],
    lineNumber: violation['line-number'],
    columnNumber: violation['column-number'],
    clientIP,
    severity: determineSeverity(violation['violated-directive'])
  });

  // 심각한 위반의 경우 추가 조치
  if (isHighRiskViolation(violation)) {
    console.error('High-risk CSP violation detected:', {
      blockedUri: violation['blocked-uri'],
      violatedDirective: violation['violated-directive'],
      documentUri: violation['document-uri']
    });
  }
}

/**
 * CSP 위반의 심각도 판단
 */
function determineSeverity(violatedDirective: string): 'low' | 'medium' | 'high' | 'critical' {
  if (violatedDirective.includes('script-src')) {
    return 'critical';
  }
  if (violatedDirective.includes('object-src') || violatedDirective.includes('frame-src')) {
    return 'high';
  }
  if (violatedDirective.includes('style-src') || violatedDirective.includes('img-src')) {
    return 'medium';
  }
  return 'low';
}

/**
 * 고위험 CSP 위반인지 확인
 */
function isHighRiskViolation(violation: CSPViolationReport['csp-report']): boolean {
  const highRiskPatterns = [
    'javascript:',
    'data:text/html',
    'eval',
    'inline',
    'unsafe-eval',
    'unsafe-inline'
  ];

  return highRiskPatterns.some(pattern => 
    violation['blocked-uri'].toLowerCase().includes(pattern) ||
    violation['source-file'].toLowerCase().includes(pattern)
  );
}

/**
 * Edge Function용 CSP 미들웨어 팩토리
 */
export function createCSPMiddleware(appName?: keyof typeof APP_SPECIFIC_CSP, isDevelopment = false) {
  return function cspMiddleware(response: Response): Response {
    const baseOptions: CSPOptions = { development: isDevelopment };
    
    // 앱별 특화 설정 적용
    if (appName && APP_SPECIFIC_CSP[appName]) {
      Object.assign(baseOptions, APP_SPECIFIC_CSP[appName]);
    }
    
    return addCSPHeaders(response, baseOptions);
  };
}

export default {
  generateCSPHeader,
  generateCSPNonce,
  addCSPHeaders,
  logCSPViolation,
  createCSPMiddleware,
  APP_SPECIFIC_CSP
};