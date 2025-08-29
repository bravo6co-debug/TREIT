/**
 * Secure URL Parameters Hook
 * React Router의 URL 파라미터를 안전하게 처리하는 커스텀 훅
 */

import { useParams, useSearchParams, useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import { 
  validateRouteParams, 
  parseSecureUrlParams, 
  validatePaginationParams,
  parseSecureSearchQuery 
} from '../url-security';

/**
 * 안전한 라우트 파라미터를 반환하는 훅
 */
export function useSecureRouteParams(): Record<string, string> {
  const params = useParams();
  
  return useMemo(() => {
    return validateRouteParams(params);
  }, [params]);
}

/**
 * 안전한 검색 파라미터를 반환하는 훅
 */
export function useSecureSearchParams(): Record<string, string> {
  const [searchParams] = useSearchParams();
  
  return useMemo(() => {
    const url = new URL(window.location.href);
    return parseSecureUrlParams(url);
  }, [searchParams]);
}

/**
 * 안전한 검색어를 반환하는 훅
 */
export function useSecureSearchQuery(paramName = 'q', options: {
  maxLength?: number;
  minLength?: number;
  allowWildcards?: boolean;
} = {}): string | null {
  const [searchParams] = useSearchParams();
  
  return useMemo(() => {
    const query = searchParams.get(paramName);
    if (!query) return null;
    
    return parseSecureSearchQuery(query, options);
  }, [searchParams, paramName, options]);
}

/**
 * 안전한 페이지네이션 파라미터를 반환하는 훅
 */
export function useSecurePagination(): {
  page: number;
  limit: number;
  sort: string;
  order: 'asc' | 'desc';
} {
  const [searchParams] = useSearchParams();
  
  return useMemo(() => {
    const params = {
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      sort: searchParams.get('sort') || undefined,
      order: searchParams.get('order') || undefined
    };
    
    return validatePaginationParams(params);
  }, [searchParams]);
}

/**
 * 안전한 필터 파라미터를 반환하는 훅
 */
export function useSecureFilters(allowedFilters: string[]): Record<string, string> {
  const [searchParams] = useSearchParams();
  
  return useMemo(() => {
    const filters: Record<string, string | undefined> = {};
    allowedFilters.forEach(filter => {
      filters[filter] = searchParams.get(filter) || undefined;
    });
    
    return validateFilterParams(filters, allowedFilters);
  }, [searchParams, allowedFilters]);
}

/**
 * 현재 위치의 모든 파라미터를 안전하게 반환하는 훅
 */
export function useSecureLocation(): {
  pathname: string;
  search: string;
  hash: string;
  routeParams: Record<string, string>;
  searchParams: Record<string, string>;
} {
  const location = useLocation();
  const routeParams = useParams();
  const [searchParams] = useSearchParams();
  
  return useMemo(() => {
    const url = new URL(window.location.href);
    
    return {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      routeParams: validateRouteParams(routeParams),
      searchParams: parseSecureUrlParams(url)
    };
  }, [location, routeParams, searchParams]);
}

/**
 * 특정 파라미터의 XSS 위험도를 체크하는 훅
 */
export function useParamSecurity(paramValue: string | null): {
  isSecure: boolean;
  sanitizedValue: string | null;
  riskLevel: 'safe' | 'low' | 'medium' | 'high';
} {
  return useMemo(() => {
    if (!paramValue || typeof paramValue !== 'string') {
      return { isSecure: true, sanitizedValue: null, riskLevel: 'safe' };
    }

    // XSS 패턴 검사
    const xssPatterns = [
      /<script/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /on\w+\s*=/gi,
      /<iframe/gi,
      /data:text\/html/gi
    ];

    let riskLevel: 'safe' | 'low' | 'medium' | 'high' = 'safe';
    let hasRisk = false;

    for (const pattern of xssPatterns) {
      if (pattern.test(paramValue)) {
        hasRisk = true;
        if (paramValue.match(/<script|javascript:|vbscript:/gi)) {
          riskLevel = 'high';
        } else if (paramValue.match(/on\w+\s*=|<iframe/gi)) {
          riskLevel = 'medium';
        } else {
          riskLevel = 'low';
        }
        break;
      }
    }

    const sanitizedValue = hasRisk ? null : paramValue;
    
    return {
      isSecure: !hasRisk,
      sanitizedValue,
      riskLevel
    };
  }, [paramValue]);
}

/**
 * URL 히스토리를 안전하게 관리하는 훅
 */
export function useSecureHistory(): {
  canGoBack: boolean;
  canGoForward: boolean;
  goBackSafely: () => void;
  navigateSafely: (to: string, allowedDomains?: string[]) => void;
} {
  const location = useLocation();

  const canGoBack = useMemo(() => {
    return window.history.length > 1;
  }, []);

  const canGoForward = useMemo(() => {
    // 실제로는 브라우저 API로 정확히 알기 어렵지만 추정
    return false; // 보수적으로 false 반환
  }, []);

  const goBackSafely = () => {
    if (canGoBack) {
      window.history.back();
    }
  };

  const navigateSafely = (to: string, allowedDomains: string[] = []) => {
    try {
      const url = new URL(to, window.location.origin);
      
      // 도메인 검증
      if (allowedDomains.length > 0 && !allowedDomains.includes(url.hostname)) {
        console.warn('Navigation to unauthorized domain blocked:', url.hostname);
        return;
      }

      // 상대 경로인지 확인
      if (to.startsWith('/') || to.startsWith('./') || to.startsWith('../')) {
        window.location.pathname = to;
      } else {
        window.location.href = url.toString();
      }
    } catch (error) {
      console.error('Safe navigation error:', error);
    }
  };

  return {
    canGoBack,
    canGoForward,
    goBackSafely,
    navigateSafely
  };
}

export default {
  useSecureRouteParams,
  useSecureSearchParams,
  useSecureSearchQuery,
  useSecurePagination,
  useSecureFilters,
  useSecureLocation,
  useParamSecurity,
  useSecureHistory
};