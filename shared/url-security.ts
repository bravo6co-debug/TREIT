/**
 * URL Security Utilities
 * URL 파라미터 및 검색어 처리 보안 강화 유틸리티
 */

import { sanitizeSearchQuery, detectXSSPatterns, escapeHtml } from './xss-protection';

/**
 * URL 파라미터를 안전하게 파싱하고 검증하는 함수
 */
export function parseSecureUrlParams(url: string | URL): Record<string, string> {
  try {
    const urlObj = typeof url === 'string' ? new URL(url) : url;
    const params: Record<string, string> = {};

    urlObj.searchParams.forEach((value, key) => {
      // XSS 패턴 검사
      if (detectXSSPatterns(key) || detectXSSPatterns(value)) {
        console.warn('XSS pattern detected in URL parameter:', { key, value });
        return; // 위험한 파라미터는 제외
      }

      // 키와 값을 정화
      const safeKey = sanitizeUrlParamKey(key);
      const safeValue = sanitizeUrlParamValue(value);

      if (safeKey && safeValue !== null) {
        params[safeKey] = safeValue;
      }
    });

    return params;
  } catch (error) {
    console.error('URL parsing error:', error);
    return {};
  }
}

/**
 * URL 파라미터 키를 안전하게 정화
 */
export function sanitizeUrlParamKey(key: string): string {
  if (typeof key !== 'string') return '';
  
  // 영문, 숫자, 언더스코어, 하이픈만 허용
  const sanitized = key.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
  
  // 길이 제한 (50자)
  return sanitized.slice(0, 50);
}

/**
 * URL 파라미터 값을 안전하게 정화
 */
export function sanitizeUrlParamValue(value: string, options: {
  maxLength?: number;
  allowSpecialChars?: boolean;
  type?: 'text' | 'number' | 'boolean' | 'date' | 'email' | 'url';
} = {}): string | null {
  if (typeof value !== 'string') return null;

  const { maxLength = 200, allowSpecialChars = false, type = 'text' } = options;

  let sanitized = value.trim();

  // 길이 제한
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // 타입별 검증 및 정화
  switch (type) {
    case 'number':
      // 숫자만 허용
      sanitized = sanitized.replace(/[^0-9.-]/g, '');
      if (!/^-?\d*\.?\d*$/.test(sanitized)) {
        return null;
      }
      break;

    case 'boolean':
      // boolean 값만 허용
      const lowerValue = sanitized.toLowerCase();
      if (!['true', 'false', '1', '0'].includes(lowerValue)) {
        return null;
      }
      sanitized = ['true', '1'].includes(lowerValue) ? 'true' : 'false';
      break;

    case 'date':
      // ISO 날짜 형식 검증
      if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/.test(sanitized)) {
        return null;
      }
      break;

    case 'email':
      // 기본적인 이메일 형식 검증
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized)) {
        return null;
      }
      break;

    case 'url':
      // URL 형식 검증
      try {
        new URL(sanitized);
      } catch {
        return null;
      }
      break;

    case 'text':
    default:
      if (!allowSpecialChars) {
        // 특수문자 제한 (기본적인 문자만 허용)
        sanitized = sanitized.replace(/[<>'"&]/g, '');
      }
      break;
  }

  return sanitized;
}

/**
 * 검색 쿼리를 안전하게 처리
 */
export function parseSecureSearchQuery(query: string, options: {
  maxLength?: number;
  allowWildcards?: boolean;
  minLength?: number;
} = {}): string | null {
  if (typeof query !== 'string') return null;

  const { maxLength = 100, allowWildcards = false, minLength = 1 } = options;

  let sanitized = sanitizeSearchQuery(query);

  // 길이 검증
  if (sanitized.length < minLength || sanitized.length > maxLength) {
    return null;
  }

  // 와일드카드 처리
  if (!allowWildcards) {
    sanitized = sanitized.replace(/[*%]/g, '');
  }

  return sanitized;
}

/**
 * 라우팅 파라미터를 안전하게 검증
 */
export function validateRouteParams(params: Record<string, string | undefined>): Record<string, string> {
  const validatedParams: Record<string, string> = {};

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) return;

    const safeKey = sanitizeUrlParamKey(key);
    const safeValue = sanitizeUrlParamValue(value, { maxLength: 100 });

    if (safeKey && safeValue !== null) {
      validatedParams[safeKey] = safeValue;
    }
  });

  return validatedParams;
}

/**
 * 페이지네이션 파라미터를 안전하게 검증
 */
