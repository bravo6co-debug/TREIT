import React from 'react'
import { 
  BarChart3, 
  Users, 
  Building2, 
  Target, 
  Monitor, 
  Settings, 
  HelpCircle, 
  Home,
  ChevronRight,
  CreditCard,
  Shield,
  Lock,
  AlertTriangle,
  DollarSign,
  FileText
} from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { cn } from './ui/utils'

interface AdminUser {
  id: string
  name: string
  role: string
  permissions: string[]
  department: string
}

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  currentAdmin?: AdminUser | null
  hasPermission?: (permission: string) => boolean
}

const menuItems = [
  { 
    id: 'dashboard', 
    icon: Home, 
    label: '대시보드',
    permission: 'dashboard'
  },
  { 
    id: 'analytics', 
    icon: BarChart3, 
    label: '실시간 분석',
    permission: 'analytics'
  },
  { 
    id: 'users', 
    icon: Users, 
    label: '유저 관리',
    permission: 'users'
  },
  { 
    id: 'advertisers', 
    icon: Building2, 
    label: '광고주 관리',
    permission: 'advertisers'
  },
  { 
    id: 'campaigns', 
    icon: Target, 
    label: '캠페인 관리',
    permission: 'campaigns'
  },
  { 
    id: 'fraud-detection', 
    icon: AlertTriangle, 
    label: '어뷰징 감지',
    permission: 'fraud-detection',
    badge: 'NEW'
  },
  { 
    id: 'financial', 
    icon: DollarSign, 
    label: '재무 관리',
    permission: 'financial'
  },
  { 
    id: 'settlement', 
    icon: CreditCard, 
    label: '정산 관리',
    permission: 'settlement'
  },
  { 
    id: 'reports', 
    icon: FileText, 
    label: '리포트 관리',
    permission: 'reports'
  },
  { 
    id: 'system', 
    icon: Monitor, 
    label: '시스템 모니터링',
    permission: 'system'
  },
  { 
    id: 'admin', 
    icon: Shield, 
    label: '관리자 관리',
    permission: 'all',
    superAdminOnly: true
  },
  { 
    id: 'settings', 
    icon: Settings, 
    label: '설정',
    permission: 'all'
  },
  { 
    id: 'help', 
    icon: HelpCircle, 
    label: '도움말',
    permission: 'all'
  },
]

export function Sidebar({ activeTab, onTabChange, currentAdmin, hasPermission }: SidebarProps) {
  const getRoleName = (role: string) => {
    switch (role) {
      case 'super_admin': return '슈퍼관리자'
      case 'admin': return '일반관리자'
      case 'settlement_admin': return '정산관리자'
      case 'viewer': return '조회전용'
      default: return '알 수 없음'
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-700'
      case 'admin': return 'bg-blue-100 text-blue-700'
      case 'settlement_admin': return 'bg-green-100 text-green-700'
      case 'viewer': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  // 접근 가능한 메뉴 아이템 필터링
  const accessibleMenuItems = menuItems.filter(item => {
    if (!hasPermission) return true
    
    // 슈퍼관리자 전용 메뉴 체크
    if (item.superAdminOnly && currentAdmin?.role !== 'super_admin') {
      return false
    }
    
    // 권한 체크
    return hasPermission(item.permission)
  })

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border h-full flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          <span className="font-semibold text-sidebar-foreground">AdPlatform</span>
        </div>
        
        {/* 현재 로그인한 관리자 정보 */}
        {currentAdmin && (
          <div className="p-3 bg-sidebar-accent rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-3 h-3 text-sidebar-accent-foreground" />
              <span className="text-sm font-medium text-sidebar-accent-foreground">
                {currentAdmin.name}
              </span>
            </div>
            <Badge 
              variant="secondary" 
              className={`text-xs ${getRoleColor(currentAdmin.role)}`}
            >
              {getRoleName(currentAdmin.role)}
            </Badge>
            <div className="text-xs text-sidebar-accent-foreground/70 mt-1">
              {currentAdmin.department}
            </div>
          </div>
        )}
      </div>
      
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {accessibleMenuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            const hasAccess = !hasPermission || hasPermission(item.permission)
            
            return (
              <div key={item.id} className="relative">
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 h-10 px-3",
                    isActive 
                      ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                      : hasAccess
                        ? "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/40 cursor-not-allowed"
                  )}
                  onClick={() => hasAccess && onTabChange(item.id)}
                  disabled={!hasAccess}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                  {!hasAccess && <Lock className="w-3 h-3 ml-auto" />}
                  {isActive && hasAccess && <ChevronRight className="w-4 h-4 ml-auto" />}
                  {item.badge && (
                    <Badge variant="secondary" className="ml-auto text-xs bg-green-100 text-green-700">
                      {item.badge}
                    </Badge>
                  )}
                  {item.superAdminOnly && (
                    <Badge variant="secondary" className="ml-auto text-xs bg-purple-100 text-purple-700">
                      SA
                    </Badge>
                  )}
                </Button>
              </div>
            )
          })}
        </div>
        
        {/* 권한 정보 */}
        {currentAdmin && (
          <div className="mt-6 p-3 bg-sidebar-accent/50 rounded-lg">
            <div className="text-xs text-sidebar-foreground/70 mb-2">
              <strong>접근 권한:</strong>
            </div>
            <div className="text-xs text-sidebar-foreground/60">
              {currentAdmin.permissions.includes('all') 
                ? '모든 기능 접근 가능'
                : `${accessibleMenuItems.length}개 메뉴 접근 가능`
              }
            </div>
          </div>
        )}
      </nav>
      
      <div className="p-4 border-t border-sidebar-border">
        <div className="text-xs text-sidebar-foreground/60">
          <p>버전 2.1.0</p>
          <p>마지막 업데이트: 2025.01.15</p>
          {currentAdmin && (
            <p className="mt-1 text-sidebar-foreground/40">
              세션: {currentAdmin.id}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}