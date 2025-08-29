export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      // User Management
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          phone: string | null
          phone_verified: boolean
          role: 'user' | 'advertiser' | 'admin' | 'support'
          total_points: number
          current_level: number
          level_progress: number
          social_accounts: Json
          is_active: boolean
          is_verified: boolean
          referral_code: string | null
          referred_by: string | null
          last_login_at: string | null
          login_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          phone_verified?: boolean
          role?: 'user' | 'advertiser' | 'admin' | 'support'
          total_points?: number
          current_level?: number
          level_progress?: number
          social_accounts?: Json
          is_active?: boolean
          is_verified?: boolean
          referral_code?: string | null
          referred_by?: string | null
          last_login_at?: string | null
          login_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          phone_verified?: boolean
          role?: 'user' | 'advertiser' | 'admin' | 'support'
          total_points?: number
          current_level?: number
          level_progress?: number
          social_accounts?: Json
          is_active?: boolean
          is_verified?: boolean
          referral_code?: string | null
          referred_by?: string | null
          last_login_at?: string | null
          login_count?: number
          created_at?: string
          updated_at?: string
        }
      }

      // User Level System
      user_levels: {
        Row: {
          id: number
          level_number: number
          level_name: string
          required_points: number
          tier_multiplier: number
          benefits: string | null
          badge_icon: string | null
          created_at: string
        }
        Insert: {
          id?: number
          level_number: number
          level_name: string
          required_points: number
          tier_multiplier: number
          benefits?: string | null
          badge_icon?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          level_number?: number
          level_name?: string
          required_points?: number
          tier_multiplier?: number
          benefits?: string | null
          badge_icon?: string | null
          created_at?: string
        }
      }

      // Advertiser Management
      advertiser_profiles: {
        Row: {
          id: string
          company_name: string
          contact_email: string
          contact_person: string | null
          business_license: string | null
          website_url: string | null
          industry: string | null
          company_size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise'
          status: 'pending' | 'active' | 'suspended' | 'rejected'
          balance: number
          total_spent: number
          payment_method: Json | null
          billing_info: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          company_name: string
          contact_email: string
          contact_person?: string | null
          business_license?: string | null
          website_url?: string | null
          industry?: string | null
          company_size?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise'
          status?: 'pending' | 'active' | 'suspended' | 'rejected'
          balance?: number
          total_spent?: number
          payment_method?: Json | null
          billing_info?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_name?: string
          contact_email?: string
          contact_person?: string | null
          business_license?: string | null
          website_url?: string | null
          industry?: string | null
          company_size?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise'
          status?: 'pending' | 'active' | 'suspended' | 'rejected'
          balance?: number
          total_spent?: number
          payment_method?: Json | null
          billing_info?: Json | null
          created_at?: string
          updated_at?: string
        }
      }

      // Category Management
      categories: {
        Row: {
          id: number
          name: string
          description: string | null
          icon_url: string | null
          color: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          icon_url?: string | null
          color?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          icon_url?: string | null
          color?: string | null
          is_active?: boolean
          created_at?: string
        }
      }

      // Campaign Management
      campaigns: {
        Row: {
          id: string
          advertiser_id: string
          title: string
          description: string
          category_id: number
          landing_url: string
          image_url: string | null
          reward_type: 'points' | 'cash'
          reward_amount: number
          target_audience: string | null
          requirements: string | null
          total_budget: number
          daily_budget: number | null
          max_participants: number | null
          current_participants: number
          total_clicks: number
          status: 'draft' | 'active' | 'paused' | 'completed' | 'rejected'
          start_date: string
          end_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          advertiser_id: string
          title: string
          description: string
          category_id: number
          landing_url: string
          image_url?: string | null
          reward_type: 'points' | 'cash'
          reward_amount: number
          target_audience?: string | null
          requirements?: string | null
          total_budget: number
          daily_budget?: number | null
          max_participants?: number | null
          current_participants?: number
          total_clicks?: number
          status?: 'draft' | 'active' | 'paused' | 'completed' | 'rejected'
          start_date: string
          end_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          advertiser_id?: string
          title?: string
          description?: string
          category_id?: number
          landing_url?: string
          image_url?: string | null
          reward_type?: 'points' | 'cash'
          reward_amount?: number
          target_audience?: string | null
          requirements?: string | null
          total_budget?: number
          daily_budget?: number | null
          max_participants?: number | null
          current_participants?: number
          total_clicks?: number
          status?: 'draft' | 'active' | 'paused' | 'completed' | 'rejected'
          start_date?: string
          end_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      // Mission Management
      missions: {
        Row: {
          id: string
          campaign_id: string
          title: string
          description: string
          reward_points: number
          required_actions: Json
          verification_method: string
          estimated_duration: number
          difficulty_level: 'easy' | 'medium' | 'hard'
          completion_count: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          title: string
          description: string
          reward_points: number
          required_actions: Json
          verification_method: string
          estimated_duration: number
          difficulty_level: 'easy' | 'medium' | 'hard'
          completion_count?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          title?: string
          description?: string
          reward_points?: number
          required_actions?: Json
          verification_method?: string
          estimated_duration?: number
          difficulty_level?: 'easy' | 'medium' | 'hard'
          completion_count?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }

      // User Mission Participation
      user_missions: {
        Row: {
          id: string
          user_id: string
          mission_id: string
          status: 'started' | 'in_progress' | 'submitted' | 'completed' | 'rejected'
          progress: number
          submission_data: Json | null
          verification_notes: string | null
          points_earned: number
          started_at: string
          completed_at: string | null
          verified_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          mission_id: string
          status?: 'started' | 'in_progress' | 'submitted' | 'completed' | 'rejected'
          progress?: number
          submission_data?: Json | null
          verification_notes?: string | null
          points_earned?: number
          started_at?: string
          completed_at?: string | null
          verified_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          mission_id?: string
          status?: 'started' | 'in_progress' | 'submitted' | 'completed' | 'rejected'
          progress?: number
          submission_data?: Json | null
          verification_notes?: string | null
          points_earned?: number
          started_at?: string
          completed_at?: string | null
          verified_at?: string | null
        }
      }

      // Point Transactions
      point_transactions: {
        Row: {
          id: string
          user_id: string
          type: 'earned' | 'spent' | 'bonus' | 'penalty'
          amount: number
          description: string
          reference_id: string | null
          reference_type: 'mission' | 'campaign' | 'referral' | 'admin' | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'earned' | 'spent' | 'bonus' | 'penalty'
          amount: number
          description: string
          reference_id?: string | null
          reference_type?: 'mission' | 'campaign' | 'referral' | 'admin' | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'earned' | 'spent' | 'bonus' | 'penalty'
          amount?: number
          description?: string
          reference_id?: string | null
          reference_type?: 'mission' | 'campaign' | 'referral' | 'admin' | null
          created_at?: string
        }
      }

      // Withdrawals
      withdrawals: {
        Row: {
          id: string
          user_id: string
          amount: number
          points_used: number
          method: 'bank_transfer' | 'paypal' | 'gift_card'
          account_info: Json
          status: 'pending' | 'processing' | 'completed' | 'rejected' | 'cancelled'
          admin_notes: string | null
          processed_by: string | null
          requested_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          points_used: number
          method: 'bank_transfer' | 'paypal' | 'gift_card'
          account_info: Json
          status?: 'pending' | 'processing' | 'completed' | 'rejected' | 'cancelled'
          admin_notes?: string | null
          processed_by?: string | null
          requested_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          points_used?: number
          method?: 'bank_transfer' | 'paypal' | 'gift_card'
          account_info?: Json
          status?: 'pending' | 'processing' | 'completed' | 'rejected' | 'cancelled'
          admin_notes?: string | null
          processed_by?: string | null
          requested_at?: string
          processed_at?: string | null
        }
      }

      // Announcements
      announcements: {
        Row: {
          id: string
          title: string
          content: string
          type: 'general' | 'maintenance' | 'event' | 'update' | 'warning' | 'guide'
          is_important: boolean
          target_audience: 'all' | 'users' | 'advertisers' | 'admins'
          image_url: string | null
          link_url: string | null
          is_active: boolean
          published_at: string | null
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          type: 'general' | 'maintenance' | 'event' | 'update' | 'warning' | 'guide'
          is_important?: boolean
          target_audience: 'all' | 'users' | 'advertisers' | 'admins'
          image_url?: string | null
          link_url?: string | null
          is_active?: boolean
          published_at?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          type?: 'general' | 'maintenance' | 'event' | 'update' | 'warning' | 'guide'
          is_important?: boolean
          target_audience?: 'all' | 'users' | 'advertisers' | 'admins'
          image_url?: string | null
          link_url?: string | null
          is_active?: boolean
          published_at?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      // System Settings
      system_settings: {
        Row: {
          id: string
          key: string
          value: Json
          description: string | null
          category: 'payment' | 'mission' | 'referral' | 'system' | 'email' | 'security'
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: Json
          description?: string | null
          category: 'payment' | 'mission' | 'referral' | 'system' | 'email' | 'security'
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: Json
          description?: string | null
          category?: 'payment' | 'mission' | 'referral' | 'system' | 'email' | 'security'
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
      }

      // Community Posts
      community_posts: {
        Row: {
          id: string
          user_id: string
          author_name: string
          content: string
          category: string
          image_url: string | null
          is_pinned: boolean
          is_trending: boolean
          likes_count: number
          comments_count: number
          views_count: number
          reports_count: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          author_name: string
          content: string
          category?: string
          image_url?: string | null
          is_pinned?: boolean
          is_trending?: boolean
          likes_count?: number
          comments_count?: number
          views_count?: number
          reports_count?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          author_name?: string
          content?: string
          category?: string
          image_url?: string | null
          is_pinned?: boolean
          is_trending?: boolean
          likes_count?: number
          comments_count?: number
          views_count?: number
          reports_count?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }

      // Community Comments
      community_comments: {
        Row: {
          id: string
          post_id: string
          user_id: string
          author_name: string
          content: string
          parent_comment_id: string | null
          likes_count: number
          reports_count: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          author_name: string
          content: string
          parent_comment_id?: string | null
          likes_count?: number
          reports_count?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          author_name?: string
          content?: string
          parent_comment_id?: string | null
          likes_count?: number
          reports_count?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }

      // Community Likes
      community_likes: {
        Row: {
          id: string
          user_id: string
          target_type: string
          target_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          target_type: string
          target_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          target_type?: string
          target_id?: string
          created_at?: string
        }
      }

      // Community Reports
      community_reports: {
        Row: {
          id: string
          user_id: string
          target_type: string
          target_id: string
          reason: string
          description: string | null
          status: string
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          target_type: string
          target_id: string
          reason: string
          description?: string | null
          status?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          target_type?: string
          target_id?: string
          reason?: string
          description?: string | null
          status?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'user' | 'advertiser' | 'admin' | 'support'
      advertiser_status: 'pending' | 'active' | 'suspended' | 'rejected'
      company_size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise'
      campaign_status: 'draft' | 'active' | 'paused' | 'completed' | 'rejected'
      reward_type: 'points' | 'cash'
      mission_difficulty: 'easy' | 'medium' | 'hard'
      mission_status: 'started' | 'in_progress' | 'submitted' | 'completed' | 'rejected'
      transaction_type: 'earned' | 'spent' | 'bonus' | 'penalty'
      reference_type: 'mission' | 'campaign' | 'referral' | 'admin'
      withdrawal_method: 'bank_transfer' | 'paypal' | 'gift_card'
      withdrawal_status: 'pending' | 'processing' | 'completed' | 'rejected' | 'cancelled'
      announcement_type: 'general' | 'maintenance' | 'event' | 'update' | 'warning' | 'guide'
      target_audience: 'all' | 'users' | 'advertisers' | 'admins'
      setting_category: 'payment' | 'mission' | 'referral' | 'system' | 'email' | 'security'
      community_post_category: 'general' | 'question' | 'tip' | 'success' | 'review' | 'free'
      community_target_type: 'post' | 'comment'
      community_report_status: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
      community_report_reason: 'spam' | 'inappropriate' | 'harassment' | 'false_information' | 'other'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']  
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

// Specific type exports for convenience
export type UserProfile = Tables<'user_profiles'>
export type UserLevel = Tables<'user_levels'>
export type AdvertiserProfile = Tables<'advertiser_profiles'>
export type Category = Tables<'categories'>
export type Campaign = Tables<'campaigns'>
export type Mission = Tables<'missions'>
export type UserMission = Tables<'user_missions'>
export type PointTransaction = Tables<'point_transactions'>
export type Withdrawal = Tables<'withdrawals'>
export type Announcement = Tables<'announcements'>
export type SystemSetting = Tables<'system_settings'>

// Community types
export type CommunityPost = Tables<'community_posts'>
export type CommunityComment = Tables<'community_comments'>
export type CommunityLike = Tables<'community_likes'>
export type CommunityReport = Tables<'community_reports'>

// Enum type exports
export type UserRole = Enums<'user_role'>
export type AdvertiserStatus = Enums<'advertiser_status'>
export type CompanySize = Enums<'company_size'>
export type CampaignStatus = Enums<'campaign_status'>
export type RewardType = Enums<'reward_type'>
export type MissionDifficulty = Enums<'mission_difficulty'>
export type MissionStatus = Enums<'mission_status'>
export type TransactionType = Enums<'transaction_type'>
export type ReferenceType = Enums<'reference_type'>
export type WithdrawalMethod = Enums<'withdrawal_method'>
export type WithdrawalStatus = Enums<'withdrawal_status'>
export type AnnouncementType = Enums<'announcement_type'>
export type TargetAudience = Enums<'target_audience'>
export type SettingCategory = Enums<'setting_category'>

// Community enum types
export type CommunityPostCategory = Enums<'community_post_category'>
export type CommunityTargetType = Enums<'community_target_type'>
export type CommunityReportStatus = Enums<'community_report_status'>
export type CommunityReportReason = Enums<'community_report_reason'>

// Custom types for API responses
export interface CampaignWithDetails extends Campaign {
  advertiser_profiles?: Pick<AdvertiserProfile, 'company_name'>
  categories?: Pick<Category, 'name' | 'icon_url' | 'color'>
  missions?: Mission[]
}

export interface UserMissionWithDetails extends UserMission {
  missions?: Mission
  campaigns?: Campaign
}

export interface UserProfileWithLevel extends UserProfile {
  user_levels?: UserLevel
}

// Community custom types
export interface CommunityPostWithDetails extends CommunityPost {
  user_profiles?: Pick<UserProfile, 'full_name' | 'avatar_url' | 'current_level'>
  community_comments?: CommunityComment[]
  is_liked?: boolean
  is_reported?: boolean
}

export interface CommunityCommentWithDetails extends CommunityComment {
  user_profiles?: Pick<UserProfile, 'full_name' | 'avatar_url' | 'current_level'>
  replies?: CommunityCommentWithDetails[]
  is_liked?: boolean
  is_reported?: boolean
}

// Auth types
export interface AuthUser {
  id: string
  email?: string
  user_metadata?: {
    full_name?: string
    avatar_url?: string
  }
}

// API Response types
export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  limit: number
  hasMore: boolean
}