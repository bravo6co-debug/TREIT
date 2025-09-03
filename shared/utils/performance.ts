// 성능 측정 및 모니터링 유틸리티

export interface PerformanceMetrics {
  // Core Web Vitals
  LCP?: number // Largest Contentful Paint
  FID?: number // First Input Delay
  CLS?: number // Cumulative Layout Shift
  FCP?: number // First Contentful Paint
  TTFB?: number // Time to First Byte
  
  // React specific
  renderTime?: number
  componentCount?: number
  reRenderCount?: number
  
  // Memory
  usedJSHeapSize?: number
  totalJSHeapSize?: number
  jsHeapSizeLimit?: number
  
  // Network
  networkType?: string
  effectiveType?: string
  
  // Device
  deviceMemory?: number
  hardwareConcurrency?: number
}

export interface PerformanceMark {
  name: string
  startTime: number
  endTime?: number
  duration?: number
  metadata?: Record<string, any>
}

class PerformanceMonitor {
  private marks: Map<string, PerformanceMark> = new Map()
  private metrics: PerformanceMetrics = {}
  private observers: PerformanceObserver[] = []

  constructor() {
    this.initializeObservers()
    this.collectDeviceInfo()
  }

  // Web Vitals 관찰자 초기화
  private initializeObservers() {
    if (typeof window === 'undefined') return

    try {
      // LCP (Largest Contentful Paint) 관찰
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & { renderTime?: number; loadTime?: number }
        this.metrics.LCP = lastEntry.renderTime || lastEntry.loadTime || lastEntry.startTime
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
      this.observers.push(lcpObserver)

      // FID (First Input Delay) 관찰
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries() as any[]
        entries.forEach((entry) => {
          this.metrics.FID = entry.processingStart - entry.startTime
        })
      })
      fidObserver.observe({ entryTypes: ['first-input'] })
      this.observers.push(fidObserver)

