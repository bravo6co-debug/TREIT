/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Supabase Configuration
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  
  // App URLs
  readonly VITE_USER_APP_URL: string
  readonly VITE_ADVERTISER_APP_URL: string
  readonly VITE_ADMIN_APP_URL: string
  
  // App Names
  readonly VITE_USER_APP_NAME: string
  readonly VITE_ADVERTISER_APP_NAME: string
  readonly VITE_ADMIN_APP_NAME: string
  
  // Auth Configuration
  readonly VITE_AUTH_REDIRECT_URL: string
  readonly VITE_AUTH_SITE_URL: string
  
  // External Services (Optional)
  readonly VITE_GOOGLE_OAUTH_CLIENT_ID?: string
  readonly VITE_ANALYTICS_PUBLIC_KEY?: string
  
  // Environment Configuration
  readonly VITE_NODE_ENV: 'development' | 'production' | 'test'
  readonly VITE_DEBUG_MODE: string
  readonly VITE_ENABLE_LOGGING: string
  
  // Feature Flags
  readonly VITE_FEATURE_REFERRAL_SYSTEM: string
  readonly VITE_FEATURE_LEVEL_SYSTEM: string
  readonly VITE_FEATURE_SOCIAL_LOGIN: string
  
  // Rate Limiting Display
  readonly VITE_RATE_LIMIT_DISPLAY_INFO: string
  
  // Legacy API Configuration (for compatibility)
  readonly VITE_APP_ENV: string
  readonly VITE_APP_VERSION: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_LOG_LEVEL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}