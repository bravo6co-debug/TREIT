// 폼 에러 처리 및 검증 시스템

import { AppError, ErrorCode } from './types'
import { ErrorFactory } from './error-factory'

export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: RegExp
  email?: boolean
  phone?: boolean
  url?: boolean
  integer?: boolean
  positive?: boolean
  custom?: (value: any, formData: Record<string, any>) => string | null
  asyncValidator?: (value: any) => Promise<string | null>
}

export interface FieldConfig {
  label: string
  rules: ValidationRule
  dependencies?: string[] // 이 필드가 의존하는 다른 필드들
}

export interface FormConfig {
  fields: Record<string, FieldConfig>
  submitValidation?: (formData: Record<string, any>) => Promise<Record<string, string> | null>
}

export interface ValidationResult {
  isValid: boolean
  errors: Record<string, AppError>
  firstErrorField?: string
}

export class FormValidator {
  private config: FormConfig
  private validationCache = new Map<string, { value: any; result: AppError | null; timestamp: number }>()
  private readonly cacheTimeout = 5000 // 5초

  constructor(config: FormConfig) {
    this.config = config
  }

  /**
   * 단일 필드 검증
   */
  async validateField(
    fieldName: string, 
    value: any, 
    formData: Record<string, any> = {}
  ): Promise<AppError | null> {
    const fieldConfig = this.config.fields[fieldName]
    if (!fieldConfig) {
      console.warn(`Field config not found for: ${fieldName}`)
      return null
    }

    // 캐시 확인
    const cacheKey = `${fieldName}_${JSON.stringify(value)}_${JSON.stringify(formData)}`
    const cached = this.validationCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.result
    }

    const { label, rules } = fieldConfig
    let error: AppError | null = null

    try {
      // 필수 필드 검증
      if (rules.required && this.isEmpty(value)) {
        error = ErrorFactory.fromValidationError(
          fieldName, 
          value, 
          'required',
          { label }
        )
        error.userMessage = `${label}은(는) 필수 입력 항목입니다.`
      }

      // 값이 비어있고 필수가 아니면 추가 검증 스킵
      if (this.isEmpty(value) && !rules.required) {
        this.updateCache(cacheKey, value, null)
        return null
      }

      // 길이 검증
      if (!error && rules.minLength && String(value).length < rules.minLength) {
        error = ErrorFactory.fromValidationError(fieldName, value, 'minLength', { label })
        error.userMessage = `${label}은(는) 최소 ${rules.minLength}자 이상 입력해주세요.`
      }

      if (!error && rules.maxLength && String(value).length > rules.maxLength) {
        error = ErrorFactory.fromValidationError(fieldName, value, 'maxLength', { label })
        error.userMessage = `${label}은(는) 최대 ${rules.maxLength}자까지만 입력 가능합니다.`
      }

      // 숫자 범위 검증
      if (!error && rules.min !== undefined) {
        const numValue = Number(value)
        if (isNaN(numValue) || numValue < rules.min) {
          error = ErrorFactory.fromValidationError(fieldName, value, 'min', { label })
          error.userMessage = `${label}은(는) ${rules.min} 이상이어야 합니다.`
        }
      }

      if (!error && rules.max !== undefined) {
        const numValue = Number(value)
        if (isNaN(numValue) || numValue > rules.max) {
          error = ErrorFactory.fromValidationError(fieldName, value, 'max', { label })
          error.userMessage = `${label}은(는) ${rules.max} 이하여야 합니다.`
        }
      }

      // 정수 검증
      if (!error && rules.integer) {
        const numValue = Number(value)
        if (isNaN(numValue) || !Number.isInteger(numValue)) {
          error = ErrorFactory.fromValidationError(fieldName, value, 'integer', { label })
          error.userMessage = `${label}은(는) 정수만 입력 가능합니다.`
        }
      }

      // 양수 검증
      if (!error && rules.positive) {
        const numValue = Number(value)
        if (isNaN(numValue) || numValue <= 0) {
          error = ErrorFactory.fromValidationError(fieldName, value, 'positive', { label })
          error.userMessage = `${label}은(는) 양수만 입력 가능합니다.`
        }
      }

      // 이메일 검증
      if (!error && rules.email) {
        if (!this.isValidEmail(String(value))) {
          error = ErrorFactory.fromValidationError(fieldName, value, 'email', { label })
          error.userMessage = '올바른 이메일 주소를 입력해주세요.'
        }
      }

      // 전화번호 검증
      if (!error && rules.phone) {
        if (!this.isValidPhone(String(value))) {
          error = ErrorFactory.fromValidationError(fieldName, value, 'phone', { label })
          error.userMessage = '올바른 전화번호를 입력해주세요. (예: 010-1234-5678)'
        }
      }

      // URL 검증
      if (!error && rules.url) {
        if (!this.isValidUrl(String(value))) {
          error = ErrorFactory.fromValidationError(fieldName, value, 'url', { label })
          error.userMessage = '올바른 URL을 입력해주세요.'
        }
      }

      // 정규식 검증
      if (!error && rules.pattern && !rules.pattern.test(String(value))) {
        error = ErrorFactory.fromValidationError(fieldName, value, 'pattern', { label })
        error.userMessage = `${label} 형식이 올바르지 않습니다.`
      }

      // 커스텀 검증
      if (!error && rules.custom) {
        const customError = rules.custom(value, formData)
        if (customError) {
          error = ErrorFactory.fromValidationError(fieldName, value, 'custom', { label })
          error.userMessage = customError
        }
      }

      // 비동기 검증
      if (!error && rules.asyncValidator) {
        const asyncError = await rules.asyncValidator(value)
        if (asyncError) {
          error = ErrorFactory.fromValidationError(fieldName, value, 'async', { label })
          error.userMessage = asyncError
        }
      }

    } catch (validationError) {
      console.error(`Validation error for field ${fieldName}:`, validationError)
      error = ErrorFactory.create(
        ErrorCode.VALIDATION_INVALID_FORMAT,
        { field: fieldName, label },
        validationError,
        `${label} 검증 중 오류가 발생했습니다.`
      )
    }

