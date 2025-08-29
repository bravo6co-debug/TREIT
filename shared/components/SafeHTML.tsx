/**
 * SafeHTML Component
 * XSS 공격을 방지하는 안전한 HTML 렌더링 컴포넌트
 */

import React from 'react';
import DOMPurify from 'dompurify';
import { sanitizeHtml, sanitizeRichText, sanitizeText } from '../xss-protection';

export interface SafeHTMLProps {
  /** 렌더링할 HTML 콘텐츠 */
  html: string;
  /** 렌더링 모드 */
  mode?: 'text' | 'basic' | 'rich';
  /** 허용할 HTML 태그들 */
  allowedTags?: string[];
  /** 허용할 HTML 속성들 */
  allowedAttributes?: string[];
  /** CSS 클래스명 */
  className?: string;
  /** 최대 길이 (문자 수) */
  maxLength?: number;
  /** 에러 발생 시 대체 텍스트 */
  fallbackText?: string;
  /** HTML 태그 (기본: div) */
  as?: keyof JSX.IntrinsicElements;
  /** 추가 props */
  [key: string]: any;
}

/**
 * 안전한 HTML 렌더링 컴포넌트
 */
export const SafeHTML: React.FC<SafeHTMLProps> = ({
  html,
  mode = 'basic',
  allowedTags,
  allowedAttributes,
  className,
  maxLength,
  fallbackText = '콘텐츠를 로드할 수 없습니다.',
  as: Component = 'div',
  ...props
}) => {
  const sanitizedContent = React.useMemo(() => {
    try {
      if (!html || typeof html !== 'string') {
        return fallbackText;
      }

      let content = html;
      
      // 길이 제한
      if (maxLength && content.length > maxLength) {
        content = content.substring(0, maxLength) + '...';
      }

      // 모드별 정화 처리
      switch (mode) {
        case 'text':
          return sanitizeText(content);
          
        case 'basic':
          return sanitizeHtml(content, {
            allowedTags,
            allowedAttributes,
            removeDataAttributes: true
          });
          
        case 'rich':
          return sanitizeRichText(content);
          
        default:
          return sanitizeText(content);
      }
    } catch (error) {
      console.error('SafeHTML sanitization error:', error);
      return fallbackText;
    }
  }, [html, mode, allowedTags, allowedAttributes, maxLength, fallbackText]);

  // 텍스트 모드인 경우 dangerouslySetInnerHTML 사용하지 않음
  if (mode === 'text') {
    return (
      <Component className={className} {...props}>
        {sanitizedContent}
      </Component>
    );
  }

  // HTML 모드인 경우 안전하게 정화된 콘텐츠 렌더링
  return (
    <Component 
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      {...props}
    />
  );
};

/**
 * 사용자 프로필용 안전한 텍스트 컴포넌트
 */
export const SafeUserContent: React.FC<{
  content: string;
  className?: string;
  maxLength?: number;
}> = ({ content, className, maxLength = 200 }) => (
  <SafeHTML
    html={content}
    mode="text"
    className={className}
    maxLength={maxLength}
    fallbackText="사용자 정보를 로드할 수 없습니다."
  />
);

/**
 * 캠페인 제목용 안전한 텍스트 컴포넌트
 */
export const SafeCampaignTitle: React.FC<{
  title: string;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}> = ({ title, className, as = 'h2' }) => (
  <SafeHTML
    html={title}
    mode="text"
    className={className}
    maxLength={100}
    fallbackText="제목을 로드할 수 없습니다."
    as={as}
  />
);

/**
 * 캠페인 설명용 안전한 HTML 컴포넌트
 */
export const SafeCampaignDescription: React.FC<{
  description: string;
  className?: string;
  mode?: 'basic' | 'rich';
}> = ({ description, className, mode = 'basic' }) => (
  <SafeHTML
    html={description}
    mode={mode}
    className={className}
    maxLength={1000}
    fallbackText="설명을 로드할 수 없습니다."
    allowedTags={['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li']}
    allowedAttributes={['class']}
  />
);

/**
 * 검색 결과 하이라이팅용 안전한 컴포넌트
 */
