import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../../types/supabase'

// Supabase 환경 변수 - 환경변수에서 가져오기
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 환경변수 검증
if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable')
}
if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable')
}

console.log('Supabase configuration loaded:', {
  url: supabaseUrl,
  hasAnonKey: !!supabaseAnonKey
})

// Supabase 클라이언트 생성
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Auth helper functions
export const auth = {
  // Sign up new user
  signUp: async (email: string, password: string, userData?: { full_name?: string, phone?: string }) => {
    try {
      console.log('Auth.signUp called with:', { email, userData })
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      })
      
      if (error) {
        console.error('Supabase signUp error:', error)
        throw error
      }
      
      console.log('SignUp successful:', { 
        userId: data.user?.id, 
        email: data.user?.email,
        confirmed: data.user?.email_confirmed_at 
      })
      
      return { data, error: null }
    } catch (error) {
      console.error('Sign up error:', error)
      return { data: null, error }
    }
  },

  // Sign in user
  signIn: async (email: string, password: string) => {
    try {
      console.log('Auth.signIn called with email:', email)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        console.error('Supabase signIn error:', {
          message: error.message,
          status: error.status,
          cause: error.cause
        })
        throw error
      }
      
      console.log('SignIn successful:', { 
        userId: data.user?.id, 
        email: data.user?.email,
        sessionId: data.session?.access_token?.substring(0, 20) + '...' 
      })
      
      return { data, error: null }
    } catch (error) {
      console.error('Sign in error:', error)
      return { data: null, error }
    }
  },

  // Sign in with Google
  signInWithGoogle: async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        }
      })
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Google sign in error:', error)
      return { data: null, error }
    }
  },

  // Sign out user
  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('Sign out error:', error)
      return { error }
    }
  },

  // Get current session
  getSession: async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Get session error:', error)
        throw error
      }
      
      if (session) {
        console.log('Session found:', {
          userId: session.user?.id,
          email: session.user?.email,
          expiresAt: session.expires_at
        })
      } else {
        console.log('No active session found')
      }
      
      return { session, error: null }
    } catch (error) {
      console.error('Get session error:', error)
      return { session: null, error }
    }
  },

  // Get current user
  getUser: async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) throw error
      return { user, error: null }
    } catch (error) {
      console.error('Get user error:', error)
      return { user: null, error }
    }
  },

  // Reset password
  resetPassword: async (email: string) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Reset password error:', error)
      return { data: null, error }
    }
  },

  // Update password
  updatePassword: async (password: string) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: password
      })
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Update password error:', error)
      return { data: null, error }
    }
  },

  // Update user profile
  updateProfile: async (updates: { full_name?: string; phone?: string }) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: updates
      })
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Update profile error:', error)
      return { data: null, error }
    }
  }
}

// Database helper functions
export const db = {
  // Get user profile from users table
  getUserProfile: async (authUid: string) => {
    try {
      console.log('Fetching user profile for auth_uid:', authUid);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_uid', authUid)
        .single()
      
      if (error) {
        console.error('Error fetching from users table:', error);
        throw error;
      }
      
      console.log('User profile fetched:', data);
      return { data, error: null }
    } catch (error) {
      console.error('Get user profile error:', error)
      return { data: null, error }
    }
  },

  // Also export from method for direct access
  from: (table: string) => supabase.from(table),

  // Create user profile in users table
  createUserProfile: async (userData: {
    auth_uid: string;
    email: string;
    full_name?: string;
    phone?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([{
          auth_uid: userData.auth_uid,
          email: userData.email,
          full_name: userData.full_name || '',
          phone: userData.phone || '',
          nickname: userData.email?.split('@')[0] || `user_${Date.now()}`,
          level: 1,
          grade: 'BRONZE',
          xp: 0,
          total_clicks: 0,
          valid_clicks: 0,
          total_earnings: 0,
          available_balance: 0,
          status: 'ACTIVE'
        }])
        .select()
        .single()
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Create user profile error:', error)
      return { data: null, error }
    }
  },

  // Update user profile in users table
  updateUserProfile: async (authUid: string, updates: Partial<{
    full_name: string;
    phone: string;
    nickname: string;
    level: number;
    xp: number;
    total_clicks: number;
    valid_clicks: number;
    total_earnings: number;
    available_balance: number;
  }>) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('auth_uid', authUid)
        .select()
        .single()
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Update user profile error:', error)
      return { data: null, error }
    }
  }
}

// Export for backward compatibility
export { supabase as default }