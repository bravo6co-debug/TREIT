import React, { memo, useMemo, useCallback, useState, useEffect } from 'react'
import { FixedSizeList as List } from 'react-window'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Avatar, AvatarFallback } from '../ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { 
  MoreHorizontal, 
  Eye, 
  Search, 
  Filter,
  Users,
  UserCheck,
  UserX,
  UserPlus,
  Crown,
  Ban,
  RotateCcw,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import { useOptimizedQuery, useDebouncedSearch } from '../../hooks/useOptimizedQuery'
import { queryKeys } from '../../lib/query-client'

// XSS 보안 유틸리티 import
import { 
  sanitizeText, 
  sanitizeSearchQuery, 
  sanitizeUserProfile
} from '@shared/xss-protection'
import { SafeUserContent } from '@shared/components/SafeHTML'

// 사용자 데이터 타입
interface User {
  id: number
  name: string
  level: number
  todayEarnings: number
  totalEarnings: number
  activeCampaigns: number
  completedCampaigns: number
  status: 'active' | 'pending' | 'inactive' | 'suspended'
  joinDate: string
  phone: string
  email: string
  rating: number
  region: string
  riskLevel: 'low' | 'medium' | 'high'
  suspiciousActivity: boolean
  clickPattern: 'normal' | 'suspicious'
  deviceFingerprint: string
  ipAddress: string
  successRate: number
  age: number
  gender: string
  occupation: string
  referralCount: number
  lastLoginDate: string
  loginCount: number
  avgDailyTime: number
}

