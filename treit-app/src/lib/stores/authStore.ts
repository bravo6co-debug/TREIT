import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { auth, db } from '../supabase';
import { toast } from 'sonner';

export interface User {
  id: string;
  auth_uid: string;
  email: string;
  nickname?: string;
  full_name?: string;
  phone?: string;
  level?: number;
  xp?: number;
  grade?: string;
  total_clicks?: number;
  valid_clicks?: number;
  total_earnings?: number;
  available_balance?: number;
}

interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  session: any;
  
  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, userData: { full_name?: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: false,
      session: null,

      // Login action
      login: async (email: string, password: string) => {
        set({ isLoading: true });
        
        try {
          const { data, error } = await auth.signIn(email, password);
          
          if (error) {
            let errorMessage = '로그인에 실패했습니다';
            
            // Provide specific error messages
            if (error.message.includes('Invalid login credentials')) {
              errorMessage = '이메일 또는 비밀번호가 잘못되었습니다';
            } else if (error.message.includes('Email not confirmed')) {
              errorMessage = '이메일 인증이 필요합니다. 이메일을 확인해주세요';
            } else if (error.message.includes('Too many requests')) {
              errorMessage = '너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요';
            } else {
              errorMessage += ': ' + error.message;
            }
            
            toast.error(errorMessage);
            return false;
          }
          
          if (data.user) {
            
            // Fetch user profile from database
            const userProfile = await get().fetchUserProfile(data.user.id);
            
            if (userProfile) {
              set({
                user: userProfile,
                isAuthenticated: true,
                session: data.session,
                isLoading: false
              });
              
              toast.success('로그인 성공!');
              return true;
            } else {
              toast.error('사용자 정보를 불러오는데 실패했습니다');
              return false;
            }
          }
          
          return false;
        } catch (error) {
          toast.error('로그인 중 예상치 못한 오류가 발생했습니다');
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      // Signup action
      signup: async (email: string, password: string, userData: { full_name?: string, phone?: string }) => {
        set({ isLoading: true });
        
        try {
          const { data, error } = await auth.signUp(email, password, userData);
          
          if (error) {
            let errorMessage = '회원가입에 실패했습니다';
            
            // Provide specific error messages
            if (error.message.includes('User already registered')) {
              errorMessage = '이미 등록된 이메일입니다';
            } else if (error.message.includes('Password should be')) {
              errorMessage = '비밀번호는 최소 6자 이상이어야 합니다';
            } else if (error.message.includes('Unable to validate email')) {
              errorMessage = '유효하지 않은 이메일 주소입니다';
            } else {
              errorMessage += ': ' + error.message;
            }
            
            toast.error(errorMessage);
            return false;
          }
          
          if (data.user) {
            
            // Create user profile in users table immediately
            try {
              const newUserData = {
                auth_uid: data.user.id,
                email: email,
                full_name: userData.full_name || '',
                phone: userData.phone || ''
              };
              
              
              const { data: userProfile, error: profileError } = await db.createUserProfile(newUserData);
              
              if (profileError) {
                // Don't fail signup if profile creation fails - user can still log in
                if (data.session) {
                  toast.success('회원가입 완료! 프로필 설정은 나중에 완료할 수 있습니다.');
                } else {
                  toast.success('회원가입 성공! 이메일을 확인하고 인증을 완료해주세요.');
                }
              } else {
                if (data.session) {
                  toast.success('회원가입 완료!');
                } else {
                  toast.success('회원가입 성공! 이메일을 확인하고 인증을 완료해주세요.');
                }
              }
            } catch (profileError) {
              if (data.session) {
                toast.success('회원가입 완료! 프로필 설정은 나중에 완료할 수 있습니다.');
              } else {
                toast.success('회원가입 성공! 이메일을 확인하고 인증을 완료해주세요.');
              }
            }
            
            return true;
          }
          
          return false;
        } catch (error) {
          toast.error('회원가입 중 예상치 못한 오류가 발생했습니다');
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      // Logout action
      logout: async () => {
        set({ isLoading: true });
        
        try {
          const { error } = await auth.signOut();
          
          if (error) {
            toast.error('로그아웃에 실패했습니다: ' + error.message);
          } else {
            set({
              user: null,
              isAuthenticated: false,
              session: null,
              isLoading: false
            });
            
            toast.success('로그아웃되었습니다');
          }
        } catch (error) {
          toast.error('로그아웃 중 오류가 발생했습니다');
        } finally {
          set({ isLoading: false });
        }
      },

      // Check authentication status
      checkAuth: async () => {
        set({ isLoading: true });
        
        try {
          const { session, error } = await auth.getSession();
          
          if (error) {
            set({
              user: null,
              isAuthenticated: false,
              session: null,
              isLoading: false
            });
            return;
          }
          
          if (session?.user) {
            // Fetch user profile from database
            const userProfile = await get().fetchUserProfile(session.user.id);
            
            set({
              user: userProfile,
              isAuthenticated: true,
              session: session,
              isLoading: false
            });
          } else {
            set({
              user: null,
              isAuthenticated: false,
              session: null,
              isLoading: false
            });
          }
        } catch (error) {
          set({
            user: null,
            isAuthenticated: false,
            session: null,
            isLoading: false
          });
        }
      },

      // Fetch user profile from database
      fetchUserProfile: async (authUid: string): Promise<User | null> => {
        try {
          
          // Try to get user profile from database first
          const { data: userProfile, error } = await db.getUserProfile(authUid);
          
          if (error) {
            
            // If user doesn't exist in users table, get info from auth session
            const { session } = await auth.getSession();
            if (session?.user) {
              // Create user profile in database
              const newUserData = {
                auth_uid: authUid,
                email: session.user.email || '',
                full_name: session.user.user_metadata?.full_name || '',
                phone: session.user.user_metadata?.phone || ''
              };
              
              const { data: createdProfile, error: createError } = await db.createUserProfile(newUserData);
              
              if (createError) {
                // Return basic profile with session data
                return {
                  id: '',
                  auth_uid: authUid,
                  email: session.user.email || '',
                  nickname: session.user.email?.split('@')[0] || '',
                  full_name: session.user.user_metadata?.full_name || '',
                  phone: session.user.user_metadata?.phone || '',
                  level: 1,
                  xp: 0,
                  grade: 'BRONZE',
                  total_clicks: 0,
                  valid_clicks: 0,
                  total_earnings: 0,
                  available_balance: 0
                };
              } else if (createdProfile) {
                return {
                  id: createdProfile.id,
                  auth_uid: createdProfile.auth_uid,
                  email: createdProfile.email,
                  nickname: createdProfile.nickname || '',
                  full_name: createdProfile.full_name || '',
                  phone: createdProfile.phone || '',
                  level: createdProfile.level || 1,
                  xp: createdProfile.xp || 0,
                  grade: createdProfile.grade || 'BRONZE',
                  total_clicks: createdProfile.total_clicks || 0,
                  valid_clicks: createdProfile.valid_clicks || 0,
                  total_earnings: createdProfile.total_earnings || 0,
                  available_balance: createdProfile.available_balance || 0
                };
              }
            }
            return null;
          } else if (userProfile) {
            return {
              id: userProfile.id,
              auth_uid: userProfile.auth_uid,
              email: userProfile.email,
              nickname: userProfile.nickname || '',
              full_name: userProfile.full_name || '',
              phone: userProfile.phone || '',
              level: userProfile.level || 1,
              xp: userProfile.xp || 0,
              grade: userProfile.grade || 'BRONZE',
              total_clicks: userProfile.total_clicks || 0,
              valid_clicks: userProfile.valid_clicks || 0,
              total_earnings: userProfile.total_earnings || 0,
              available_balance: userProfile.available_balance || 0
            };
          }
          
          return null;
        } catch (error) {
          return null;
        }
      },

      // Update user data
      updateUser: (userData: Partial<User>) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null
        }));
      },

      // Set loading state
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        session: state.session
      })
    }
  )
);
