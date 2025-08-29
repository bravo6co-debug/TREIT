import { useState, useEffect } from 'react'
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from './components/ui/sidebar'
import { Dashboard } from './components/Dashboard'
import { CampaignAdd } from './components/CampaignAdd'
import { CampaignDetails } from './components/CampaignDetails'
import { CampaignList } from './components/CampaignList'
import { CampaignAnalytics } from './components/CampaignAnalytics'
import { BudgetManager } from './components/BudgetManager'
import { BillingHistory } from './components/BillingHistory'
import { PaymentModal } from './components/PaymentModal'
import { LandingPage } from './components/LandingPage'
import { AuthPage } from './components/AuthPage'
import { PaymentPage } from './components/PaymentPage'
import { Toaster } from './components/ui/sonner'
import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './components/ui/dropdown-menu'
import { BarChart3, Plus, Eye, Menu, Zap, List, PieChart, Wallet, Receipt, Bell, User, Settings, LogOut, CreditCard } from 'lucide-react'
import { realtime } from './lib/supabase'
import { toast } from 'sonner'

type Page = 'landing' | 'auth' | 'dashboard' | 'campaigns' | 'add-campaign' | 'campaign-details' | 'analytics' | 'budget' | 'billing' | 'payment'

interface User {
  id: string
  email: string
  name: string
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('landing')
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null)
  const [user, setUser] = useState<User | null>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [currentBalance, setCurrentBalance] = useState(500000)

  const menuItems = [
    {
      id: 'dashboard' as Page,
      title: '대시보드',
      icon: BarChart3,
    },
    {
      id: 'campaigns' as Page,
      title: '캠페인 관리',
      icon: List,
    },
    {
      id: 'add-campaign' as Page,
      title: '캠페인 추가',
      icon: Plus,
    },
    {
      id: 'analytics' as Page,
      title: '분석 리포트',
      icon: PieChart,
    },
    {
      id: 'budget' as Page,
      title: '예산 관리',
      icon: Wallet,
    },
    {
      id: 'billing' as Page,
      title: '결제 내역',
      icon: Receipt,
    },
  ]

  // 실시간 알림 구독
  useEffect(() => {
    if (!user) return

    const subscriptions = [
      // 클릭 알림 구독
      realtime.subscribeToAdvertiserClicks(user.id, (payload) => {
        const newNotification = {
          id: Date.now(),
          type: 'click',
          message: '새로운 클릭이 발생했습니다!',
          timestamp: new Date().toISOString(),
          read: false
        }
        setNotifications(prev => [newNotification, ...prev])
        setUnreadCount(prev => prev + 1)
        toast.success('새로운 클릭이 발생했습니다!')
      }),

      // 거래 알림 구독
      realtime.subscribeToAdvertiserTransactions(user.id, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newNotification = {
            id: Date.now(),
            type: 'transaction',
            message: '새로운 거래가 처리되었습니다.',
            timestamp: new Date().toISOString(),
            read: false
          }
          setNotifications(prev => [newNotification, ...prev])
          setUnreadCount(prev => prev + 1)
          toast.info('새로운 거래가 처리되었습니다.')
        }
      }),

      // 예산 알림 구독
      realtime.subscribeToBudgetAlerts(user.id, (payload) => {
        const newNotification = {
          id: Date.now(),
          type: 'budget',
          message: '예산 알림이 발생했습니다.',
          timestamp: new Date().toISOString(),
          read: false
        }
        setNotifications(prev => [newNotification, ...prev])
        setUnreadCount(prev => prev + 1)
        toast.warning('예산 알림이 발생했습니다.')
      })
    ]

    return () => {
      subscriptions.forEach(subscription => {
        subscription.unsubscribe()
      })
    }
  }, [user])

  const handlePaymentSuccess = (amount: number, transactionId: string) => {
    setCurrentBalance(prev => prev + amount)
    setIsPaymentModalOpen(false)
    toast.success(`₩${amount.toLocaleString()}가 성공적으로 충전되었습니다!`)
  }

  const renderPage = () => {
    // 비로그인 페이지들
    if (!user) {
      switch (currentPage) {
        case 'landing':
          return <LandingPage onGetStarted={() => setCurrentPage('auth')} />
        case 'auth':
          return <AuthPage onSuccess={(userData) => {
            setUser(userData)
            setCurrentPage('dashboard')
          }} onBack={() => setCurrentPage('landing')} />
        default:
          return <LandingPage onGetStarted={() => setCurrentPage('auth')} />
      }
    }

    // 로그인된 사용자 페이지들
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onViewDetails={(campaign) => {
          setSelectedCampaign(campaign)
          setCurrentPage('campaign-details')
        }} />
      case 'campaigns':
        return <CampaignList 
          onViewDetails={(campaign) => {
            setSelectedCampaign(campaign)
            setCurrentPage('campaign-details')
          }}
          onEditCampaign={(campaign) => {
            setSelectedCampaign(campaign)
            setCurrentPage('add-campaign')
          }}
          onCreateCampaign={() => setCurrentPage('add-campaign')}
        />
      case 'add-campaign':
        return <CampaignAdd onSuccess={() => setCurrentPage('campaigns')} />
      case 'campaign-details':
        if (!selectedCampaign) {
          setCurrentPage('campaigns')
          return <CampaignList 
            onViewDetails={(campaign) => {
              setSelectedCampaign(campaign)
              setCurrentPage('campaign-details')
            }}
            onCreateCampaign={() => setCurrentPage('add-campaign')}
          />
        }
        return <CampaignDetails campaign={selectedCampaign} onBack={() => {
          setSelectedCampaign(null)
          setCurrentPage('campaigns')
        }} />
      case 'analytics':
        return <CampaignAnalytics />
      case 'budget':
        return <BudgetManager 
          currentBalance={currentBalance}
          onAddFunds={(amount) => {
            setIsPaymentModalOpen(true)
          }}
        />
      case 'billing':
        return <BillingHistory userId={user.id} />
      case 'payment':
        return <PaymentPage onSuccess={() => setCurrentPage('dashboard')} onBack={() => setCurrentPage('dashboard')} />
      default:
        return <Dashboard onViewDetails={(campaign) => {
          setSelectedCampaign(campaign)
          setCurrentPage('campaign-details')
        }} />
    }
  }

  // 비로그인 상태에서는 사이드바 없이 렌더링
  if (!user) {
    return (
      <div className="min-h-screen w-full">
        {renderPage()}
        <Toaster />
      </div>
    )
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarContent>
            <div className="p-6 border-b">
              <h2>캠페인 관리</h2>
              <p className="text-sm text-muted-foreground mt-1">{user.name}</p>
            </div>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => setCurrentPage(item.id)}
                        isActive={currentPage === item.id}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <div className="mt-auto p-6 border-t">
              <button 
                onClick={() => {
                  setUser(null)
                  setCurrentPage('landing')
                }}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                로그아웃
              </button>
            </div>
          </SidebarContent>
        </Sidebar>
        
        <main className="flex-1 flex flex-col">
          <header className="flex items-center justify-between px-6 py-4 border-b bg-white/95 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div>
                <h1 className="text-xl font-semibold">Tre-it 캠페인 관리 대시보드</h1>
                <p className="text-sm text-muted-foreground">현재 잔액: ₩{currentBalance.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* 알림 버튼 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="relative">
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <div className="p-2">
                    <h4 className="font-medium">알림</h4>
                    {notifications.length === 0 ? (
                      <p className="text-sm text-muted-foreground mt-2">새로운 알림이 없습니다.</p>
                    ) : (
                      <div className="mt-2 space-y-2 max-h-80 overflow-y-auto">
                        {notifications.slice(0, 5).map((notification) => (
                          <div key={notification.id} className="p-2 bg-muted rounded text-sm">
                            <p>{notification.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(notification.timestamp).toLocaleString('ko-KR')}
                            </p>
                          </div>
                        ))}
                        {notifications.length > 5 && (
                          <p className="text-xs text-center text-muted-foreground">
                            +{notifications.length - 5}개 더 보기
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* 충전하기 버튼 */}
              <Button 
                onClick={() => setIsPaymentModalOpen(true)}
                className="flex items-center gap-2"
                size="sm"
              >
                <CreditCard className="w-4 h-4" />
                충전하기
              </Button>

              {/* 사용자 메뉴 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {user.name}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Settings className="w-4 h-4 mr-2" />
                    계정 설정
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => {
                    setUser(null)
                    setCurrentPage('landing')
                    setNotifications([])
                    setUnreadCount(0)
                  }}>
                    <LogOut className="w-4 h-4 mr-2" />
                    로그아웃
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          
          <div className="flex-1 p-6">
            {renderPage()}
          </div>
        </main>
      </div>
      
      {/* 결제 모달 */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onOpenChange={setIsPaymentModalOpen}
        onSuccess={handlePaymentSuccess}
      />
      
      <Toaster />
    </SidebarProvider>
  )
}