import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Switch } from './ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import { 
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, Plus, Settings, 
  CreditCard, Wallet, Target, Calendar, RefreshCw, Bell, BellOff,
  Zap, PiggyBank, ShieldCheck, Clock, Activity, Edit, Trash2
} from 'lucide-react'
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Progress } from './ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'

interface Campaign {
  id: string
  name: string
  dailyBudget: number
  totalBudget: number
  spent: number
  remainingBudget: number
  status: 'active' | 'paused' | 'completed'
  startDate: string
  endDate: string
}

interface BudgetRule {
  id: string
  name: string
  type: 'daily_limit' | 'campaign_limit' | 'auto_recharge' | 'budget_alert'
  value: number
  enabled: boolean
  campaignIds: string[]
  createdAt: string
}

interface AutoRechargeSettings {
  enabled: boolean
  threshold: number
  amount: number
  maxAmount: number
  paymentMethod: string
}

interface BudgetAlert {
  id: string
  type: 'low_budget' | 'overspend' | 'daily_limit' | 'campaign_complete'
  threshold: number
  enabled: boolean
  notificationMethod: 'email' | 'sms' | 'push'
}

interface BudgetManagerProps {
  campaigns?: Campaign[]
  currentBalance?: number
  onAddFunds?: (amount: number) => void
}

