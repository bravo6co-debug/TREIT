// Configuration constants for Edge Functions

export const CONFIG = {
  // API Settings
  API_VERSION: '1.0.0',
  MAX_REQUEST_SIZE: 10 * 1024 * 1024, // 10MB
  DEFAULT_TIMEOUT: 30000, // 30 seconds
  
  // Click Validation
  MIN_CLICK_INTERVAL: 60000, // 1 minute between clicks
  MAX_CLICKS_PER_HOUR: 10, // Max clicks per IP per hour
  MIN_VALIDATION_SCORE: 0.7,
  
  // Level System
  MAX_USER_LEVEL: 100,
  XP_PER_LEVEL: 100,
  LEVEL_BONUS_RATE: 0.01, // 1% bonus per level
  
  // Tracking
  TRACKING_CODE_LENGTH: 16,
  DEEPLINK_EXPIRY_DAYS: 365,
  
  // Fraud Detection
  FRAUD_SCORE_THRESHOLD: 0.6,
  AUTO_SUSPEND_THRESHOLD: 0.9,
  
  // Limits
  DAILY_CLICK_LIMIT: 100,
  MONTHLY_CAMPAIGN_LIMIT: 50,
  
  // Payout
  MIN_PAYOUT_AMOUNT: 10000, // 10,000 KRW
  REFERRAL_BONUS_RATE: 0.05, // 5%
  
  // URLs
  DEFAULT_BASE_URL: 'https://tre-it.com',
  ADMIN_EMAIL: 'admin@tre-it.com',
  
  // Social Media Domains
  SOCIAL_DOMAINS: [
    'instagram.com',
    'facebook.com', 
    'twitter.com',
    'tiktok.com',
    'youtube.com',
    'linkedin.com',
    'telegram.org',
    'kakaotalk.com'
  ],
  
  // Suspicious User Agents
  BOT_PATTERNS: [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /requests/i,
    /headless/i,
    /phantomjs/i,
    /selenium/i
  ],
  
  // Rate Limiting
  RATE_LIMITS: {
    CLICK_TRACKING: {
      REQUESTS: 30,
      WINDOW: 60000 // 1 minute
    },
    DEEPLINK_GENERATION: {
      REQUESTS: 10,
      WINDOW: 60000 // 1 minute  
    },
    FRAUD_DETECTION: {
      REQUESTS: 5,
      WINDOW: 60000 // 1 minute
    }
  },
  
  // Error Messages
  ERRORS: {
    INVALID_TRACKING_CODE: 'Invalid or expired tracking code',
    BOT_DETECTED: 'Bot activity detected',
    DUPLICATE_CLICK: 'Please wait before clicking again',
    BUDGET_EXCEEDED: 'Campaign daily budget exceeded',
    CAMPAIGN_INACTIVE: 'Campaign is not currently active',
    PERMISSION_DENIED: 'Permission denied',
    USER_NOT_FOUND: 'User not found',
    CAMPAIGN_NOT_FOUND: 'Campaign not found',
    FRAUD_DETECTED: 'Fraudulent activity detected',
    RATE_LIMITED: 'Too many requests, please try again later'
  }
}

// Helper functions
export function getErrorMessage(key: keyof typeof CONFIG.ERRORS): string {
  return CONFIG.ERRORS[key] || 'An unexpected error occurred'
}

export function isBotUserAgent(userAgent: string): boolean {
  return CONFIG.BOT_PATTERNS.some(pattern => pattern.test(userAgent))
}

export function isSocialDomain(domain: string): boolean {
  return CONFIG.SOCIAL_DOMAINS.some(social => domain.includes(social))
}

export function calculateXPForLevel(level: number): number {
  return level * CONFIG.XP_PER_LEVEL
}

export function getLevelFromXP(xp: number): number {
  return Math.min(
    Math.floor(xp / CONFIG.XP_PER_LEVEL) + 1,
    CONFIG.MAX_USER_LEVEL
  )
}