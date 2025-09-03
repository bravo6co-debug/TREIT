/**
 * Server-side XSS Validation for Edge Functions
 * 서버 사이드에서 XSS 패턴을 탐지하고 차단하는 유틸리티
 */

/**
 * XSS 공격 패턴들
 */
const XSS_PATTERNS = [
  // Script tags
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<script[^>]*>.*?<\/script>/gi,
  /<script[^>]*>/gi,
  
  // Event handlers
  /on\w+\s*=\s*["'][^"']*["']/gi,
  /on\w+\s*=\s*[^"'\s>]+/gi,
  
  // JavaScript protocols
  /javascript\s*:/gi,
  /vbscript\s*:/gi,
  /data\s*:\s*text\/html/gi,
  
  // Dangerous tags
  /<iframe\b[^>]*>/gi,
  /<object\b[^>]*>/gi,
  /<embed\b[^>]*>/gi,
  /<form\b[^>]*>/gi,
  /<input\b[^>]*>/gi,
  /<textarea\b[^>]*>/gi,
  /<select\b[^>]*>/gi,
  /<link\b[^>]*>/gi,
  /<meta\b[^>]*>/gi,
  /<style\b[^>]*>/gi,
  
  // CSS expressions
  /expression\s*\(/gi,
  /-moz-binding\s*:/gi,
  /behavior\s*:/gi,
  /@import/gi,
  
  // Data URIs with executable content
  /data\s*:\s*[^,]*script/gi,
  /data\s*:\s*[^,]*javascript/gi,
  
  // HTML entities that could be used for XSS
  /&lt;script/gi,
  /&lt;iframe/gi,
  /&lt;object/gi,
  
  // Common XSS vectors
  /alert\s*\(/gi,
  /confirm\s*\(/gi,
  /prompt\s*\(/gi,
  /eval\s*\(/gi,
  /setTimeout\s*\(/gi,
  /setInterval\s*\(/gi,
  /Function\s*\(/gi,
  
  // Base64 encoded XSS attempts
  /YWxlcnQ/gi, // alert
  /amF2YXNjcmlwdA/gi, // javascript
  /dmJzY3JpcHQ/gi, // vbscript
];

/**
 * 위험한 속성들
 */
const DANGEROUS_ATTRIBUTES = [
  'onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout', 'onkeydown', 'onkeyup',
  'onchange', 'onfocus', 'onblur', 'onsubmit', 'onreset', 'onselect', 'onabort',
  'onunload', 'onresize', 'onscroll', 'style', 'background', 'src', 'href'
];

/**
 * XSS 패턴 탐지 함수
 */
export function detectXSS(input: string): {
  isXSS: boolean;
  detectedPatterns: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
} {
  if (typeof input !== 'string' || !input) {
    return { isXSS: false, detectedPatterns: [], riskLevel: 'low' };
  }

  const detectedPatterns: string[] = [];
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

  // 패턴 매칭
  XSS_PATTERNS.forEach((pattern, index) => {
    if (pattern.test(input)) {
      detectedPatterns.push(`Pattern ${index + 1}: ${pattern.toString()}`);
      
      // 위험도 평가
      if (input.match(/<script|javascript:|eval\(|Function\(/gi)) {
        riskLevel = 'critical';
      } else if (input.match(/on\w+\s*=|<iframe|<object/gi)) {
        riskLevel = 'high';
      } else if (input.match(/<[^>]*>/gi)) {
        riskLevel = 'medium';
      }
    }
  });

  return {
    isXSS: detectedPatterns.length > 0,
    detectedPatterns,
    riskLevel
  };
}

/**
 * HTML 특수문자 이스케이프
 */
export function escapeHtml(unsafe: string): string {
  if (typeof unsafe !== 'string') return '';
  
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\//g, '&#x2F;');
}

/**
 * 사용자 입력 정화 함수
 */
export function sanitizeInput(input: string, options: {
  maxLength?: number;
  allowHtml?: boolean;
  strictMode?: boolean;
} = {}): string {
  if (typeof input !== 'string') return '';

  const { maxLength = 1000, allowHtml = false, strictMode = true } = options;
  
  let sanitized = input.trim();
  
  // 길이 제한
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // HTML이 허용되지 않는 경우 이스케이프
  if (!allowHtml) {
    sanitized = escapeHtml(sanitized);
  } else {
    // HTML이 허용되는 경우에도 위험한 태그/속성 제거
    DANGEROUS_ATTRIBUTES.forEach(attr => {
      const attrPattern = new RegExp(`${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
      sanitized = sanitized.replace(attrPattern, '');
    });
  }

  // Strict mode에서 추가 정화
  if (strictMode) {
    sanitized = sanitized
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/data:/gi, '')
      .replace(/expression\(/gi, '');
  }

  return sanitized;
}

/**
 * 객체의 모든 문자열 값들을 정화
 */
export function sanitizeObject(obj: any, options: {
  allowHtml?: boolean;
  strictMode?: boolean;
  maxDepth?: number;
  currentDepth?: number;
} = {}): any {
  const { allowHtml = false, strictMode = true, maxDepth = 10, currentDepth = 0 } = options;

  // 재귀 깊이 제한
  if (currentDepth >= maxDepth) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeInput(obj, { allowHtml, strictMode });
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, { 
      ...options, 
      currentDepth: currentDepth + 1 
    }));
  }

  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const safeKey = sanitizeInput(key, { allowHtml: false, strictMode: true });
      sanitized[safeKey] = sanitizeObject(value, { 
        ...options, 
        currentDepth: currentDepth + 1 
      });
    }
    return sanitized;
  }

  return obj;
}

/**
 * URL 안전성 검증
 */
export function validateUrl(url: string): {
  isValid: boolean;
  isSafe: boolean;
  protocol?: string;
  error?: string;
} {
  if (typeof url !== 'string' || !url.trim()) {
    return { isValid: false, isSafe: false, error: 'Empty URL' };
  }

  try {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol.toLowerCase();
    
    // 허용되는 프로토콜
    const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
    const isSafe = allowedProtocols.includes(protocol);

    // 추가 보안 검사
    if (url.match(/javascript:|vbscript:|data:/gi)) {
      return { isValid: true, isSafe: false, protocol, error: 'Dangerous protocol detected' };
    }

    return { isValid: true, isSafe, protocol };
  } catch (error) {
    return { isValid: false, isSafe: false, error: 'Invalid URL format' };
  }
}

/**
 * 보안 로그 생성
 */
export function createSecurityLog(
  event: string,
  details: any,
  userId?: string,
  ip?: string
): {
  timestamp: string;
  event: string;
  userId?: string;
  ip?: string;
  details: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
} {
  const severity = determineSeverity(event, details);
  
  return {
    timestamp: new Date().toISOString(),
    event,
    userId,
    ip,
    details,
    severity
  };
}

/**
 * 심각도 결정
 */
function determineSeverity(event: string, details: any): 'low' | 'medium' | 'high' | 'critical' {
  if (event.includes('xss') || event.includes('script_injection')) {
    return 'critical';
  }
  if (event.includes('sql_injection') || event.includes('file_upload')) {
    return 'high';
  }
  if (event.includes('suspicious_input') || event.includes('rate_limit')) {
    return 'medium';
  }
  return 'low';
}

/**
 * 사용자 입력 검증 미들웨어
 */
export function validateUserInput(req: Request): {
  isValid: boolean;
  errors: string[];
  sanitizedData?: any;
} {
  const errors: string[] = [];
  let data: any;

  try {
    // Content-Type 검증
    const contentType = req.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      // JSON 데이터 파싱 및 검증
      req.text().then(text => {
        data = JSON.parse(text);
      });
    } else {
      errors.push('Unsupported content type');
      return { isValid: false, errors };
    }

    // XSS 검사
    const xssResult = detectXSS(JSON.stringify(data));
    if (xssResult.isXSS) {
      errors.push(`XSS detected: ${xssResult.detectedPatterns.join(', ')}`);
    }

    // 데이터 정화
    const sanitizedData = sanitizeObject(data, { strictMode: true });

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData
    };
  } catch (error) {
    errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { isValid: false, errors };
  }
}

/**
 * 캠페인 데이터 전용 검증
 */
export function validateCampaignData(data: {
  title?: string;
  description?: string;
  content?: string;
  tags?: string[];
}): {
  isValid: boolean;
  errors: string[];
  sanitizedData: typeof data;
} {
  const errors: string[] = [];
  const sanitizedData: typeof data = {};

  // 제목 검증
  if (data.title) {
    const xssResult = detectXSS(data.title);
    if (xssResult.isXSS) {
      errors.push(`XSS in title: ${xssResult.detectedPatterns[0]}`);
    }
    sanitizedData.title = sanitizeInput(data.title, { maxLength: 100, allowHtml: false });
  }

  // 설명 검증
  if (data.description) {
    const xssResult = detectXSS(data.description);
    if (xssResult.isXSS) {
      errors.push(`XSS in description: ${xssResult.detectedPatterns[0]}`);
    }
    sanitizedData.description = sanitizeInput(data.description, { maxLength: 500, allowHtml: false });
  }

  // 콘텐츠 검증 (HTML 허용하지만 제한적)
  if (data.content) {
    const xssResult = detectXSS(data.content);
    if (xssResult.riskLevel === 'critical' || xssResult.riskLevel === 'high') {
      errors.push(`High-risk XSS in content: ${xssResult.detectedPatterns[0]}`);
    }
    sanitizedData.content = sanitizeInput(data.content, { 
      maxLength: 10000, 
      allowHtml: true, 
      strictMode: false 
    });
  }

  // 태그 검증
  if (data.tags && Array.isArray(data.tags)) {
    sanitizedData.tags = data.tags
      .map(tag => sanitizeInput(tag, { maxLength: 50, allowHtml: false }))
      .filter(tag => tag.length > 0)
      .slice(0, 20); // 최대 20개 태그
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData
  };
}

export default {
  detectXSS,
  escapeHtml,
  sanitizeInput,
  sanitizeObject,
  validateUrl,
  createSecurityLog,
  validateUserInput,
  validateCampaignData
};