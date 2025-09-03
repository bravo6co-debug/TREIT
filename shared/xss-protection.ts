/**
 * XSS Protection Utilities
 * Cross-Site Scripting 공격을 방지하기 위한 유틸리티 함수들
 */

import DOMPurify from 'dompurify';
import { filterXSS, IFilterXSSOptions } from 'xss';

/**
 * HTML 특수 문자를 이스케이프 처리하는 함수
 */
export function escapeHtml(unsafe: string): string {
  if (typeof unsafe !== 'string') {
    return '';
  }

  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\//g, '&#x2F;');
}

/**
 * URL을 안전하게 이스케이프 처리하는 함수
 */
export function escapeUrl(url: string): string {
  if (typeof url !== 'string') {
    return '';
  }

  try {
    // URL 검증
    const urlObj = new URL(url);
    
    // 허용되지 않은 프로토콜 차단
    const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
    if (!allowedProtocols.includes(urlObj.protocol)) {
      return '';
    }

    return encodeURI(url);
  } catch {
    // 잘못된 URL 형식인 경우 빈 문자열 반환
    return '';
  }
}

/**
 * 사용자 입력 텍스트를 안전하게 정화하는 함수
 */
export function sanitizeText(text: string): string {
  if (typeof text !== 'string') {
    return '';
  }

  // 기본 HTML 이스케이프
  let sanitized = escapeHtml(text);
  
  // 추가 보안 패턴 제거
  sanitized = sanitized
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/on\w+=/gi, '');

  return sanitized;
}

/**
 * HTML 콘텐츠를 안전하게 정화하는 함수 (DOMPurify 사용)
 */
export function sanitizeHtml(html: string, options?: {
  allowedTags?: string[];
  allowedAttributes?: string[];
  removeDataAttributes?: boolean;
}): string {
  if (typeof html !== 'string') {
    return '';
  }

  const defaultConfig: any = {
    ALLOWED_TAGS: options?.allowedTags || [
      'p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
    ],
    ALLOWED_ATTR: options?.allowedAttributes || ['class', 'id'],
    REMOVE_DATA_ATTRIBUTES: options?.removeDataAttributes !== false,
    FORBID_SCRIPT: true,
    FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'form', 'input', 'textarea'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur']
  };

  return DOMPurify.sanitize(html, defaultConfig);
}

/**
 * 리치 텍스트 에디터용 HTML 정화 함수 (더 관대한 설정)
 */
export function sanitizeRichText(html: string): string {
  if (typeof html !== 'string') {
    return '';
  }

  const config: IFilterXSSOptions = {
    whiteList: {
      p: ['class', 'style'],
      div: ['class', 'style'],
      span: ['class', 'style'],
      strong: [],
      em: [],
      u: [],
      b: [],
      i: [],
      br: [],
      ol: ['class'],
      ul: ['class'],
      li: ['class'],
      h1: ['class'],
      h2: ['class'],
      h3: ['class'],
      h4: ['class'],
      h5: ['class'],
      h6: ['class'],
      a: ['href', 'title', 'target'],
      img: ['src', 'alt', 'title', 'width', 'height']
    },
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script'],
    onIgnoreTagAttr: function (tag, name, value) {
      // style 속성 허용 (CSS injection 방지)
      if (name === 'style') {
        // 위험한 CSS 속성 제거
        const safeCss = value.replace(/(javascript:|expression\(|@import|behavior:)/gi, '');
        return `${name}="${safeCss}"`;
      }
    }
  };

  return filterXSS(html, config);
}

/**
 * JSON 데이터를 안전하게 정화하는 함수
 */
export function sanitizeJsonData(data: any): any {
  if (typeof data === 'string') {
    return sanitizeText(data);
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeJsonData);
  }
  
  if (data && typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      // 키도 정화
      const safeKey = sanitizeText(key);
      sanitized[safeKey] = sanitizeJsonData(value);
    }
    return sanitized;
  }
  
  return data;
}

