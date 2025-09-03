/**
 * Image optimization utilities for better performance
 */

interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'avif';
  blur?: number;
}

export class ImageOptimizer {
  private static readonly SUPPORTED_FORMATS = ['webp', 'avif', 'jpeg', 'png'];
  
  /**
   * Generate optimized image URL with query parameters
   */
  static optimizeUrl(originalUrl: string, options: ImageOptimizationOptions = {}): string {
    try {
      const url = new URL(originalUrl);
      const params = new URLSearchParams();
      
      if (options.width) params.set('w', options.width.toString());
      if (options.height) params.set('h', options.height.toString());
      if (options.quality) params.set('q', options.quality.toString());
      if (options.format) params.set('fm', options.format);
      if (options.blur) params.set('blur', options.blur.toString());
      
      // Add cache busting and optimization flags
      params.set('fit', 'crop');
      params.set('auto', 'format,compress');
      
      const optimizedUrl = `${url.origin}${url.pathname}?${params.toString()}`;
      return optimizedUrl;
    } catch (error) {
      return originalUrl;
    }
  }

  /**
   * Get responsive image srcSet for different screen densities
   */
  static getResponsiveSrcSet(baseUrl: string, width: number): string {
    const densities = [1, 1.5, 2, 3];
    const srcSet = densities
      .map(density => {
        const scaledWidth = Math.round(width * density);
        const optimizedUrl = this.optimizeUrl(baseUrl, { 
          width: scaledWidth, 
          quality: 85,
          format: 'webp' 
        });
        return `${optimizedUrl} ${density}x`;
      })
      .join(', ');
    
    return srcSet;
  }

  /**
   * Generate sizes attribute for responsive images
   */
  static getResponsiveSizes(breakpoints: { size: string; width: string }[]): string {
    return breakpoints
      .map(bp => `(max-width: ${bp.width}) ${bp.size}`)
      .join(', ');
  }

  /**
   * Preload critical images for better performance
   */
  static preloadImage(url: string, options: ImageOptimizationOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const optimizedUrl = this.optimizeUrl(url, options);
      
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = optimizedUrl;
    });
  }

  /**
   * Check if WebP is supported by the browser
   */
  static async isWebPSupported(): Promise<boolean> {
    return new Promise(resolve => {
      const webP = new Image();
      webP.onload = webP.onerror = () => resolve(webP.height === 2);
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  }

  /**
   * Create a placeholder blur image data URL
   */
  static createBlurPlaceholder(width: number = 10, height: number = 10): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return '';
    
    canvas.width = width;
    canvas.height = height;
    
    // Create a simple gradient placeholder
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#f3f4f6');
    gradient.addColorStop(1, '#e5e7eb');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    return canvas.toDataURL('image/jpeg', 0.1);
  }

  /**
   * Lazy load images with intersection observer
   */
  static setupLazyLoading() {
    if (!('IntersectionObserver' in window)) {
      // Fallback for older browsers
      document.querySelectorAll('[data-lazy]').forEach(img => {
        const lazyImg = img as HTMLImageElement;
        lazyImg.src = lazyImg.dataset.lazy || '';
      });
      return;
    }

    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const src = img.dataset.lazy;
          
          if (src) {
            img.src = src;
            img.classList.remove('lazy');
            img.classList.add('loaded');
            observer.unobserve(img);
          }
        }
      });
    }, {
      rootMargin: '50px 0px',
      threshold: 0.01
    });

    document.querySelectorAll('[data-lazy]').forEach(img => {
      imageObserver.observe(img);
    });
  }
}

/**
 * React hook for optimized image loading
 */
export function useOptimizedImage(src: string, options: ImageOptimizationOptions = {}) {
  const optimizedSrc = ImageOptimizer.optimizeUrl(src, options);
  const srcSet = ImageOptimizer.getResponsiveSrcSet(src, options.width || 400);
  
  return {
    src: optimizedSrc,
    srcSet,
    sizes: ImageOptimizer.getResponsiveSizes([
      { size: '100vw', width: '640px' },
      { size: '50vw', width: '1024px' },
      { size: '33vw', width: '9999px' }
    ])
  };
}

/**
 * Component wrapper for optimized images
 */
export interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  quality?: number;
  className?: string;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  quality = 85,
  className = '',
  loading = 'lazy',
  onLoad,
  onError
}: OptimizedImageProps) {
  const { src: optimizedSrc, srcSet, sizes } = useOptimizedImage(src, { 
    width, 
    height, 
    quality 
  });

  return (
    <img
      src={optimizedSrc}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      className={`${className} transition-opacity duration-300`}
      onLoad={onLoad}
      onError={onError}
      style={{
        aspectRatio: width && height ? `${width}/${height}` : undefined
      }}
    />
  );
}