export const SafeSearchHighlight: React.FC<{
  text: string;
  query: string;
  className?: string;
  highlightClassName?: string;
}> = ({ text, query, className, highlightClassName = 'bg-yellow-200' }) => {
  const highlightedText = React.useMemo(() => {
    if (!query || !text) return sanitizeText(text);
    
    const sanitizedText = sanitizeText(text);
    const sanitizedQuery = sanitizeText(query);
    
    // 안전한 방식으로 검색어 하이라이팅
    const parts = sanitizedText.split(new RegExp(`(${sanitizedQuery})`, 'gi'));
    
    return parts
      .map((part, index) => 
        part.toLowerCase() === sanitizedQuery.toLowerCase() 
          ? `<mark class="${highlightClassName}">${part}</mark>`
          : part
      )
      .join('');
  }, [text, query, highlightClassName]);

  return (
    <SafeHTML
      html={highlightedText}
      mode="basic"
      className={className}
      allowedTags={['mark']}
      allowedAttributes={['class']}
      fallbackText={sanitizeText(text)}
    />
  );
};

/**
 * URL 링크용 안전한 컴포넌트
 */
export const SafeLink: React.FC<{
  href: string;
  children: React.ReactNode;
  className?: string;
  external?: boolean;
  [key: string]: any;
}> = ({ href, children, className, external = false, ...props }) => {
  const safeHref = React.useMemo(() => {
    try {
      const url = new URL(href);
      const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
      
      if (!allowedProtocols.includes(url.protocol)) {
        return '#';
      }
      
      return url.toString();
    } catch {
      return '#';
    }
  }, [href]);

  const linkProps = external ? {
    target: '_blank',
    rel: 'noopener noreferrer'
  } : {};

  return (
    <a 
      href={safeHref}
      className={className}
      {...linkProps}
      {...props}
    >
      {children}
    </a>
  );
};

/**
 * 이미지용 안전한 컴포넌트
 */
export const SafeImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  [key: string]: any;
}> = ({ src, alt, className, fallbackSrc = '/images/placeholder.png', ...props }) => {
  const [imageSrc, setImageSrc] = React.useState<string>('');
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    try {
      const url = new URL(src);
      const allowedProtocols = ['http:', 'https:', 'data:'];
      
      if (allowedProtocols.includes(url.protocol)) {
        setImageSrc(url.toString());
      } else {
        setImageSrc(fallbackSrc);
      }
    } catch {
      setImageSrc(fallbackSrc);
    }
  }, [src, fallbackSrc]);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImageSrc(fallbackSrc);
    }
  };

  const sanitizedAlt = sanitizeText(alt);

  return (
    <img
      src={imageSrc}
      alt={sanitizedAlt}
      className={className}
      onError={handleError}
      {...props}
    />
  );
};

/**
 * HTML 입력 폼 컴포넌트 (실시간 검증)
 */
export const SafeHTMLInput: React.FC<{
  value: string;
  onChange: (value: string, isValid: boolean) => void;
  placeholder?: string;
  className?: string;
  mode?: 'basic' | 'rich';
  maxLength?: number;
}> = ({ 
  value, 
  onChange, 
  placeholder, 
  className, 
  mode = 'basic',
  maxLength = 1000 
}) => {
  const [isValid, setIsValid] = React.useState(true);
  const [error, setError] = React.useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    
    try {
      // 길이 검증
      if (maxLength && newValue.length > maxLength) {
        setError(`최대 ${maxLength}자까지 입력 가능합니다.`);
        setIsValid(false);
        return;
      }

      // 기본 정화 처리
      const sanitized = mode === 'rich' 
        ? sanitizeRichText(newValue)
        : sanitizeHtml(newValue);
      
      // 위험한 콘텐츠 검증
      if (newValue !== sanitized) {
        setError('허용되지 않는 HTML 태그나 속성이 포함되어 있습니다.');
        setIsValid(false);
      } else {
        setError('');
        setIsValid(true);
      }
      
      onChange(newValue, isValid && newValue === sanitized);
    } catch (err) {
      setError('입력 처리 중 오류가 발생했습니다.');
      setIsValid(false);
      onChange(newValue, false);
    }
  };

  return (
    <div>
      <textarea
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={`${className} ${isValid ? '' : 'border-red-500'}`}
        maxLength={maxLength}
      />
      {error && (
        <div className="text-red-500 text-sm mt-1">
          {error}
        </div>
      )}
      <div className="text-gray-400 text-xs mt-1">
        {value.length}/{maxLength} 문자
      </div>
    </div>
  );
};

export default SafeHTML;