export function BudgetManager({ 
  campaigns = [], 
  currentBalance = 500000,
  onAddFunds 
}: BudgetManagerProps) {
  const [balance, setBalance] = useState(currentBalance)
  const [budgetRules, setBudgetRules] = useState<BudgetRule[]>([])
  const [autoRecharge, setAutoRecharge] = useState<AutoRechargeSettings>({
    enabled: false,
    threshold: 50000,
    amount: 200000,
    maxAmount: 1000000,
    paymentMethod: 'card'
  })
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>([])
  const [isAddFundsOpen, setIsAddFundsOpen] = useState(false)
  const [addFundsAmount, setAddFundsAmount] = useState(100000)
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<BudgetRule | null>(null)
  const [newRule, setNewRule] = useState({
    name: '',
    type: 'daily_limit' as const,
    value: 10000,
    campaignIds: [] as string[]
  })

  // Mock 데이터 생성
  useEffect(() => {
    // Budget Rules 초기화
    setBudgetRules([
      {
        id: '1',
        name: '일일 예산 한도',
        type: 'daily_limit',
        value: 50000,
        enabled: true,
        campaignIds: [],
        createdAt: '2024-12-01'
      },
      {
        id: '2',
        name: '겨울 캠페인 한도',
        type: 'campaign_limit',
        value: 200000,
        enabled: true,
        campaignIds: ['1'],
        createdAt: '2024-12-10'
      },
      {
        id: '3',
        name: '자동 충전',
        type: 'auto_recharge',
        value: 100000,
        enabled: autoRecharge.enabled,
        campaignIds: [],
        createdAt: '2024-11-15'
      }
    ])

    // Budget Alerts 초기화
    setBudgetAlerts([
      {
        id: '1',
        type: 'low_budget',
        threshold: 30000,
        enabled: true,
        notificationMethod: 'email'
      },
      {
        id: '2',
        type: 'overspend',
        threshold: 110,
        enabled: true,
        notificationMethod: 'push'
      },
      {
        id: '3',
        type: 'daily_limit',
        threshold: 90,
        enabled: false,
        notificationMethod: 'sms'
      }
    ])
  }, [autoRecharge.enabled])

  // Mock campaigns with budget data
  const mockCampaigns: Campaign[] = campaigns.length > 0 ? campaigns.map(c => ({
    ...c,
    dailyBudget: Math.floor(c.budget / 30),
    totalBudget: c.budget,
    remainingBudget: c.budget - c.spent
  })) : [
    {
      id: '1',
      name: '겨울 세일 캠페인',
      dailyBudget: 30000,
      totalBudget: 1000000,
      spent: 650000,
      remainingBudget: 350000,
      status: 'active',
      startDate: '2024-12-01',
      endDate: '2024-12-31'
    },
    {
      id: '2',
      name: '신제품 런칭',
      dailyBudget: 20000,
      totalBudget: 500000,
      spent: 500000,
      remainingBudget: 0,
      status: 'completed',
      startDate: '2024-11-01',
      endDate: '2024-11-30'
    },
    {
      id: '3',
      name: '브랜드 인지도',
      dailyBudget: 15000,
      totalBudget: 800000,
      spent: 200000,
      remainingBudget: 600000,
      status: 'paused',
      startDate: '2024-12-15',
      endDate: '2025-01-31'
    }
  ]

  // 일일 예산 사용 트렌드 (Mock 데이터)
  const dailyBudgetTrend = Array.from({ length: 30 }, (_, i) => {
    const date = addDays(new Date(), i - 29)
    const spent = Math.floor(Math.random() * 80000) + 20000
    const budget = 100000
    
    return {
      date: format(date, 'MM/dd', { locale: ko }),
      fullDate: format(date, 'yyyy-MM-dd'),
      spent,
      budget,
      utilization: (spent / budget) * 100
    }
  })

  // 캠페인별 예산 분포
  const campaignBudgetData = mockCampaigns.map(campaign => ({
    name: campaign.name,
    allocated: campaign.totalBudget,
    spent: campaign.spent,
    remaining: campaign.remainingBudget
  }))

  const totalAllocated = mockCampaigns.reduce((sum, c) => sum + c.totalBudget, 0)
  const totalSpent = mockCampaigns.reduce((sum, c) => sum + c.spent, 0)
  const totalRemaining = totalAllocated - totalSpent

  const handleAddFunds = async () => {
    try {
      if (onAddFunds) {
        await onAddFunds(addFundsAmount)
      }
      setBalance(prev => prev + addFundsAmount)
      setIsAddFundsOpen(false)
      toast.success(`₩${addFundsAmount.toLocaleString()}가 충전되었습니다.`)
    } catch (error) {
      toast.error('충전에 실패했습니다.')
    }
  }

  const handleSaveRule = () => {
    if (!newRule.name.trim()) {
      toast.error('규칙 이름을 입력해주세요.')
      return
    }

    const rule: BudgetRule = {
      id: editingRule?.id || Date.now().toString(),
      name: newRule.name,
      type: newRule.type,
      value: newRule.value,
      enabled: true,
      campaignIds: newRule.campaignIds,
      createdAt: new Date().toISOString()
    }

    if (editingRule) {
      setBudgetRules(prev => prev.map(r => r.id === editingRule.id ? rule : r))
      toast.success('예산 규칙이 수정되었습니다.')
    } else {
      setBudgetRules(prev => [...prev, rule])
      toast.success('예산 규칙이 추가되었습니다.')
    }

    setIsRuleDialogOpen(false)
    setEditingRule(null)
    setNewRule({
      name: '',
      type: 'daily_limit',
      value: 10000,
      campaignIds: []
    })
  }

  const handleDeleteRule = (ruleId: string) => {
    setBudgetRules(prev => prev.filter(r => r.id !== ruleId))
    toast.success('예산 규칙이 삭제되었습니다.')
  }

  const handleToggleRule = (ruleId: string) => {
    setBudgetRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    ))
  }

  const handleToggleAlert = (alertId: string) => {
    setBudgetAlerts(prev => prev.map(alert =>
      alert.id === alertId ? { ...alert, enabled: !alert.enabled } : alert
    ))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'paused': return 'bg-yellow-500'
      case 'completed': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  const getRuleTypeLabel = (type: string) => {
    switch (type) {
      case 'daily_limit': return '일일 한도'
      case 'campaign_limit': return '캠페인 한도'
      case 'auto_recharge': return '자동 충전'
      case 'budget_alert': return '예산 알림'
      default: return type
    }
  }

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'low_budget': return '잔액 부족'
      case 'overspend': return '예산 초과'
      case 'daily_limit': return '일일 한도'
      case 'campaign_complete': return '캠페인 완료'
      default: return type
    }
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">예산 관리</h2>
          <p className="text-muted-foreground">캠페인 예산을 효율적으로 관리하세요</p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isAddFundsOpen} onOpenChange={setIsAddFundsOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                충전하기
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>계정 충전</DialogTitle>
                <DialogDescription>
                  캠페인 실행을 위해 계정에 금액을 충전하세요.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>충전 금액</Label>
                  <div className="flex gap-2 mt-2">
                    {[50000, 100000, 200000, 500000].map(amount => (
                      <Button 
                        key={amount}
                        variant={addFundsAmount === amount ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAddFundsAmount(amount)}
                      >
                        {(amount / 10000).toFixed(0)}만원
                      </Button>
                    ))}
                  </div>
                  <Input
                    type="number"
                    value={addFundsAmount}
                    onChange={(e) => setAddFundsAmount(Number(e.target.value))}
                    className="mt-2"
                    min={10000}
                    step={10000}
                  />
                </div>
                
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <span>현재 잔액</span>
                    <span className="font-bold">₩{balance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span>충전 후 잔액</span>
                    <span className="font-bold text-primary">
                      ₩{(balance + addFundsAmount).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddFundsOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleAddFunds}>
                  ₩{addFundsAmount.toLocaleString()} 충전하기
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
        </div>
      </div>

      {/* 예산 현황 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">계정 잔액</p>
                <p className="text-2xl font-bold">₩{balance.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {balance < 100000 ? (
                    <span className="text-red-600 flex items-center">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      잔액 부족
                    </span>
                  ) : (
                    <span className="text-green-600">충분한 잔액</span>
                  )}
                </p>
              </div>
              <Wallet className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">총 할당 예산</p>
                <p className="text-2xl font-bold">₩{totalAllocated.toLocaleString()}</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {mockCampaigns.filter(c => c.status === 'active').length}개 활성 캠페인
                </p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">사용된 예산</p>
                <p className="text-2xl font-bold">₩{totalSpent.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  전체의 {((totalSpent / totalAllocated) * 100).toFixed(1)}%
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">남은 예산</p>
                <p className="text-2xl font-bold">₩{totalRemaining.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.ceil(totalRemaining / (totalSpent / 30))}일 운영 가능
                </p>
              </div>
              <PiggyBank className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 탭 네비게이션 */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid grid-cols-5 w-fit">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="campaigns">캠페인별</TabsTrigger>
          <TabsTrigger value="rules">예산 규칙</TabsTrigger>
          <TabsTrigger value="alerts">알림 설정</TabsTrigger>
          <TabsTrigger value="auto">자동화</TabsTrigger>
        </TabsList>

        {/* 개요 탭 */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 일일 예산 사용 트렌드 */}
            <Card>
              <CardHeader>
                <CardTitle>일일 예산 사용 트렌드</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    spent: { label: "사용 예산", color: "hsl(var(--chart-1))" },
                    budget: { label: "할당 예산", color: "hsl(var(--chart-2))" }
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyBudgetTrend}>
                      <XAxis dataKey="date" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line 
                        type="monotone" 
                        dataKey="spent" 
                        stroke="hsl(var(--chart-1))" 
                        strokeWidth={2}
                        name="사용 예산"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="budget" 
                        stroke="hsl(var(--chart-2))" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="할당 예산"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* 캠페인별 예산 분포 */}
            <Card>
              <CardHeader>
                <CardTitle>캠페인별 예산 분포</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    allocated: { label: "할당 예산", color: "hsl(var(--chart-1))" }
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={campaignBudgetData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="allocated"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                      >
                        {campaignBudgetData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* 예산 활용률 */}
          <Card>
            <CardHeader>
              <CardTitle>예산 활용률 현황</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockCampaigns.map((campaign, index) => {
                  const utilization = (campaign.spent / campaign.totalBudget) * 100
                  return (
                    <div key={campaign.id} className="flex items-center gap-4">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      ></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{campaign.name}</span>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(campaign.status)}>
                              {campaign.status === 'active' ? '활성' : 
                               campaign.status === 'paused' ? '일시정지' : '완료'}
                            </Badge>
                            <span className="font-bold">
                              ₩{campaign.spent.toLocaleString()} / ₩{campaign.totalBudget.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={utilization} className="flex-1 h-2" />
                          <span className="text-sm font-medium">{utilization.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 캠페인별 탭 */}
        <TabsContent value="campaigns" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {mockCampaigns.map((campaign) => (
              <Card key={campaign.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    <Badge className={getStatusColor(campaign.status)}>
                      {campaign.status === 'active' ? '활성' : 
                       campaign.status === 'paused' ? '일시정지' : '완료'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 예산 현황 */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">총 예산</span>
                      <span className="font-medium">₩{campaign.totalBudget.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">사용 예산</span>
                      <span className="font-medium">₩{campaign.spent.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">남은 예산</span>
                      <span className="font-medium text-green-600">₩{campaign.remainingBudget.toLocaleString()}</span>
                    </div>
                    <Progress value={(campaign.spent / campaign.totalBudget) * 100} className="h-2" />
                  </div>

                  {/* 일일 예산 */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">일일 예산</span>
                      <span className="font-medium">₩{campaign.dailyBudget.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">오늘 사용</span>
                      <span className="font-medium">₩{Math.floor(Math.random() * campaign.dailyBudget).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* 기간 정보 */}
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(parseISO(campaign.startDate), 'MM/dd', { locale: ko })} ~ {format(parseISO(campaign.endDate), 'MM/dd', { locale: ko })}
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Edit className="w-4 h-4 mr-1" />
                      예산 수정
                    </Button>
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 예산 규칙 탭 */}
        <TabsContent value="rules" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">예산 관리 규칙</h3>
              <p className="text-sm text-muted-foreground">자동화된 예산 관리를 위한 규칙을 설정하세요</p>
            </div>
            
            <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  규칙 추가
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{editingRule ? '규칙 수정' : '새 규칙 추가'}</DialogTitle>
                  <DialogDescription>
                    예산 관리를 자동화할 규칙을 설정하세요.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>규칙 이름</Label>
                    <Input
                      value={newRule.name}
                      onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="규칙 이름을 입력하세요"
                    />
                  </div>
                  
                  <div>
                    <Label>규칙 유형</Label>
                    <Select value={newRule.type} onValueChange={(value: any) => setNewRule(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily_limit">일일 예산 한도</SelectItem>
                        <SelectItem value="campaign_limit">캠페인 예산 한도</SelectItem>
                        <SelectItem value="auto_recharge">자동 충전</SelectItem>
                        <SelectItem value="budget_alert">예산 알림</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>
                      {newRule.type === 'daily_limit' ? '일일 한도 금액' :
                       newRule.type === 'campaign_limit' ? '캠페인 한도 금액' :
                       newRule.type === 'auto_recharge' ? '충전 금액' :
                       '알림 기준 금액'}
                    </Label>
                    <Input
                      type="number"
                      value={newRule.value}
                      onChange={(e) => setNewRule(prev => ({ ...prev, value: Number(e.target.value) }))}
                      min={1000}
                      step={1000}
                    />
                  </div>
                  
                  {newRule.type === 'campaign_limit' && (
                    <div>
                      <Label>적용 캠페인</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="캠페인을 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockCampaigns.map(campaign => (
                            <SelectItem key={campaign.id} value={campaign.id}>
                              {campaign.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsRuleDialogOpen(false)}>
                    취소
                  </Button>
                  <Button onClick={handleSaveRule}>
                    {editingRule ? '수정' : '추가'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {budgetRules.map((rule) => (
              <Card key={rule.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{rule.name}</h4>
                        <Badge variant="outline">{getRuleTypeLabel(rule.type)}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {rule.type === 'daily_limit' && `일일 최대 ₩${rule.value.toLocaleString()} 사용`}
                        {rule.type === 'campaign_limit' && `캠페인 최대 ₩${rule.value.toLocaleString()} 사용`}
                        {rule.type === 'auto_recharge' && `잔액 부족시 ₩${rule.value.toLocaleString()} 자동 충전`}
                        {rule.type === 'budget_alert' && `₩${rule.value.toLocaleString()} 미만시 알림`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        생성일: {format(parseISO(rule.createdAt), 'yyyy.MM.dd', { locale: ko })}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={() => handleToggleRule(rule.id)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingRule(rule)
                          setNewRule({
                            name: rule.name,
                            type: rule.type,
                            value: rule.value,
                            campaignIds: rule.campaignIds
                          })
                          setIsRuleDialogOpen(true)
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>규칙을 삭제하시겠습니까?</AlertDialogTitle>
                            <AlertDialogDescription>
                              이 작업은 되돌릴 수 없습니다. 규칙을 삭제하면 자동화 기능이 중단됩니다.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>취소</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteRule(rule.id)}>
                              삭제
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 알림 설정 탭 */}
        <TabsContent value="alerts" className="space-y-6">
          <div>
            <h3 className="text-lg font-medium">예산 알림 설정</h3>
            <p className="text-sm text-muted-foreground">예산 상황에 따른 알림을 설정하세요</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {budgetAlerts.map((alert) => (
              <Card key={alert.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{getAlertTypeLabel(alert.type)}</h4>
                        <Badge variant="outline" className="capitalize">
                          {alert.notificationMethod}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {alert.type === 'low_budget' && `잔액이 ₩${alert.threshold.toLocaleString()} 미만일 때`}
                        {alert.type === 'overspend' && `예산의 ${alert.threshold}% 초과 사용시`}
                        {alert.type === 'daily_limit' && `일일 예산의 ${alert.threshold}% 사용시`}
                        {alert.type === 'campaign_complete' && '캠페인 완료시'}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {alert.enabled ? (
                        <Bell className="w-4 h-4 text-primary" />
                      ) : (
                        <BellOff className="w-4 h-4 text-muted-foreground" />
                      )}
                      <Switch
                        checked={alert.enabled}
                        onCheckedChange={() => handleToggleAlert(alert.id)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 자동화 탭 */}
        <TabsContent value="auto" className="space-y-6">
          <div>
            <h3 className="text-lg font-medium">자동 충전 설정</h3>
            <p className="text-sm text-muted-foreground">잔액이 부족할 때 자동으로 충전되도록 설정하세요</p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  <span className="font-medium">자동 충전 활성화</span>
                </div>
                <Switch
                  checked={autoRecharge.enabled}
                  onCheckedChange={(enabled) => setAutoRecharge(prev => ({ ...prev, enabled }))}
                />
              </div>

              {autoRecharge.enabled && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>충전 기준 금액</Label>
                      <Input
                        type="number"
                        value={autoRecharge.threshold}
                        onChange={(e) => setAutoRecharge(prev => ({ ...prev, threshold: Number(e.target.value) }))}
                        placeholder="50000"
                        min={10000}
                        step={10000}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        잔액이 이 금액 이하가 되면 자동 충전됩니다
                      </p>
                    </div>
                    
                    <div>
                      <Label>충전 금액</Label>
                      <Input
                        type="number"
                        value={autoRecharge.amount}
                        onChange={(e) => setAutoRecharge(prev => ({ ...prev, amount: Number(e.target.value) }))}
                        placeholder="200000"
                        min={50000}
                        step={10000}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        한 번에 충전할 금액
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>월 최대 충전 한도</Label>
                      <Input
                        type="number"
                        value={autoRecharge.maxAmount}
                        onChange={(e) => setAutoRecharge(prev => ({ ...prev, maxAmount: Number(e.target.value) }))}
                        placeholder="1000000"
                        min={autoRecharge.amount}
                        step={100000}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        한 달에 자동 충전할 수 있는 최대 금액
                      </p>
                    </div>
                    
                    <div>
                      <Label>결제 수단</Label>
                      <Select
                        value={autoRecharge.paymentMethod}
                        onValueChange={(value) => setAutoRecharge(prev => ({ ...prev, paymentMethod: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="card">신용카드</SelectItem>
                          <SelectItem value="bank">계좌이체</SelectItem>
                          <SelectItem value="digital">디지털 머니</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h5 className="font-medium text-blue-800">자동 충전 설정</h5>
                        <p className="text-sm text-blue-700 mt-1">
                          잔액이 ₩{autoRecharge.threshold.toLocaleString()} 이하가 되면 
                          ₩{autoRecharge.amount.toLocaleString()}가 자동으로 충전됩니다.
                          월 최대 ₩{autoRecharge.maxAmount.toLocaleString()}까지 충전 가능합니다.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 자동화 이력 */}
          <Card>
            <CardHeader>
              <CardTitle>최근 자동화 이력</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { type: 'recharge', amount: 200000, date: '2024-12-20 14:30', reason: '잔액 부족' },
                  { type: 'pause', campaign: '겨울 세일 캠페인', date: '2024-12-19 16:45', reason: '일일 예산 한도 도달' },
                  { type: 'alert', message: '잔액 부족 알림', date: '2024-12-19 12:20', reason: '₩30,000 미만' }
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        item.type === 'recharge' ? 'bg-green-500' : 
                        item.type === 'pause' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`}></div>
                      <div>
                        <p className="font-medium">
                          {item.type === 'recharge' && `₩${item.amount?.toLocaleString()} 자동 충전`}
                          {item.type === 'pause' && `${item.campaign} 일시정지`}
                          {item.type === 'alert' && item.message}
                        </p>
                        <p className="text-sm text-muted-foreground">{item.reason}</p>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 inline mr-1" />
                      {item.date}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}