/**
 * XSS 패턴을 탐지하는 함수
 */
export function detectXSSPatterns(input: string): boolean {
  if (typeof input !== 'string') {
    return false;
  }

  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^>]*>/gi,
    /<object\b[^>]*>/gi,
    /<embed\b[^>]*>/gi,
    /<form\b[^>]*>/gi,
    /expression\s*\(/gi,
    /@import/gi,
    /behavior\s*:/gi,
    /<link\b[^>]*>/gi,
    /<meta\b[^>]*>/gi
  ];

  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * 안전한 속성만 허용하는 객체 필터 함수
 */
export function sanitizeObjectProperties<T extends Record<string, any>>(
  obj: T,
  allowedProperties: (keyof T)[]
): Partial<T> {
  const sanitized: Partial<T> = {};
  
  allowedProperties.forEach(prop => {
    if (prop in obj) {
      const value = obj[prop];
      if (typeof value === 'string') {
        sanitized[prop] = sanitizeText(value) as T[keyof T];
      } else {
        sanitized[prop] = value;
      }
    }
  });
  
  return sanitized;
}

/**
 * CSP (Content Security Policy) nonce 생성 함수
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * 안전한 HTML 속성 생성 함수
 */
export function createSafeHtmlAttributes(attributes: Record<string, string>): Record<string, string> {
  const safeAttributes: Record<string, string> = {};
  
  // 허용되는 속성 목록
  const allowedAttributes = [
    'id', 'class', 'title', 'alt', 'src', 'href', 'target', 'rel',
    'width', 'height', 'style', 'type', 'name', 'value', 'placeholder'
  ];
  
  Object.entries(attributes).forEach(([key, value]) => {
    if (allowedAttributes.includes(key.toLowerCase())) {
      if (key === 'href' || key === 'src') {
        safeAttributes[key] = escapeUrl(value);
      } else if (key === 'style') {
        // CSS injection 방지
        const safeCss = value.replace(/(javascript:|expression\(|@import|behavior:)/gi, '');
        safeAttributes[key] = safeCss;
      } else {
        safeAttributes[key] = sanitizeText(value);
      }
    }
  });
  
  return safeAttributes;
}

/**
 * 사용자 프로필 데이터 정화 함수
 */
export function sanitizeUserProfile(profile: {
  nickname?: string;
  bio?: string;
  website?: string;
  [key: string]: any;
}) {
  return {
    ...profile,
    nickname: profile.nickname ? sanitizeText(profile.nickname) : '',
    bio: profile.bio ? sanitizeText(profile.bio) : '',
    website: profile.website ? escapeUrl(profile.website) : ''
  };
}

/**
 * 캠페인 데이터 정화 함수
 */
export function sanitizeCampaignData(campaign: {
  title?: string;
  description?: string;
  content?: string;
  tags?: string[];
  [key: string]: any;
}) {
  return {
    ...campaign,
    title: campaign.title ? sanitizeText(campaign.title) : '',
    description: campaign.description ? sanitizeText(campaign.description) : '',
    content: campaign.content ? sanitizeRichText(campaign.content) : '',
    tags: campaign.tags ? campaign.tags.map(tag => sanitizeText(tag)) : []
  };
}

/**
 * 검색 쿼리 정화 함수
 */
export function sanitizeSearchQuery(query: string): string {
  if (typeof query !== 'string') {
    return '';
  }

  // 검색 쿼리에서 위험한 문자 제거
  return query
    .replace(/[<>"\';()]/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    .trim()
    .slice(0, 100); // 길이 제한
}

export default {
  escapeHtml,
  escapeUrl,
  sanitizeText,
  sanitizeHtml,
  sanitizeRichText,
  sanitizeJsonData,
  detectXSSPatterns,
  sanitizeObjectProperties,
  generateNonce,
  createSafeHtmlAttributes,
  sanitizeUserProfile,
  sanitizeCampaignData,
  sanitizeSearchQuery
};