    // 캐시 업데이트
    this.updateCache(cacheKey, value, error)

    return error
  }

  /**
   * 전체 폼 검증
   */
  async validateForm(formData: Record<string, any>): Promise<ValidationResult> {
    const errors: Record<string, AppError> = {}
    const fieldNames = Object.keys(this.config.fields)

    // 의존성 순서대로 필드 정렬
    const sortedFields = this.sortFieldsByDependencies(fieldNames)

    // 각 필드 검증
    for (const fieldName of sortedFields) {
      const error = await this.validateField(fieldName, formData[fieldName], formData)
      if (error) {
        errors[fieldName] = error
      }
    }

    // 전역 폼 검증
    if (Object.keys(errors).length === 0 && this.config.submitValidation) {
      try {
        const submitErrors = await this.config.submitValidation(formData)
        if (submitErrors) {
          Object.entries(submitErrors).forEach(([field, message]) => {
            errors[field] = ErrorFactory.fromValidationError(
              field, 
              formData[field], 
              'submit',
              { label: this.config.fields[field]?.label || field }
            )
            errors[field].userMessage = message
          })
        }
      } catch (submitError) {
        console.error('Submit validation error:', submitError)
        errors['_form'] = ErrorFactory.create(
          ErrorCode.VALIDATION_INVALID_FORMAT,
          { action: 'submit_validation' },
          submitError,
          '폼 검증 중 오류가 발생했습니다.'
        )
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      firstErrorField: Object.keys(errors)[0]
    }
  }

  /**
   * 실시간 검증 (디바운싱 포함)
   */
  validateFieldWithDebounce(
    fieldName: string,
    value: any,
    formData: Record<string, any>,
    delay = 300
  ): Promise<AppError | null> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(async () => {
        const error = await this.validateField(fieldName, value, formData)
        resolve(error)
      }, delay)

      // 이전 타이머가 있다면 취소
      const existingTimeoutId = (this as any)[`timeout_${fieldName}`]
      if (existingTimeoutId) {
        clearTimeout(existingTimeoutId)
      }
      
      (this as any)[`timeout_${fieldName}`] = timeoutId
    })
  }

  /**
   * 필드 의존성에 따른 정렬
   */
  private sortFieldsByDependencies(fieldNames: string[]): string[] {
    const visited = new Set<string>()
    const visiting = new Set<string>()
    const result: string[] = []

    const visit = (fieldName: string) => {
      if (visiting.has(fieldName)) {
        console.warn(`Circular dependency detected for field: ${fieldName}`)
        return
      }

      if (visited.has(fieldName)) {
        return
      }

      visiting.add(fieldName)

      const dependencies = this.config.fields[fieldName]?.dependencies || []
      dependencies.forEach(dep => {
        if (fieldNames.includes(dep)) {
          visit(dep)
        }
      })

      visiting.delete(fieldName)
      visited.add(fieldName)
      result.push(fieldName)
    }

    fieldNames.forEach(visit)
    return result
  }

  /**
   * 캐시 업데이트
   */
  private updateCache(key: string, value: any, result: AppError | null): void {
    this.validationCache.set(key, {
      value,
      result,
      timestamp: Date.now()
    })

    // 캐시 크기 제한 (1000개)
    if (this.validationCache.size > 1000) {
      const oldestKey = this.validationCache.keys().next().value
      this.validationCache.delete(oldestKey)
    }
  }

  /**
   * 빈 값 확인
   */
  private isEmpty(value: any): boolean {
    if (value === null || value === undefined) return true
    if (typeof value === 'string') return value.trim() === ''
    if (Array.isArray(value)) return value.length === 0
    if (typeof value === 'object') return Object.keys(value).length === 0
    return false
  }

  /**
   * 이메일 유효성 검사
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * 전화번호 유효성 검사 (한국 형식)
   */
  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^01(?:0|1|[6-9])-(?:\d{3}|\d{4})-\d{4}$/
    const cleanPhone = phone.replace(/[^\d-]/g, '')
    return phoneRegex.test(cleanPhone)
  }

  /**
   * URL 유효성 검사
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  /**
   * 캐시 정리
   */
  clearCache(): void {
    this.validationCache.clear()
  }

  /**
   * 필드 설정 업데이트
   */
  updateFieldConfig(fieldName: string, config: FieldConfig): void {
    this.config.fields[fieldName] = config
    // 해당 필드 관련 캐시 삭제
    for (const key of this.validationCache.keys()) {
      if (key.startsWith(`${fieldName}_`)) {
        this.validationCache.delete(key)
      }
    }
  }

  /**
   * 통계 정보 반환
   */
  getValidationStats(): {
    cacheSize: number
    cacheHitRate: number
    fieldCount: number
    dependentFields: string[]
  } {
    const dependentFields = Object.entries(this.config.fields)
      .filter(([_, config]) => config.dependencies && config.dependencies.length > 0)
      .map(([name]) => name)

    return {
      cacheSize: this.validationCache.size,
      cacheHitRate: 0, // 실제 구현 시 히트율 계산 로직 추가
      fieldCount: Object.keys(this.config.fields).length,
      dependentFields
    }
  }
}

