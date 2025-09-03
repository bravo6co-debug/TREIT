/**
 * Async Queue System using PostgreSQL NOTIFY/LISTEN
 * Provides event-driven architecture for Edge Functions
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js'

export interface QueueMessage {
  id: string
  type: string
  payload: Record<string, any>
  created_at: string
  retry_count?: number
  max_retries?: number
}

export interface QueueOptions {
  channel: string
  maxRetries?: number
  retryDelay?: number
}

export class AsyncQueue {
  private supabase: any
  private listeners: Map<string, (message: QueueMessage) => Promise<void>> = new Map()

  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
  }

  /**
   * Publish a message to the queue
   */
  async publish(
    channel: string,
    type: string,
    payload: Record<string, any>,
    options: Partial<QueueOptions> = {}
  ): Promise<string> {
    const messageId = crypto.randomUUID()
    
    const message: QueueMessage = {
      id: messageId,
      type,
      payload,
      created_at: new Date().toISOString(),
      retry_count: 0,
      max_retries: options.maxRetries || 3
    }

    try {
      // Store message in queue table
      const { error: insertError } = await this.supabase
        .from('queue_messages')
        .insert({
          id: messageId,
          channel,
          type,
          payload,
          status: 'pending',
          retry_count: 0,
          max_retries: message.max_retries,
          created_at: message.created_at
        })

      if (insertError) throw insertError

      // Send NOTIFY to trigger listeners
      const { error: notifyError } = await this.supabase.rpc('pg_notify', {
        channel,
        payload: JSON.stringify(message)
      })

      if (notifyError) throw notifyError

      console.log(`Published message ${messageId} to channel ${channel}`)
      return messageId

    } catch (error) {
      console.error('Failed to publish message:', error)
      throw error
    }
  }

  /**
   * Subscribe to a queue channel
   */
  async subscribe(
    channel: string,
    handler: (message: QueueMessage) => Promise<void>
  ): Promise<() => void> {
    this.listeners.set(channel, handler)

    // Create subscription using Supabase Realtime
    const subscription = this.supabase
      .channel(`queue:${channel}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'queue_messages',
          filter: `channel=eq.${channel}`
        },
        async (payload: any) => {
          const message: QueueMessage = {
            id: payload.new.id,
            type: payload.new.type,
            payload: payload.new.payload,
            created_at: payload.new.created_at,
            retry_count: payload.new.retry_count,
            max_retries: payload.new.max_retries
          }

          await this.processMessage(channel, message)
        }
      )
      .subscribe()

    // Process any pending messages
    await this.processPendingMessages(channel)

    // Return unsubscribe function
    return () => {
      subscription.unsubscribe()
      this.listeners.delete(channel)
    }
  }

  /**
   * Process a message
   */
  private async processMessage(channel: string, message: QueueMessage): Promise<void> {
    const handler = this.listeners.get(channel)
    if (!handler) return

    try {
      // Update status to processing
      await this.supabase
        .from('queue_messages')
        .update({ status: 'processing', processed_at: new Date().toISOString() })
        .eq('id', message.id)

      // Execute handler
      await handler(message)

      // Mark as completed
      await this.supabase
        .from('queue_messages')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', message.id)

      console.log(`Processed message ${message.id} successfully`)

    } catch (error) {
      console.error(`Failed to process message ${message.id}:`, error)
      await this.handleFailure(message, error as Error)
    }
  }

  /**
   * Handle message processing failure
   */
  private async handleFailure(message: QueueMessage, error: Error): Promise<void> {
    const retryCount = (message.retry_count || 0) + 1
    const maxRetries = message.max_retries || 3

    if (retryCount < maxRetries) {
      // Schedule retry
      const retryDelay = Math.pow(2, retryCount) * 1000 // Exponential backoff
      
      await this.supabase
        .from('queue_messages')
        .update({
          status: 'retry',
          retry_count: retryCount,
          last_error: error.message,
          retry_at: new Date(Date.now() + retryDelay).toISOString()
        })
        .eq('id', message.id)

      console.log(`Scheduled retry ${retryCount}/${maxRetries} for message ${message.id}`)
      
      // Schedule retry processing
      setTimeout(() => {
        this.processMessage(message.type, { ...message, retry_count: retryCount })
      }, retryDelay)

    } else {
      // Move to dead letter queue
      await this.supabase
        .from('queue_messages')
        .update({
          status: 'failed',
          failed_at: new Date().toISOString(),
          last_error: error.message
        })
        .eq('id', message.id)

      console.error(`Message ${message.id} moved to dead letter queue after ${retryCount} retries`)
    }
  }

  /**
   * Process pending messages on startup
   */
  private async processPendingMessages(channel: string): Promise<void> {
    const { data: pendingMessages, error } = await this.supabase
      .from('queue_messages')
      .select('*')
      .eq('channel', channel)
      .in('status', ['pending', 'retry'])
      .lte('retry_at', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(100)

    if (error) {
      console.error('Failed to fetch pending messages:', error)
      return
    }

    for (const msg of pendingMessages || []) {
      const message: QueueMessage = {
        id: msg.id,
        type: msg.type,
        payload: msg.payload,
        created_at: msg.created_at,
        retry_count: msg.retry_count,
        max_retries: msg.max_retries
      }

      await this.processMessage(channel, message)
    }
  }

  /**
   * Batch publish multiple messages
   */
  async publishBatch(
    channel: string,
    messages: Array<{ type: string; payload: Record<string, any> }>,
    options: Partial<QueueOptions> = {}
  ): Promise<string[]> {
    const messageIds: string[] = []

    const batch = messages.map(msg => {
      const messageId = crypto.randomUUID()
      messageIds.push(messageId)

      return {
        id: messageId,
        channel,
        type: msg.type,
        payload: msg.payload,
        status: 'pending',
        retry_count: 0,
        max_retries: options.maxRetries || 3,
        created_at: new Date().toISOString()
      }
    })

    const { error } = await this.supabase
      .from('queue_messages')
      .insert(batch)

    if (error) throw error

    // Send single NOTIFY for batch
    await this.supabase.rpc('pg_notify', {
      channel,
      payload: JSON.stringify({ type: 'batch', count: messages.length })
    })

    console.log(`Published batch of ${messages.length} messages to channel ${channel}`)
    return messageIds
  }

  /**
   * Get queue statistics
   */
  async getStats(channel?: string): Promise<Record<string, any>> {
    let query = this.supabase
      .from('queue_messages')
      .select('status', { count: 'exact' })

    if (channel) {
      query = query.eq('channel', channel)
    }

    const { data, error } = await query

    if (error) throw error

    const stats = {
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      retry: 0
    }

    data?.forEach(row => {
      const status = row.status as keyof typeof stats
      if (status in stats) {
        stats[status]++
        stats.total++
      }
    })

    return stats
  }
}

// Export singleton instance
export const queue = new AsyncQueue()

// Export queue channels
export const QueueChannels = {
  CLICK_PROCESSING: 'click_processing',
  FRAUD_DETECTION: 'fraud_detection',
  EARNINGS_CALCULATION: 'earnings_calculation',
  ANALYTICS_UPDATE: 'analytics_update',
  NOTIFICATION: 'notification',
  BATCH_SYNC: 'batch_sync'
}

// Export message types
export const MessageTypes = {
  // Click processing
  CLICK_RECORDED: 'click_recorded',
  CLICK_VALIDATED: 'click_validated',
  
  // Fraud detection
  FRAUD_CHECK_REQUEST: 'fraud_check_request',
  FRAUD_DETECTED: 'fraud_detected',
  
  // Earnings
  CALCULATE_EARNINGS: 'calculate_earnings',
  EARNINGS_UPDATED: 'earnings_updated',
  
  // Analytics
  UPDATE_CAMPAIGN_ANALYTICS: 'update_campaign_analytics',
  UPDATE_USER_ANALYTICS: 'update_user_analytics',
  
  // Notifications
  SEND_CLICK_NOTIFICATION: 'send_click_notification',
  SEND_EARNINGS_NOTIFICATION: 'send_earnings_notification',
  SEND_ACHIEVEMENT_NOTIFICATION: 'send_achievement_notification'
}