export function validatePaginationParams(params: {
  page?: string;
  limit?: string;
  sort?: string;
  order?: string;
}): {
  page: number;
  limit: number;
  sort: string;
  order: 'asc' | 'desc';
} {
  const page = Math.max(1, Math.min(10000, parseInt(params.page || '1', 10) || 1));
  const limit = Math.max(1, Math.min(100, parseInt(params.limit || '20', 10) || 20));
  
  const safeSortField = sanitizeUrlParamValue(params.sort || 'id', { maxLength: 50 }) || 'id';
  const sort = safeSortField.replace(/[^a-zA-Z0-9_]/g, '');
  
  const order = params.order?.toLowerCase() === 'asc' ? 'asc' : 'desc';

  return { page, limit, sort, order };
}

/**
 * 필터 파라미터를 안전하게 검증
 */
export function validateFilterParams(params: Record<string, string | undefined>, allowedFilters: string[]): Record<string, string> {
  const validatedFilters: Record<string, string> = {};

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || !allowedFilters.includes(key)) return;

    const safeValue = sanitizeUrlParamValue(value, { maxLength: 100 });
    if (safeValue !== null) {
      validatedFilters[key] = safeValue;
    }
  });

  return validatedFilters;
}

/**
 * URL을 안전하게 구성하는 함수
 */
export function buildSecureUrl(baseUrl: string, params: Record<string, string | number | boolean | null | undefined>): string {
  try {
    const url = new URL(baseUrl);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined) return;

      const safeKey = sanitizeUrlParamKey(key);
      const safeValue = sanitizeUrlParamValue(String(value));

      if (safeKey && safeValue !== null) {
        url.searchParams.set(safeKey, safeValue);
      }
    });

    return url.toString();
  } catch (error) {
    console.error('URL building error:', error);
    return baseUrl;
  }
}

/**
 * 리다이렉트 URL을 안전하게 검증
 */
export function validateRedirectUrl(redirectUrl: string, allowedDomains: string[]): string | null {
  if (!redirectUrl || typeof redirectUrl !== 'string') return null;

  try {
    const url = new URL(redirectUrl);
    
    // 허용된 도메인 검사
    if (!allowedDomains.includes(url.hostname)) {
      console.warn('Redirect to unauthorized domain blocked:', url.hostname);
      return null;
    }

    // 프로토콜 검증
    if (!['http:', 'https:'].includes(url.protocol)) {
      console.warn('Unsafe redirect protocol blocked:', url.protocol);
      return null;
    }

    return url.toString();
  } catch (error) {
    console.error('Redirect URL validation error:', error);
    return null;
  }
}

/**
 * 해시(fragment) 부분을 안전하게 처리
 */
export function sanitizeUrlHash(hash: string): string {
  if (!hash || typeof hash !== 'string') return '';
  
  // # 제거
  const cleaned = hash.startsWith('#') ? hash.slice(1) : hash;
  
  // 기본적인 정화
  return sanitizeUrlParamValue(cleaned, { maxLength: 100, allowSpecialChars: false }) || '';
}

/**
 * 전체 URL을 종합적으로 검증하고 정화
 */
export function validateAndSanitizeUrl(url: string, options: {
  allowedDomains?: string[];
  maxParamCount?: number;
  requireHttps?: boolean;
} = {}): string | null {
  if (!url || typeof url !== 'string') return null;

  const { allowedDomains, maxParamCount = 50, requireHttps = false } = options;

  try {
    const urlObj = new URL(url);

    // HTTPS 검증
    if (requireHttps && urlObj.protocol !== 'https:') {
      return null;
    }

    // 도메인 검증
    if (allowedDomains && !allowedDomains.includes(urlObj.hostname)) {
      return null;
    }

    // 파라미터 개수 제한
    if (urlObj.searchParams.size > maxParamCount) {
      return null;
    }

    // 파라미터 정화
    const safeParams = parseSecureUrlParams(urlObj);
    
    // 새 URL 구성
    const cleanUrl = new URL(`${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`);
    Object.entries(safeParams).forEach(([key, value]) => {
      cleanUrl.searchParams.set(key, value);
    });

    // 해시 정화
    if (urlObj.hash) {
      const safeHash = sanitizeUrlHash(urlObj.hash);
      if (safeHash) {
        cleanUrl.hash = safeHash;
      }
    }

    return cleanUrl.toString();
  } catch (error) {
    console.error('URL validation error:', error);
    return null;
  }
}

export default {
  parseSecureUrlParams,
  sanitizeUrlParamKey,
  sanitizeUrlParamValue,
  parseSecureSearchQuery,
  validateRouteParams,
  validatePaginationParams,
  validateFilterParams,
  buildSecureUrl,
  validateRedirectUrl,
  sanitizeUrlHash,
  validateAndSanitizeUrl
};