// 통계 카드 컴포넌트 (메모이제이션)
const UserStatsCard = memo<{
  title: string
  value: number
  icon: React.ReactNode
  iconBg: string
}>(({ title, value, icon, iconBg }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 ${iconBg} rounded-lg`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="font-bold">{value.toLocaleString()}</p>
        </div>
      </div>
    </CardContent>
  </Card>
))

UserStatsCard.displayName = 'UserStatsCard'

// 가상화된 사용자 행 컴포넌트
const UserRow = memo<{
  index: number
  style: React.CSSProperties
  data: {
    users: User[]
    onUserClick: (user: User) => void
    formatCurrency: (amount: number) => string
    getLevelBadge: (level: number) => React.ReactNode
    getStatusBadge: (status: string) => React.ReactNode
    getRiskBadge: (riskLevel: string, suspiciousActivity: boolean) => React.ReactNode
    handleUserAction: (userId: number, action: string) => void
  }
}>(({ index, style, data }) => {
  const { users, onUserClick, formatCurrency, getLevelBadge, getStatusBadge, getRiskBadge, handleUserAction } = data
  const user = users[index]

  if (!user) return null

  return (
    <div style={style} className="flex items-center p-4 border-b hover:bg-muted/50 transition-colors">
      <div className="w-16 text-sm font-mono">{user.id}</div>
      
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarFallback>{user.name[0]}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <SafeUserContent 
            content={user.name}
            className="font-medium truncate"
            maxLength={50}
          />
          <SafeUserContent 
            content={user.region}
            className="text-xs text-muted-foreground truncate"
            maxLength={20}
          />
        </div>
      </div>

      <div className="w-20 flex-shrink-0">
        {getLevelBadge(user.level)}
      </div>

      <div className="w-24 text-sm font-medium text-right">
        {formatCurrency(user.todayEarnings)}
      </div>

      <div className="w-28 text-sm text-right">
        {formatCurrency(user.totalEarnings)}
      </div>

      <div className="w-20 text-sm text-center">
        <div>{user.activeCampaigns}개</div>
        <div className="text-xs text-muted-foreground">{user.completedCampaigns}완료</div>
      </div>

      <div className="w-16 text-center">
        <div className="text-sm font-medium">{user.rating}</div>
        <div className="text-xs">⭐</div>
      </div>

      <div className="w-20 flex-shrink-0">
        {getRiskBadge(user.riskLevel, user.suspiciousActivity)}
      </div>

      <div className="w-20 flex-shrink-0">
        {getStatusBadge(user.status)}
      </div>

      <div className="w-24 text-sm text-muted-foreground">
        {user.joinDate}
      </div>

      <div className="w-32 flex items-center gap-1 flex-shrink-0">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => onUserClick(user)}
        >
          <Eye className="w-3 h-3" />
        </Button>
        {user.status === 'active' && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleUserAction(user.id, 'suspend')}
            className="text-red-600 hover:text-red-700"
          >
            <Ban className="w-3 h-3" />
          </Button>
        )}
        {user.status === 'suspended' && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleUserAction(user.id, 'activate')}
            className="text-green-600 hover:text-green-700"
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
        )}
        {user.status === 'pending' && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleUserAction(user.id, 'approve')}
            className="text-green-600 hover:text-green-700"
          >
            <CheckCircle className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  )
})

UserRow.displayName = 'UserRow'

// 메인 컴포넌트
export const VirtualizedUserManagement = memo(() => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [regionFilter, setRegionFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState('all')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)

  // 디바운싱된 검색어
  const debouncedSearchTerm = useDebouncedSearch(searchTerm, 300)

  // 사용자 데이터 페칭 (최적화됨)
  const { data: usersData, isLoading } = useOptimizedQuery(
    queryKeys.users.list({ search: debouncedSearchTerm, status: statusFilter, region: regionFilter, level: levelFilter }),
    async () => {
      // 시뮬레이션된 대량 데이터 생성
      const generateUserData = (count: number) => {
        const firstNames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권']
        const secondNames = ['민수', '소영', '정호', '지은', '대성', '영희', '철수', '수진', '진호', '미경', '동훈', '혜진', '상현', '유진', '태민']
        const statuses = ['active', 'pending', 'inactive', 'suspended'] as const
        const regions = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원']
        
        return Array.from({ length: count }, (_, i) => {
          const user = {
            id: i + 1,
            name: `${firstNames[i % firstNames.length]}${secondNames[i % secondNames.length]}`,
            level: Math.floor(Math.random() * 50) + 1,
            todayEarnings: Math.floor(Math.random() * 100000) + 1000,
            totalEarnings: Math.floor(Math.random() * 5000000) + 50000,
            activeCampaigns: Math.floor(Math.random() * 10),
            completedCampaigns: Math.floor(Math.random() * 100) + 5,
            status: statuses[i % statuses.length],
            joinDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
            phone: `010-${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,
            email: `user${i + 1}@example.com`,
            rating: Number((Math.random() * 2 + 3).toFixed(1)),
            region: regions[i % regions.length],
            riskLevel: (['low', 'medium', 'high'] as const)[i % 3],
            suspiciousActivity: Math.random() > 0.8,
            clickPattern: (Math.random() > 0.7 ? 'suspicious' : 'normal') as const,
            deviceFingerprint: `fp_${Math.random().toString(36).substr(2, 9)}`,
            ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            successRate: Math.floor(Math.random() * 40) + 60,
            age: Math.floor(Math.random() * 40) + 20,
            gender: ['남', '여'][i % 2],
            occupation: ['학생', '직장인', '자영업', '주부', '기타'][i % 5],
            referralCount: Math.floor(Math.random() * 50),
            lastLoginDate: new Date(2024, 11, Math.floor(Math.random() * 30) + 1).toISOString().split('T')[0],
            loginCount: Math.floor(Math.random() * 1000) + 10,
            avgDailyTime: Math.floor(Math.random() * 300) + 30
          }

          // 데이터 정화 적용
          return sanitizeUserProfile(user)
        })
      }

      return {
        users: generateUserData(50000), // 5만명의 테스트 데이터
        total: 50000
      }
    },
    {
      staleTime: 30000, // 30초간 캐시
    }
  )

  // 안전한 검색어 처리
  const handleSearchChange = useCallback((value: string) => {
    const sanitizedValue = sanitizeSearchQuery(value)
    setSearchTerm(sanitizedValue)
  }, [])

  // 사용자 상세 정보 모달 열기
  const openUserDetail = useCallback((user: User) => {
    setSelectedUser(user)
    setIsUserModalOpen(true)
  }, [])

  // 사용자 액션 처리
  const handleUserAction = useCallback((userId: number, action: string) => {
    console.log(`Action ${action} for user ${userId}`)
    // 실제 구현에서는 API 호출이 들어갈 것입니다
  }, [])

  // 메모이제이션된 포맷 함수들
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount)
  }, [])

  // 뱃지 생성 함수들 (메모이제이션)
  const getLevelBadge = useCallback((level: number) => {
    if (level <= 10) {
      return <Badge variant="secondary" className="text-blue-600">L{level}</Badge>
    } else if (level <= 30) {
      return <Badge variant="outline" className="text-green-600 border-green-600">L{level}</Badge>
    } else {
      return <Badge variant="outline" className="text-purple-600 border-purple-600 flex items-center gap-1">
        <Crown className="w-3 h-3" />
        L{level}
      </Badge>
    }
  }, [])

  const getStatusBadge = useCallback((status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="text-green-600 border-green-600">활성</Badge>
      case 'pending':
        return <Badge variant="secondary" className="text-yellow-600">대기</Badge>
      case 'inactive':
        return <Badge variant="outline" className="text-gray-600 border-gray-600">비활성</Badge>
      case 'suspended':
        return <Badge variant="outline" className="text-red-600 border-red-600">정지</Badge>
      default:
        return <Badge variant="secondary">알 수 없음</Badge>
    }
  }, [])

  const getRiskBadge = useCallback((riskLevel: string, suspiciousActivity: boolean) => {
    if (suspiciousActivity) {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        위험
      </Badge>
    }
    
    switch (riskLevel) {
      case 'high':
        return <Badge variant="outline" className="text-red-600 border-red-600">높음</Badge>
      case 'medium':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">보통</Badge>
      case 'low':
        return <Badge variant="outline" className="text-green-600 border-green-600">낮음</Badge>
      default:
        return <Badge variant="secondary">알 수 없음</Badge>
    }
  }, [])

  // 필터링된 사용자 목록 (메모이제이션)
  const filteredUsers = useMemo(() => {
    if (!usersData?.users) return []

    return usersData.users.filter(user => {
      const matchesSearch = debouncedSearchTerm === '' || 
        user.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        user.phone.includes(debouncedSearchTerm)
      
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter
      const matchesRegion = regionFilter === 'all' || user.region === regionFilter
      const matchesLevel = levelFilter === 'all' || 
        (levelFilter === 'beginner' && user.level <= 10) ||
        (levelFilter === 'intermediate' && user.level > 10 && user.level <= 30) ||
        (levelFilter === 'advanced' && user.level > 30)
      
      return matchesSearch && matchesStatus && matchesRegion && matchesLevel
    })
  }, [usersData?.users, debouncedSearchTerm, statusFilter, regionFilter, levelFilter])

  // 통계 데이터 (메모이제이션)
  const userStats = useMemo(() => {
    if (!usersData?.users) return { total: 0, active: 0, pending: 0, suspended: 0 }

    const users = usersData.users
    return {
      total: users.length,
      active: users.filter(u => u.status === 'active').length,
      pending: users.filter(u => u.status === 'pending').length,
      suspended: users.filter(u => u.status === 'suspended').length
    }
  }, [usersData?.users])

  // 고유 지역 목록 (메모이제이션)
  const uniqueRegions = useMemo(() => {
    if (!usersData?.users) return []
    return Array.from(new Set(usersData.users.map(u => u.region)))
  }, [usersData?.users])

  // 가상화를 위한 행 데이터
  const rowData = useMemo(() => ({
    users: filteredUsers,
    onUserClick: openUserDetail,
    formatCurrency,
    getLevelBadge,
    getStatusBadge,
    getRiskBadge,
    handleUserAction
  }), [filteredUsers, openUserDetail, formatCurrency, getLevelBadge, getStatusBadge, getRiskBadge, handleUserAction])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 유저 통계 개요 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <UserStatsCard
          title="전체 유저"
          value={userStats.total}
          icon={<Users className="w-4 h-4 text-blue-600" />}
          iconBg="bg-blue-100"
        />
        <UserStatsCard
          title="활성 유저"
          value={userStats.active}
          icon={<UserCheck className="w-4 h-4 text-green-600" />}
          iconBg="bg-green-100"
        />
        <UserStatsCard
          title="승인 대기"
          value={userStats.pending}
          icon={<UserPlus className="w-4 h-4 text-yellow-600" />}
          iconBg="bg-yellow-100"
        />
        <UserStatsCard
          title="정지된 유저"
          value={userStats.suspended}
          icon={<UserX className="w-4 h-4 text-red-600" />}
          iconBg="bg-red-100"
        />
      </div>

      {/* 검색 및 필터 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            유저 검색 및 필터
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="이름, 이메일, 전화번호 검색..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
                maxLength={100}
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="상태 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 상태</SelectItem>
                <SelectItem value="active">활성</SelectItem>
                <SelectItem value="pending">승인대기</SelectItem>
                <SelectItem value="inactive">비활성</SelectItem>
                <SelectItem value="suspended">정지</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="지역 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 지역</SelectItem>
                {uniqueRegions.map(region => (
                  <SelectItem key={region} value={region}>{region}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger>
                <SelectValue placeholder="레벨 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 레벨</SelectItem>
                <SelectItem value="beginner">초급 (1-10)</SelectItem>
                <SelectItem value="intermediate">중급 (11-30)</SelectItem>
                <SelectItem value="advanced">고급 (31+)</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('all')
                setRegionFilter('all')
                setLevelFilter('all')
              }}
            >
              초기화
            </Button>
          </div>
          
          <div className="mt-4 text-sm text-muted-foreground">
            총 {userStats.total.toLocaleString()}명 중 {filteredUsers.length.toLocaleString()}명 표시
          </div>
        </CardContent>
      </Card>

      {/* 가상화된 유저 목록 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>유저 목록 (가상화됨)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* 테이블 헤더 */}
          <div className="flex items-center p-4 border-b bg-muted/50 font-medium text-sm">
            <div className="w-16">ID</div>
            <div className="flex-1 min-w-0">유저 정보</div>
            <div className="w-20">레벨</div>
            <div className="w-24 text-right">오늘 수익</div>
            <div className="w-28 text-right">총 수익</div>
            <div className="w-20 text-center">캠페인</div>
            <div className="w-16 text-center">평점</div>
            <div className="w-20">위험도</div>
            <div className="w-20">상태</div>
            <div className="w-24">가입일</div>
            <div className="w-32">액션</div>
          </div>

          {/* 가상화된 목록 */}
          <div style={{ height: '600px' }}>
            <List
              height={600}
              itemCount={filteredUsers.length}
              itemSize={80}
              itemData={rowData}
            >
              {UserRow}
            </List>
          </div>
        </CardContent>
      </Card>

      {/* 사용자 상세 정보 모달 */}
      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback>{selectedUser?.name?.[0]}</AvatarFallback>
              </Avatar>
              <SafeUserContent 
                content={selectedUser?.name || '알 수 없음'}
                className="inline"
                maxLength={50}
              /> 상세 정보
              {selectedUser?.suspiciousActivity && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  위험
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p><strong>이메일:</strong> {selectedUser.email}</p>
                  <p><strong>전화번호:</strong> {selectedUser.phone}</p>
                  <p><strong>지역:</strong> {selectedUser.region}</p>
                  <p><strong>나이/성별:</strong> {selectedUser.age}세 / {selectedUser.gender}</p>
                </div>
                <div className="space-y-2">
                  <p><strong>레벨:</strong> {selectedUser.level}</p>
                  <p><strong>평점:</strong> {selectedUser.rating} ⭐</p>
                  <p><strong>성공률:</strong> {selectedUser.successRate}%</p>
                  <p><strong>추천인 수:</strong> {selectedUser.referralCount}명</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{formatCurrency(selectedUser.todayEarnings)}</div>
                    <div className="text-sm text-muted-foreground">오늘 수익</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(selectedUser.totalEarnings)}</div>
                    <div className="text-sm text-muted-foreground">총 수익</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">{selectedUser.activeCampaigns}</div>
                    <div className="text-sm text-muted-foreground">활성 캠페인</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
})

VirtualizedUserManagement.displayName = 'VirtualizedUserManagement'