      // CLS (Cumulative Layout Shift) 관찰
      let clsValue = 0
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries() as any[]
        entries.forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
            this.metrics.CLS = clsValue
          }
        })
      })
      clsObserver.observe({ entryTypes: ['layout-shift'] })
      this.observers.push(clsObserver)

      // Navigation Timing
      this.collectNavigationMetrics()

    } catch (error) {
      console.warn('Performance Observer not supported:', error)
    }
  }

  // 네비게이션 메트릭 수집
  private collectNavigationMetrics() {
    if (typeof window === 'undefined') return

    // FCP, TTFB 등 수집
    const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
    if (navigationEntries.length > 0) {
      const nav = navigationEntries[0]
      this.metrics.TTFB = nav.responseStart - nav.requestStart
      
      // FCP는 paint 이벤트에서 수집
      const paintEntries = performance.getEntriesByType('paint')
      const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint')
      if (fcpEntry) {
        this.metrics.FCP = fcpEntry.startTime
      }
    }
  }

  // 디바이스 정보 수집
  private collectDeviceInfo() {
    if (typeof window === 'undefined') return

    // 메모리 정보
    if ('memory' in performance) {
      const memory = (performance as any).memory
      this.metrics.usedJSHeapSize = memory.usedJSHeapSize
      this.metrics.totalJSHeapSize = memory.totalJSHeapSize
      this.metrics.jsHeapSizeLimit = memory.jsHeapSizeLimit
    }

    // 네트워크 정보
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      this.metrics.networkType = connection.type
      this.metrics.effectiveType = connection.effectiveType
    }

    // 하드웨어 정보
    if ('deviceMemory' in navigator) {
      this.metrics.deviceMemory = (navigator as any).deviceMemory
    }
    
    if ('hardwareConcurrency' in navigator) {
      this.metrics.hardwareConcurrency = navigator.hardwareConcurrency
    }
  }

  // 성능 마크 시작
  public startMark(name: string, metadata?: Record<string, any>): void {
    const mark: PerformanceMark = {
      name,
      startTime: performance.now(),
      metadata
    }
    
    this.marks.set(name, mark)
    performance.mark(`${name}-start`)
  }

  // 성능 마크 종료
  public endMark(name: string): PerformanceMark | null {
    const mark = this.marks.get(name)
    if (!mark) {
      console.warn(`Performance mark "${name}" not found`)
      return null
    }

    const endTime = performance.now()
    const duration = endTime - mark.startTime

    const completedMark: PerformanceMark = {
      ...mark,
      endTime,
      duration
    }

    this.marks.set(name, completedMark)
    performance.mark(`${name}-end`)
    performance.measure(name, `${name}-start`, `${name}-end`)

    return completedMark
  }

  // 측정된 성능 데이터 반환
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  // 모든 마크 반환
  public getMarks(): PerformanceMark[] {
    return Array.from(this.marks.values())
  }

  // 특정 마크 반환
  public getMark(name: string): PerformanceMark | undefined {
    return this.marks.get(name)
  }

  // 성능 데이터 정리
  public clear(): void {
    this.marks.clear()
    performance.clearMarks()
    performance.clearMeasures()
  }

  // 성능 데이터 분석
  public analyzePerformance(): {
    score: number
    issues: string[]
    recommendations: string[]
  } {
    const issues: string[] = []
    const recommendations: string[] = []
    let score = 100

    // LCP 분석 (2.5초 이하가 좋음)
    if (this.metrics.LCP) {
      if (this.metrics.LCP > 4000) {
        score -= 30
        issues.push('LCP가 4초를 초과합니다')
        recommendations.push('이미지 최적화, CDN 사용, 서버 응답시간 개선을 고려하세요')
      } else if (this.metrics.LCP > 2500) {
        score -= 15
        issues.push('LCP가 2.5초를 초과합니다')
        recommendations.push('중요 리소스의 우선순위를 높이고 렌더링 차단 리소스를 줄이세요')
      }
    }

    // FID 분석 (100ms 이하가 좋음)
    if (this.metrics.FID) {
      if (this.metrics.FID > 300) {
        score -= 25
        issues.push('FID가 300ms를 초과합니다')
        recommendations.push('JavaScript 실행 시간을 줄이고 코드 스플리팅을 적용하세요')
      } else if (this.metrics.FID > 100) {
        score -= 10
        issues.push('FID가 100ms를 초과합니다')
        recommendations.push('장시간 실행되는 태스크를 분할하세요')
      }
    }

    // CLS 분석 (0.1 이하가 좋음)
    if (this.metrics.CLS) {
      if (this.metrics.CLS > 0.25) {
        score -= 20
        issues.push('CLS가 0.25를 초과합니다')
        recommendations.push('이미지와 임베드 요소에 크기를 명시하세요')
      } else if (this.metrics.CLS > 0.1) {
        score -= 10
        issues.push('CLS가 0.1을 초과합니다')
        recommendations.push('동적 콘텐츠 삽입을 최소화하세요')
      }
    }

    // 메모리 사용량 분석
    if (this.metrics.usedJSHeapSize && this.metrics.jsHeapSizeLimit) {
      const memoryUsageRatio = this.metrics.usedJSHeapSize / this.metrics.jsHeapSizeLimit
      if (memoryUsageRatio > 0.8) {
        score -= 15
        issues.push('메모리 사용량이 높습니다')
        recommendations.push('메모리 누수를 확인하고 불필요한 객체를 정리하세요')
      }
    }

    return {
      score: Math.max(0, score),
      issues,
      recommendations
    }
  }

  // 성능 리포트 생성
  public generateReport(): string {
    const metrics = this.getMetrics()
    const analysis = this.analyzePerformance()
    const marks = this.getMarks()

    let report = '=== Performance Report ===\n\n'

    // Core Web Vitals
    report += 'Core Web Vitals:\n'
    report += `  LCP: ${metrics.LCP ? `${metrics.LCP.toFixed(2)}ms` : 'N/A'}\n`
    report += `  FID: ${metrics.FID ? `${metrics.FID.toFixed(2)}ms` : 'N/A'}\n`
    report += `  CLS: ${metrics.CLS ? metrics.CLS.toFixed(4) : 'N/A'}\n`
    report += `  FCP: ${metrics.FCP ? `${metrics.FCP.toFixed(2)}ms` : 'N/A'}\n`
    report += `  TTFB: ${metrics.TTFB ? `${metrics.TTFB.toFixed(2)}ms` : 'N/A'}\n\n`

    // Device Info
    report += 'Device Information:\n'
    report += `  Memory: ${metrics.deviceMemory || 'N/A'} GB\n`
    report += `  CPU Cores: ${metrics.hardwareConcurrency || 'N/A'}\n`
    report += `  Network: ${metrics.effectiveType || 'N/A'}\n\n`

    // Memory Usage
    if (metrics.usedJSHeapSize) {
      report += 'Memory Usage:\n'
      report += `  Used: ${(metrics.usedJSHeapSize / 1048576).toFixed(2)} MB\n`
      report += `  Total: ${metrics.totalJSHeapSize ? (metrics.totalJSHeapSize / 1048576).toFixed(2) : 'N/A'} MB\n`
      report += `  Limit: ${metrics.jsHeapSizeLimit ? (metrics.jsHeapSizeLimit / 1048576).toFixed(2) : 'N/A'} MB\n\n`
    }

    // Performance Marks
    if (marks.length > 0) {
      report += 'Custom Marks:\n'
      marks.forEach(mark => {
        report += `  ${mark.name}: ${mark.duration ? `${mark.duration.toFixed(2)}ms` : 'ongoing'}\n`
      })
      report += '\n'
    }

    // Analysis
    report += `Performance Score: ${analysis.score}/100\n\n`

    if (analysis.issues.length > 0) {
      report += 'Issues Found:\n'
      analysis.issues.forEach(issue => {
        report += `  - ${issue}\n`
      })
      report += '\n'
    }

    if (analysis.recommendations.length > 0) {
      report += 'Recommendations:\n'
      analysis.recommendations.forEach(rec => {
        report += `  - ${rec}\n`
      })
    }

    return report
  }

  // 정리
  public destroy(): void {
    this.observers.forEach(observer => observer.disconnect())
    this.observers.length = 0
    this.clear()
  }
}

