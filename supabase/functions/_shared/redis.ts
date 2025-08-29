/**
 * Redis caching layer for Edge Functions
 * Uses Upstash Redis for serverless compatibility
 */

interface RedisConfig {
  url: string
  token: string
}

interface CacheOptions {
  ttl?: number // Time to live in seconds
  prefix?: string
}

class RedisCache {
  private config: RedisConfig
  private defaultTTL = 300 // 5 minutes default

  constructor() {
    this.config = {
      url: Deno.env.get('UPSTASH_REDIS_URL') || '',
      token: Deno.env.get('UPSTASH_REDIS_TOKEN') || ''
    }

    if (!this.config.url || !this.config.token) {
      console.warn('Redis configuration missing. Cache will be disabled.')
    }
  }

  /**
   * Get value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    if (!this.isConfigured()) return null

    try {
      const response = await fetch(`${this.config.url}/get/${key}`, {
        headers: {
          Authorization: `Bearer ${this.config.token}`
        }
      })

      if (!response.ok) {
        console.error('Redis GET error:', response.statusText)
        return null
      }

      const data = await response.json()
      return data.result ? JSON.parse(data.result) : null
    } catch (error) {
      console.error('Redis GET exception:', error)
      return null
    }
  }

  /**
   * Set value in cache with optional TTL
   */
  async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isConfigured()) return false

    const ttl = options.ttl || this.defaultTTL
    const serialized = JSON.stringify(value)

    try {
      const response = await fetch(`${this.config.url}/set/${key}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          value: serialized,
          ex: ttl
        })
      })

      if (!response.ok) {
        console.error('Redis SET error:', response.statusText)
        return false
      }

      return true
    } catch (error) {
      console.error('Redis SET exception:', error)
      return false
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    if (!this.isConfigured()) return false

    try {
      const response = await fetch(`${this.config.url}/del/${key}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.token}`
        }
      })

      if (!response.ok) {
        console.error('Redis DEL error:', response.statusText)
        return false
      }

      return true
    } catch (error) {
      console.error('Redis DEL exception:', error)
      return false
    }
  }

  /**
   * Invalidate multiple keys by pattern
   */
  async invalidatePattern(pattern: string): Promise<boolean> {
    if (!this.isConfigured()) return false

    try {
      // First, get all keys matching the pattern
      const keysResponse = await fetch(`${this.config.url}/keys/${pattern}`, {
        headers: {
          Authorization: `Bearer ${this.config.token}`
        }
      })

      if (!keysResponse.ok) {
        console.error('Redis KEYS error:', keysResponse.statusText)
        return false
      }

      const keysData = await keysResponse.json()
      const keys = keysData.result || []

      if (keys.length === 0) return true

      // Delete all matching keys
      const deletePromises = keys.map((key: string) => this.delete(key))
      await Promise.all(deletePromises)

      return true
    } catch (error) {
      console.error('Redis invalidatePattern exception:', error)
      return false
    }
  }

  /**
   * Cache wrapper function for easy caching
   */
  async cached<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key)
    if (cached !== null) {
      console.log(`Cache HIT: ${key}`)
      return cached
    }

    console.log(`Cache MISS: ${key}`)
    
    // Fetch fresh data
    const data = await fetchFn()
    
    // Store in cache for next time
    await this.set(key, data, options)
    
    return data
  }

  /**
   * Check if Redis is configured
   */
  private isConfigured(): boolean {
    return !!(this.config.url && this.config.token)
  }

  /**
   * Generate cache key with prefix
   */
  static generateKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${parts.join(':')}`
  }

  /**
   * Hash object to create cache key suffix
   */
  static hashObject(obj: Record<string, any>): string {
    const sorted = Object.keys(obj).sort().reduce((acc, key) => {
      acc[key] = obj[key]
      return acc
    }, {} as Record<string, any>)
    
    return btoa(JSON.stringify(sorted))
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 16)
  }
}

// Export singleton instance
export const redis = new RedisCache()

// Export cache key helpers
export const CacheKeys = {
  // Campaign analytics cache keys
  campaignAnalytics: (campaignId: string, filters?: any) => {
    const base = `campaign:analytics:${campaignId}`
    return filters ? `${base}:${RedisCache.hashObject(filters)}` : base
  },

  // User analytics cache keys
  userAnalytics: (userId: string, period?: string) => {
    return `user:analytics:${userId}:${period || 'all'}`
  },

  // Campaign list cache keys
  campaignList: (status?: string, page?: number) => {
    return `campaigns:list:${status || 'all'}:${page || 1}`
  },

  // User earnings cache keys
  userEarnings: (userId: string) => {
    return `user:earnings:${userId}`
  },

  // Fraud score cache keys
  fraudScore: (userId: string) => {
    return `user:fraud:${userId}`
  },

  // Campaign budget status
  campaignBudget: (campaignId: string) => {
    return `campaign:budget:${campaignId}`
  }
}

// Export cache invalidation helpers
export const CacheInvalidation = {
  // Invalidate all campaign-related caches
  async invalidateCampaign(campaignId: string) {
    await redis.invalidatePattern(`campaign:*:${campaignId}:*`)
    await redis.delete(CacheKeys.campaignBudget(campaignId))
  },

  // Invalidate all user-related caches
  async invalidateUser(userId: string) {
    await redis.invalidatePattern(`user:*:${userId}:*`)
    await redis.delete(CacheKeys.userEarnings(userId))
    await redis.delete(CacheKeys.fraudScore(userId))
  },

  // Invalidate analytics caches
  async invalidateAnalytics() {
    await redis.invalidatePattern(`*:analytics:*`)
  }
}