/**
 * 미리 정의된 검증 규칙들
 */
export const ValidationRules = {
  required: { required: true },
  
  email: {
    required: true,
    email: true,
    maxLength: 254
  },

  password: {
    required: true,
    minLength: 8,
    pattern: /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    custom: (value: string) => {
      if (!/(?=.*[a-zA-Z])/.test(value)) return '영문자를 포함해주세요.'
      if (!/(?=.*\d)/.test(value)) return '숫자를 포함해주세요.'
      if (!/(?=.*[@$!%*?&])/.test(value)) return '특수문자를 포함해주세요.'
      return null
    }
  },

  confirmPassword: (passwordField = 'password') => ({
    required: true,
    custom: (value: string, formData: Record<string, any>) => {
      if (value !== formData[passwordField]) {
        return '비밀번호가 일치하지 않습니다.'
      }
      return null
    }
  }),

  phone: {
    required: true,
    phone: true
  },

  koreanName: {
    required: true,
    pattern: /^[가-힣]{2,10}$/,
    minLength: 2,
    maxLength: 10
  },

  businessNumber: {
    required: true,
    pattern: /^\d{3}-\d{2}-\d{5}$/,
    custom: (value: string) => {
      const cleaned = value.replace(/-/g, '')
      if (cleaned.length !== 10) return '사업자등록번호는 10자리여야 합니다.'
      
      // 사업자등록번호 체크섬 검증
      const checkSum = [1, 3, 7, 1, 3, 7, 1, 3, 5]
      let sum = 0
      
      for (let i = 0; i < 9; i++) {
        sum += parseInt(cleaned[i]) * checkSum[i]
      }
      
      sum += Math.floor(parseInt(cleaned[8]) * 5 / 10)
      const remainder = sum % 10
      const checkDigit = remainder === 0 ? 0 : 10 - remainder
      
      if (checkDigit !== parseInt(cleaned[9])) {
        return '올바르지 않은 사업자등록번호입니다.'
      }
      
      return null
    }
  },

  url: {
    url: true,
    maxLength: 2083
  },

  positiveInteger: {
    integer: true,
    positive: true,
    min: 1
  },

  money: {
    positive: true,
    custom: (value: string) => {
      const num = parseFloat(value)
      if (isNaN(num)) return '올바른 금액을 입력해주세요.'
      if (num < 0) return '음수는 입력할 수 없습니다.'
      if (!/^\d+(\.\d{1,2})?$/.test(value)) return '소수점 둘째 자리까지만 입력 가능합니다.'
      return null
    }
  }
}