// 싱글톤 인스턴스
let performanceMonitor: PerformanceMonitor | null = null

export const getPerformanceMonitor = (): PerformanceMonitor => {
  if (!performanceMonitor) {
    performanceMonitor = new PerformanceMonitor()
  }
  return performanceMonitor
}

// React Hook
export const usePerformanceMonitor = () => {
  const monitor = getPerformanceMonitor()

  const startMark = (name: string, metadata?: Record<string, any>) => {
    monitor.startMark(name, metadata)
  }

  const endMark = (name: string) => {
    return monitor.endMark(name)
  }

  const getMetrics = () => {
    return monitor.getMetrics()
  }

  const generateReport = () => {
    return monitor.generateReport()
  }

  return {
    startMark,
    endMark,
    getMetrics,
    generateReport,
    monitor
  }
}

// 컴포넌트 렌더링 성능 측정 HOC
export const withPerformanceMonitoring = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) => {
  const ComponentWithPerformanceMonitoring = (props: P) => {
    const monitor = getPerformanceMonitor()
    const name = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Unknown'

    React.useEffect(() => {
      monitor.startMark(`${name}-mount`)
      
      return () => {
        monitor.endMark(`${name}-mount`)
      }
    }, [])

    React.useEffect(() => {
      monitor.startMark(`${name}-render`)
      monitor.endMark(`${name}-render`)
    })

    return <WrappedComponent {...props} />
  }

  ComponentWithPerformanceMonitoring.displayName = `withPerformanceMonitoring(${componentName || 'Component'})`
  
  return ComponentWithPerformanceMonitoring
}

// 자동 성능 리포팅
export const enableAutoReporting = (intervalMs: number = 60000) => {
  if (typeof window === 'undefined') return

  const monitor = getPerformanceMonitor()
  
  setInterval(() => {
    const report = monitor.generateReport()
    console.group('🚀 Performance Report')
    console.log(report)
    console.groupEnd()
  }, intervalMs)
}

// Web Vitals 리포터
export const reportWebVitals = (onPerfEntry?: (metric: PerformanceMetrics) => void) => {
  const monitor = getPerformanceMonitor()
  
  // 페이지 언로드 시 최종 메트릭 전송
  window.addEventListener('beforeunload', () => {
    const metrics = monitor.getMetrics()
    onPerfEntry?.(metrics)
    
    // Analytics나 로깅 서비스로 전송
    if ('sendBeacon' in navigator) {
      navigator.sendBeacon('/api/performance', JSON.stringify(metrics))
    }
  })
}