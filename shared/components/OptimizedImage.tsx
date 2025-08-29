import React, { memo, useState, useCallback, useEffect, useRef } from 'react'
import { useIntersectionObserver } from '../hooks/useIntersectionObserver'

// 이미지 최적화 옵션
interface ImageOptimizationOptions {
  quality?: number // 1-100
  format?: 'webp' | 'avif' | 'jpeg' | 'png'
  width?: number
  height?: number
  blur?: number
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
}

interface OptimizedImageProps {
  src: string
  alt: string
  className?: string
  fallbackSrc?: string
  placeholder?: string | React.ReactNode
  lazy?: boolean
  optimization?: ImageOptimizationOptions
  onLoad?: () => void
  onError?: () => void
  loading?: 'lazy' | 'eager'
  sizes?: string
  srcSet?: string
  priority?: boolean
}

// WebP 지원 검사
const supportsWebP = (): boolean => {
  if (typeof window === 'undefined') return false
  
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  
  return canvas.toDataURL('image/webp').startsWith('data:image/webp')
}

// AVIF 지원 검사
const supportsAVIF = (): boolean => {
  if (typeof window === 'undefined') return false
  
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  
  try {
    return canvas.toDataURL('image/avif').startsWith('data:image/avif')
  } catch {
    return false
  }
}

// 이미지 URL 최적화
const optimizeImageUrl = (src: string, options?: ImageOptimizationOptions): string => {
  if (!options) return src
  
  // URL에 최적화 파라미터 추가 (실제 CDN에 따라 다름)
  const url = new URL(src, window.location.origin)
  const params = url.searchParams
  
  if (options.width) params.set('w', options.width.toString())
  if (options.height) params.set('h', options.height.toString())
  if (options.quality) params.set('q', options.quality.toString())
  if (options.format) params.set('f', options.format)
  if (options.fit) params.set('fit', options.fit)
  if (options.blur) params.set('blur', options.blur.toString())
  
  return url.toString()
}

// 적응형 이미지 소스 생성
const generateSources = (src: string, optimization?: ImageOptimizationOptions): { type: string; srcSet: string }[] => {
  const sources: { type: string; srcSet: string }[] = []
  
  // AVIF 지원 시
  if (supportsAVIF() && optimization?.format !== 'jpeg' && optimization?.format !== 'png') {
    sources.push({
      type: 'image/avif',
      srcSet: optimizeImageUrl(src, { ...optimization, format: 'avif' })
    })
  }
  
  // WebP 지원 시
  if (supportsWebP() && optimization?.format !== 'jpeg' && optimization?.format !== 'png') {
    sources.push({
      type: 'image/webp',
      srcSet: optimizeImageUrl(src, { ...optimization, format: 'webp' })
    })
  }
  
  return sources
}

// Intersection Observer 훅
const useIntersectionObserver = (options?: IntersectionObserverInit) => {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [hasIntersected, setHasIntersected] = useState(false)
  const elementRef = useRef<HTMLElement>(null)
  
  useEffect(() => {
    if (!elementRef.current) return
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting)
        if (entry.isIntersecting) {
          setHasIntersected(true)
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      }
    )
    
    observer.observe(elementRef.current)
    
    return () => observer.disconnect()
  }, [])
  
  return { elementRef, isIntersecting, hasIntersected }
}

// 메인 OptimizedImage 컴포넌트
export const OptimizedImage = memo<OptimizedImageProps>(({
  src,
  alt,
  className = '',
  fallbackSrc,
  placeholder,
  lazy = true,
  optimization,
  onLoad,
  onError,
  loading = 'lazy',
  sizes,
  srcSet,
  priority = false
}) => {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [imageSrc, setImageSrc] = useState<string>('')
  const { elementRef, hasIntersected } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: priority ? '0px' : '50px'
  })

  // 이미지 로드 상태 관리
  const handleImageLoad = useCallback(() => {
    setImageState('loaded')
    onLoad?.()
  }, [onLoad])

  const handleImageError = useCallback(() => {
    if (fallbackSrc && imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc)
    } else {
      setImageState('error')
      onError?.()
    }
  }, [fallbackSrc, imageSrc, onError])

  // 이미지 소스 설정
  useEffect(() => {
    if (!lazy || hasIntersected || priority) {
      const optimizedSrc = optimizeImageUrl(src, optimization)
      setImageSrc(optimizedSrc)
    }
  }, [src, lazy, hasIntersected, priority, optimization])

  // 적응형 소스들
  const sources = generateSources(src, optimization)

  // 로딩 플레이스홀더
  const renderPlaceholder = () => {
    if (typeof placeholder === 'string') {
      return (
        <img
          src={placeholder}
          alt=""
          className={`${className} blur-sm transition-all duration-300`}
          loading="eager"
        />
      )
    }
    
    if (placeholder) {
      return placeholder
    }
    
    // 기본 스켈레톤
    return (
      <div className={`${className} bg-gray-200 animate-pulse flex items-center justify-center`}>
        <svg
          className="w-8 h-8 text-gray-400"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    )
  }

  // 에러 플레이스홀더
  const renderError = () => (
    <div className={`${className} bg-gray-100 flex items-center justify-center`}>
      <svg
        className="w-8 h-8 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
        />
      </svg>
    </div>
  )

  return (
    <div ref={elementRef} className="relative">
      {imageState === 'error' && renderError()}
      
      {imageState === 'loading' && renderPlaceholder()}
      
      {imageSrc && imageState !== 'error' && (
        <picture>
          {sources.map(({ type, srcSet }, index) => (
            <source key={index} type={type} srcSet={srcSet} sizes={sizes} />
          ))}
          <img
            src={imageSrc}
            srcSet={srcSet}
            sizes={sizes}
            alt={alt}
            className={`${className} transition-opacity duration-300 ${
              imageState === 'loaded' ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading={loading}
            decoding="async"
            // 성능 최적화 힌트
            fetchPriority={priority ? 'high' : 'auto'}
          />
        </picture>
      )}
    </div>
  )
})

OptimizedImage.displayName = 'OptimizedImage'

// 기본 preset들
export const ImagePresets = {
  thumbnail: {
    width: 150,
    height: 150,
    quality: 80,
    format: 'webp' as const,
    fit: 'cover' as const
  },
  hero: {
    width: 1920,
    height: 1080,
    quality: 85,
    format: 'webp' as const,
    fit: 'cover' as const
  },
  profile: {
    width: 300,
    height: 300,
    quality: 90,
    format: 'webp' as const,
    fit: 'cover' as const
  },
  card: {
    width: 600,
    height: 400,
    quality: 80,
    format: 'webp' as const,
    fit: 'cover' as const
  }
} as const

// HOC for lazy loading images
export const withLazyLoading = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return React.forwardRef<any, P>((props, ref) => {
    const { elementRef, hasIntersected } = useIntersectionObserver()
    
    return (
      <div ref={elementRef}>
        {hasIntersected && <Component {...props} ref={ref} />}
      </div>
    )
  })
}