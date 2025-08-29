import { useEffect, useState, useCallback } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

export interface NotificationPayload {
  type: 'click' | 'earnings' | 'achievement' | 'level_up' | 'bonus'
  title: string
  description: string
  data?: Record<string, any>
  timestamp: string
}

interface RealtimeNotificationOptions {
  onClickNotification?: (payload: NotificationPayload) => void
  onEarningsNotification?: (payload: NotificationPayload) => void
  onAchievementNotification?: (payload: NotificationPayload) => void
  playSound?: boolean
  showToast?: boolean
}

export function useRealtimeNotifications(
  userId: string | null,
  options: RealtimeNotificationOptions = {}
) {
  const [isConnected, setIsConnected] = useState(false)
  const [notifications, setNotifications] = useState<NotificationPayload[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const { toast } = useToast()
  
  const {
    onClickNotification,
    onEarningsNotification,
    onAchievementNotification,
    playSound = true,
    showToast = true
  } = options

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (!playSound) return
    
    try {
      const audio = new Audio('/sounds/notification.mp3')
      audio.volume = 0.5
      audio.play().catch(console.error)
    } catch (error) {
      console.error('Failed to play notification sound:', error)
    }
  }, [playSound])

  // Show toast notification
  const showNotification = useCallback((notification: NotificationPayload) => {
    if (!showToast) return

    let variant: 'default' | 'destructive' = 'default'
    let icon = '🔔'

    switch (notification.type) {
      case 'click':
        icon = '👆'
        break
      case 'earnings':
        icon = '💰'
        break
      case 'achievement':
        icon = '🏆'
        break
      case 'level_up':
        icon = '⬆️'
        break
      case 'bonus':
        icon = '🎁'
        break
    }

    toast({
      title: `${icon} ${notification.title}`,
      description: notification.description,
      variant,
      duration: 5000
    })
  }, [showToast, toast])

  // Handle incoming notification
  const handleNotification = useCallback((payload: NotificationPayload) => {
    // Add to notifications list
    setNotifications(prev => [payload, ...prev].slice(0, 50)) // Keep last 50
    setUnreadCount(prev => prev + 1)

    // Play sound and show toast
    playNotificationSound()
    showNotification(payload)

    // Call specific handlers
    switch (payload.type) {
      case 'click':
        onClickNotification?.(payload)
        break
      case 'earnings':
        onEarningsNotification?.(payload)
        break
      case 'achievement':
        onAchievementNotification?.(payload)
        break
    }
  }, [
    playNotificationSound,
    showNotification,
    onClickNotification,
    onEarningsNotification,
    onAchievementNotification
  ])

  // Mark notifications as read
  const markAsRead = useCallback(() => {
    setUnreadCount(0)
  }, [])

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([])
    setUnreadCount(0)
  }, [])

  useEffect(() => {
    if (!userId) {
      setIsConnected(false)
      return
    }

    let channel: RealtimeChannel | null = null

    const setupRealtimeConnection = async () => {
      try {
        // Subscribe to user-specific channels
        channel = supabase
          .channel(`notifications:${userId}`)
          .on('broadcast', { event: 'click' }, (payload) => {
            handleNotification({
              type: 'click',
              title: 'New Click Recorded!',
              description: payload.payload.description || 'Your link was clicked',
              data: payload.payload,
              timestamp: new Date().toISOString()
            })
          })
          .on('broadcast', { event: 'earnings' }, (payload) => {
            const earnings = payload.payload.earnings || 0
            const bonus = payload.payload.level_bonus || 0
            handleNotification({
              type: 'earnings',
              title: 'Earnings Confirmed!',
              description: `+${earnings} won earned${bonus > 0 ? ` (includes ${bonus} won bonus)` : ''}`,
              data: payload.payload,
              timestamp: new Date().toISOString()
            })
          })
          .on('broadcast', { event: 'achievement' }, (payload) => {
            handleNotification({
              type: 'achievement',
              title: payload.payload.title || 'Achievement Unlocked!',
              description: payload.payload.description || 'You earned a new achievement',
              data: payload.payload,
              timestamp: new Date().toISOString()
            })
          })
          .on('broadcast', { event: 'level_up' }, (payload) => {
            const newLevel = payload.payload.new_level || 1
            handleNotification({
              type: 'level_up',
              title: `Level ${newLevel} Reached!`,
              description: payload.payload.description || 'Congratulations on leveling up!',
              data: payload.payload,
              timestamp: new Date().toISOString()
            })
          })
          .on('broadcast', { event: 'bonus' }, (payload) => {
            handleNotification({
              type: 'bonus',
              title: 'Bonus Received!',
              description: payload.payload.description || 'You received a bonus reward',
              data: payload.payload,
              timestamp: new Date().toISOString()
            })
          })
          .subscribe((status) => {
            setIsConnected(status === 'SUBSCRIBED')
            console.log(`Realtime notifications ${status === 'SUBSCRIBED' ? 'connected' : 'disconnected'}`)
          })

        // Also subscribe to database changes for click events
        const clickChannel = supabase
          .channel(`clicks:${userId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'click_events',
              filter: `user_campaigns.user_id=eq.${userId}`
            },
            (payload) => {
              if (payload.new.is_valid === true && payload.old.is_valid === null) {
                // Click was just validated
                const commission = payload.new.commission_amount || 0
                handleNotification({
                  type: 'earnings',
                  title: 'Click Validated!',
                  description: `Your click was validated. Earned ${commission} won`,
                  data: payload.new,
                  timestamp: payload.new.clicked_at
                })
              }
            }
          )
          .subscribe()

      } catch (error) {
        console.error('Failed to setup realtime notifications:', error)
        setIsConnected(false)
      }
    }

    setupRealtimeConnection()

    // Cleanup on unmount
    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [userId, handleNotification])

  return {
    isConnected,
    notifications,
    unreadCount,
    markAsRead,
    clearNotifications
  }
}

// Notification sender utility (for server-side)
export async function sendRealtimeNotification(
  userId: string,
  event: string,
  payload: Record<string, any>
) {
  try {
    const channel = supabase.channel(`notifications:${userId}`)
    await channel.send({
      type: 'broadcast',
      event,
      payload
    })
    return true
  } catch (error) {
    console.error('Failed to send realtime notification:', error)
    return false
  }
}