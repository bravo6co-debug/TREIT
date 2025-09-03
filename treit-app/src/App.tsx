import React, { useState, useEffect } from 'react';
import { Home, FileText, Trophy, Users, Settings, LogOut } from 'lucide-react';
import HomeScreen from './components/HomeScreen';
import ProjectsScreen from './components/ProjectsScreen';
import PremiumProjectsScreen from './components/PremiumProjectsScreen';
import LevelUpScreen from './components/LevelUpScreen';
import CommunityScreen from './components/CommunityScreen';
import SettingsScreen from './components/SettingsScreen';
import LoginScreen from './components/LoginScreen';
import { Toaster } from './components/ui/sonner';
import { 
  PageErrorBoundary, 
  ComponentErrorBoundary, 
  NotificationProvider,
  initializeErrorHandler,
  useNotification
} from '@shared/error-handling';
import { useAuthStore } from './lib/stores/authStore';

type TabType = 'home' | 'projects' | 'premium-projects' | 'levelup' | 'community' | 'settings';

// 메인 앱 컴포넌트 (에러 처리 초기화)
function AppWithErrorHandling() {
  useEffect(() => {
    // 에러 핸들러 초기화
    initializeErrorHandler({
      enableLogging: true,
      enableReporting: process.env.NODE_ENV === 'production',
      logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'error',
      notificationConfig: {
        toast: true,
        modal: true,
        console: process.env.NODE_ENV === 'development'
      }
    })
  }, [])

  return (
    <NotificationProvider config={{ position: 'top-center', duration: 4000 }}>
      <PageErrorBoundary name="MainApp">
        <AppContent />
      </PageErrorBoundary>
    </NotificationProvider>
  )
}

// 앱 콘텐츠 컴포넌트
function AppContent() {
  const { isAuthenticated, checkAuth, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication on mount
  useEffect(() => {
    const initializeAuth = async () => {
      await checkAuth();
      setIsLoading(false);
    };
    
    initializeAuth();
  }, [checkAuth]);


  const handlePremiumProjectsNavigation = () => {
    setActiveTab('premium-projects');
  };

  const handleSettingsNavigation = () => {
    setActiveTab('settings');
  };

  const handleLogout = async () => {
    await logout();
    setActiveTab('home');
  };

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return (
          <ComponentErrorBoundary name="HomeScreen">
            <HomeScreen onNavigateToPremium={handlePremiumProjectsNavigation} onNavigateToSettings={handleSettingsNavigation} />
          </ComponentErrorBoundary>
        );
      case 'projects':
        return (
          <ComponentErrorBoundary name="ProjectsScreen">
            <ProjectsScreen />
          </ComponentErrorBoundary>
        );
      case 'premium-projects':
        return (
          <ComponentErrorBoundary name="PremiumProjectsScreen">
            <PremiumProjectsScreen onBack={() => setActiveTab('home')} />
          </ComponentErrorBoundary>
        );
      case 'levelup':
        return (
          <ComponentErrorBoundary name="LevelUpScreen">
            <LevelUpScreen />
          </ComponentErrorBoundary>
        );
      case 'community':
        return (
          <ComponentErrorBoundary name="CommunityScreen">
            <CommunityScreen />
          </ComponentErrorBoundary>
        );
      case 'settings':
        return (
          <ComponentErrorBoundary name="SettingsScreen">
            <SettingsScreen />
          </ComponentErrorBoundary>
        );
      default:
        return (
          <ComponentErrorBoundary name="HomeScreen">
            <HomeScreen onNavigateToPremium={handlePremiumProjectsNavigation} onNavigateToSettings={handleSettingsNavigation} />
          </ComponentErrorBoundary>
        );
    }
  };

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl font-semibold">TreIt 로딩 중...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <LoginScreen 
        onLoginSuccess={async () => {
          // Re-check authentication status instead of reloading
          await checkAuth();
        }}
        onSwitchToSignup={() => {}} // Not needed in this context
      />
    );
  }

  // Show main app if authenticated
  return (
    <div className="w-full max-w-md md:max-w-lg lg:max-w-xl mx-auto bg-white min-h-screen relative md:rounded-t-3xl shadow-2xl overflow-hidden">
      {/* Main Content */}
      <div className="pb-20">
        {renderScreen()}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md md:max-w-lg lg:max-w-xl bg-white border-t border-gray-200">
        <div className="flex justify-around py-2">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center p-3 min-h-[44px] transition-colors duration-200 ${
              activeTab === 'home' ? 'text-yellow-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Home size={24} />
            <span className="text-xs mt-1">홈</span>
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`flex flex-col items-center p-3 min-h-[44px] transition-colors duration-200 ${
              activeTab === 'projects' ? 'text-yellow-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText size={24} />
            <span className="text-xs mt-1">프로젝트</span>
          </button>
          <button
            onClick={() => setActiveTab('levelup')}
            className={`flex flex-col items-center p-3 min-h-[44px] transition-colors duration-200 ${
              activeTab === 'levelup' ? 'text-yellow-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Trophy size={24} />
            <span className="text-xs mt-1">레벨업</span>
          </button>
          <button
            onClick={() => setActiveTab('community')}
            className={`flex flex-col items-center p-3 min-h-[44px] transition-colors duration-200 ${
              activeTab === 'community' ? 'text-yellow-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users size={24} />
            <span className="text-xs mt-1">커뮤니티</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center p-3 min-h-[44px] transition-colors duration-200 ${
              activeTab === 'settings' ? 'text-yellow-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Settings size={24} />
            <span className="text-xs mt-1">설정</span>
          </button>
        </div>
      </div>

      
      {/* Toast notifications */}
      <Toaster />
    </div>
  );
}

// 기본 내보내기를 에러 처리가 포함된 컴포넌트로 변경
export default AppWithErrorHandling;