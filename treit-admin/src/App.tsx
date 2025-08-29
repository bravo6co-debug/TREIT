import React, { useState, useEffect } from 'react'
import { LoginPage } from './components/LoginPage'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { Dashboard } from './components/Dashboard'
import { UserManagement } from './components/UserManagement'
import { AdvertiserManagement } from './components/AdvertiserManagement'
import { CampaignManagement } from './components/CampaignManagement'
import { FraudDetection } from './components/FraudDetection'
import { FinancialOverview } from './components/FinancialOverview'
import { SystemMonitor } from './components/SystemMonitor'
import { Reports } from './components/Reports'
import { SettlementManagement } from './components/SettlementManagement'
import { AdminManagement } from './components/AdminManagement'
import { Shield } from 'lucide-react'
import { Toaster } from './components/ui/sonner'
import { toast } from 'sonner'

interface AdminUser {
  id: string
  name: string
  role: string
  permissions: string[]
  department: string
  loginTime: string
  sessionId: string
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null)
  const [sessionTimeout, setSessionTimeout] = useState<number | null>(null)

  // 5초마다 실시간 데이터 업데이트 시뮬레이션
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  // 30분 자동 로그아웃 타이머
  useEffect(() => {
    if (currentAdmin) {
      // 기존 타이머 클리어
      if (sessionTimeout) {
        clearTimeout(sessionTimeout)
      }

      // 30분 후 자동 로그아웃
      const timeout = setTimeout(() => {
        handleLogout('session_expired')
      }, 30 * 60 * 1000) // 30분

      setSessionTimeout(timeout)

      return () => {
        clearTimeout(timeout)
      }
    }
  }, [currentAdmin])

  // 로그인 처리
  const handleLogin = (adminData: AdminUser) => {
    setCurrentAdmin(adminData)
    setActiveTab('dashboard')
  }

  // 로그아웃 처리
  const handleLogout = (reason?: string) => {
    if (sessionTimeout) {
      clearTimeout(sessionTimeout)
    }
    
    setCurrentAdmin(null)
    setActiveTab('dashboard')
    
    if (reason === 'session_expired') {
      toast.error('세션이 만료되어 자동 로그아웃되었습니다.')
    } else {
      toast.success('로그아웃되었습니다.')
    }
  }

  // 권한 확인 함수
  const hasPermission = (permission: string): boolean => {
    if (!currentAdmin) return false
    if (currentAdmin.permissions.includes('all')) return true
    return currentAdmin.permissions.includes(permission)
  }

  // 로그인되지 않은 경우 로그인 페이지 표시
  if (!currentAdmin) {
    return <LoginPage onLogin={handleLogin} />
  }

  const renderMainContent = () => {
    // 권한이 없는 경우 접근 거부 메시지 표시
    const checkPermissionAndRender = (permission: string, component: React.ReactNode) => {
      if (!hasPermission(permission)) {
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Shield className="w-16 h-16 text-gray-400" />
            <h3 className="text-lg font-medium">접근 권한이 없습니다</h3>
            <p className="text-sm text-muted-foreground">
              이 페이지에 접근하려면 적절한 권한이 필요합니다.
            </p>
            <p className="text-xs text-muted-foreground">
              현재 권한: {currentAdmin?.role === 'super_admin' ? '슈퍼관리자' : currentAdmin?.permissions.join(', ')}
            </p>
          </div>
        )
      }
      return component
    }

    switch (activeTab) {
      case 'dashboard':
        return checkPermissionAndRender('dashboard', <Dashboard />)
      
      case 'analytics':
        return checkPermissionAndRender('analytics', <Reports />)
      
      case 'fraud-detection':
        return checkPermissionAndRender('fraud-detection', <FraudDetection />)
      
      case 'financial':
        return checkPermissionAndRender('financial', <FinancialOverview />)
        
      case 'users':
        return checkPermissionAndRender('users', <UserManagement />)
        
      case 'advertisers':
        return checkPermissionAndRender('advertisers', <AdvertiserManagement />)
        
      case 'campaigns':
        return checkPermissionAndRender('campaigns', <CampaignManagement />)
        
      case 'settlement':
        return checkPermissionAndRender('settlement', <SettlementManagement />)
        
      case 'system':
        return checkPermissionAndRender('system', <SystemMonitor />)
      
      case 'reports':
        return checkPermissionAndRender('reports', <Reports />)

      case 'admin':
        return checkPermissionAndRender('all', <AdminManagement />)
        
      case 'settings':
        return (
          <div className="space-y-6">
            <h2>설정</h2>
            <div className="p-8 text-center text-muted-foreground">
              설정 페이지는 개발 중입니다.
            </div>
          </div>
        )
        
      case 'help':
        return (
          <div className="space-y-6">
            <h2>도움말</h2>
            <div className="p-8 text-center text-muted-foreground">
              도움말 페이지는 개발 중입니다.
            </div>
          </div>
        )
        
      default:
        return <div>페이지를 찾을 수 없습니다.</div>
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        currentAdmin={currentAdmin}
        hasPermission={hasPermission}
      />
      
      <div className="flex-1 flex flex-col">
        <Header 
          currentAdmin={currentAdmin}
          onLogout={handleLogout}
        />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold mb-1">
                  {activeTab === 'dashboard' && '대시보드 개요'}
                  {activeTab === 'analytics' && '실시간 분석'}
                  {activeTab === 'users' && '유저 관리'}
                  {activeTab === 'advertisers' && '광고주 관리'}
                  {activeTab === 'campaigns' && '캠페인 관리'}
                  {activeTab === 'fraud-detection' && '어뷰징 감지'}
                  {activeTab === 'financial' && '재무 관리'}
                  {activeTab === 'system' && '시스템 모니터링'}
                  {activeTab === 'reports' && '리포트 관리'}
                  {activeTab === 'settlement' && '정산 관리'}
                  {activeTab === 'admin' && '관리자 관리'}
                  {activeTab === 'settings' && '설정'}
                  {activeTab === 'help' && '도움말'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  마지막 업데이트: {currentTime.toLocaleString('ko-KR')} | 
                  접속자: {currentAdmin?.name} ({currentAdmin?.role === 'super_admin' ? '슈퍼관리자' : currentAdmin?.role})
                </p>
              </div>
            </div>
            
            {renderMainContent()}
          </div>
        </main>
      </div>
      
      <Toaster />
    </div>
  )
}