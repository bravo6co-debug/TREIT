import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Avatar, AvatarFallback } from './ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Progress } from './ui/progress'
import { 
  MoreHorizontal, 
  Eye, 
  Search, 
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Users,
  UserCheck,
  UserX,
  UserPlus,
  Crown,
  Ban,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Activity,
  Star,
  DollarSign,
  TrendingUp,
  MousePointer,
  Clock,
  Shield,
  Zap
} from 'lucide-react'

// XSS 보안 유틸리티 import
import { 
  sanitizeText, 
  sanitizeSearchQuery, 
  sanitizeUserProfile,
  escapeHtml 
} from '@shared/xss-protection'
import { SafeUserContent } from '@shared/components/SafeHTML'

// 대량의 유저 데이터 시뮬레이션
const generateUserData = (count: number) => {
  const firstNames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권']
  const secondNames = ['민수', '소영', '정호', '지은', '대성', '영희', '철수', '수진', '진호', '미경', '동훈', '혜진', '상현', '유진', '태민']
  const statuses = ['active', 'pending', 'inactive', 'suspended']
  
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
      rating: Number((Math.random() * 2 + 3).toFixed(1)), // 3.0 ~ 5.0
      region: ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원'][i % 10],
      riskLevel: ['low', 'medium', 'high'][i % 3],
      suspiciousActivity: Math.random() > 0.8,
      clickPattern: Math.random() > 0.7 ? 'suspicious' : 'normal',
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
    };

    // 데이터 정화 적용
    return sanitizeUserProfile(user);
  })
}

// 8934명 유저 데이터 생성 (App.tsx에서 활성 유저 수와 일치)
const allUsers = generateUserData(12847)

export function UserManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [regionFilter, setRegionFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState('all')
  const [sortBy, setSortBy] = useState('id')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const itemsPerPage = 20

  // 안전한 검색어 처리
  const handleSearchChange = (value: string) => {
    const sanitizedValue = sanitizeSearchQuery(value)
    setSearchTerm(sanitizedValue)
    setCurrentPage(1)
  }

  // 사용자 상세 정보 모달 열기
  const openUserDetail = (user: any) => {
    setSelectedUser(user)
    setIsUserModalOpen(true)
  }

  // 사용자 액션 처리
  const handleUserAction = (userId: number, action: string) => {
    console.log(`Action ${action} for user ${userId}`)
    // 실제 구현에서는 API 호출이 들어갈 것입니다
  }

  // 위험도 뱃지 생성
  const getRiskBadge = (riskLevel: string, suspiciousActivity: boolean) => {
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
  }

  // 필터링 및 검색
  const filteredUsers = allUsers.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.phone.includes(searchTerm)
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter
    const matchesRegion = regionFilter === 'all' || user.region === regionFilter
    const matchesLevel = levelFilter === 'all' || 
      (levelFilter === 'beginner' && user.level <= 10) ||
      (levelFilter === 'intermediate' && user.level > 10 && user.level <= 30) ||
      (levelFilter === 'advanced' && user.level > 30)
    
    return matchesSearch && matchesStatus && matchesRegion && matchesLevel
  })

  // 정렬
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let aValue = a[sortBy as keyof typeof a]
    let bValue = b[sortBy as keyof typeof b]
    
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase()
      bValue = (bValue as string).toLowerCase()
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  // 페이지네이션
  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentUsers = sortedUsers.slice(startIndex, startIndex + itemsPerPage)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="text-green-600 border-green-600">활성</Badge>
      case 'pending':
        return <Badge variant="secondary" className="text-yellow-600">승인대기</Badge>
      case 'inactive':
        return <Badge variant="outline" className="text-gray-600 border-gray-600">비활성</Badge>
      case 'suspended':
        return <Badge variant="outline" className="text-red-600 border-red-600">정지</Badge>
      default:
        return <Badge variant="secondary">알 수 없음</Badge>
    }
  }

  const getLevelBadge = (level: number) => {
    if (level <= 10) {
      return <Badge variant="secondary" className="text-blue-600">Level {level}</Badge>
    } else if (level <= 30) {
      return <Badge variant="outline" className="text-green-600 border-green-600">Level {level}</Badge>
    } else {
      return <Badge variant="outline" className="text-purple-600 border-purple-600 flex items-center gap-1">
        <Crown className="w-3 h-3" />
        Level {level}
      </Badge>
    }
  }

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
    setCurrentPage(1)
  }

  const uniqueRegions = Array.from(new Set(allUsers.map(u => u.region)))

  return (
    <div className="space-y-6">
      {/* 유저 통계 개요 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">전체 유저</p>
                <p className="font-bold">{allUsers.length.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCheck className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">활성 유저</p>
                <p className="font-bold">{allUsers.filter(u => u.status === 'active').length.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <UserPlus className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">승인 대기</p>
                <p className="font-bold">{allUsers.filter(u => u.status === 'pending').length.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <UserX className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">정지된 유저</p>
                <p className="font-bold">{allUsers.filter(u => u.status === 'suspended').length.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
            
            <Select value={statusFilter} onValueChange={(value) => {
              setStatusFilter(value)
              setCurrentPage(1)
            }}>
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
            
            <Select value={regionFilter} onValueChange={(value) => {
              setRegionFilter(value)
              setCurrentPage(1)
            }}>
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
            
            <Select value={levelFilter} onValueChange={(value) => {
              setLevelFilter(value)
              setCurrentPage(1)
            }}>
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
                setCurrentPage(1)
              }}
            >
              초기화
            </Button>
          </div>
          
          <div className="mt-4 text-sm text-muted-foreground">
            총 {allUsers.length.toLocaleString()}명 중 {filteredUsers.length.toLocaleString()}명 표시
          </div>
        </CardContent>
      </Card>

      {/* 유저 목록 테이블 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>유저 목록</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredUsers.length)} / {filteredUsers.length.toLocaleString()}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort('id')} className="p-0 h-auto font-semibold">
                    ID <ArrowUpDown className="w-3 h-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead>유저 정보</TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort('level')} className="p-0 h-auto font-semibold">
                    레벨 <ArrowUpDown className="w-3 h-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort('todayEarnings')} className="p-0 h-auto font-semibold">
                    오늘 수익 <ArrowUpDown className="w-3 h-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort('totalEarnings')} className="p-0 h-auto font-semibold">
                    총 수익 <ArrowUpDown className="w-3 h-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead>캠페인</TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort('rating')} className="p-0 h-auto font-semibold">
                    평점 <ArrowUpDown className="w-3 h-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead>위험도</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort('joinDate')} className="p-0 h-auto font-semibold">
                    가입일 <ArrowUpDown className="w-3 h-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead>액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-mono">{user.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback>{user.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <SafeUserContent 
                          content={user.name}
                          className="font-medium"
                          maxLength={50}
                        />
                        <SafeUserContent 
                          content={user.region}
                          className="text-xs text-muted-foreground"
                          maxLength={20}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getLevelBadge(user.level)}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{formatCurrency(user.todayEarnings)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{formatCurrency(user.totalEarnings)}</span>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="text-sm">활성: {user.activeCampaigns}개</div>
                      <div className="text-xs text-muted-foreground">완료: {user.completedCampaigns}개</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{user.rating}</span>
                      <span className="text-xs text-muted-foreground">⭐</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getRiskBadge(user.riskLevel, user.suspiciousActivity)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(user.status)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.joinDate}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openUserDetail(user)}
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* 페이지네이션 */}
          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-muted-foreground">
              페이지 {currentPage} / {totalPages} (총 {filteredUsers.length.toLocaleString()}명)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                이전
              </Button>
              
              {/* 페이지 번호 */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                다음
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
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
            <Tabs defaultValue="profile" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="profile">프로필</TabsTrigger>
                <TabsTrigger value="activity">활동</TabsTrigger>
                <TabsTrigger value="security">보안</TabsTrigger>
                <TabsTrigger value="actions">관리</TabsTrigger>
              </TabsList>

              {/* 프로필 탭 */}
              <TabsContent value="profile" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        기본 정보
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">이메일</p>
                          <SafeUserContent 
                            content={selectedUser.email}
                            className="font-medium"
                            maxLength={100}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">전화번호</p>
                          <SafeUserContent 
                            content={selectedUser.phone}
                            className="font-medium"
                            maxLength={20}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">지역</p>
                          <SafeUserContent 
                            content={selectedUser.region}
                            className="font-medium"
                            maxLength={20}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">나이 / 성별</p>
                          <SafeUserContent 
                            content={`${selectedUser.age}세 / ${selectedUser.gender}`}
                            className="font-medium"
                            maxLength={20}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Activity className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">직업</p>
                          <SafeUserContent 
                            content={selectedUser.occupation}
                            className="font-medium"
                            maxLength={50}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="w-4 h-4" />
                        레벨 & 등급
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-center">
                        {getLevelBadge(selectedUser.level)}
                        <p className="text-sm text-muted-foreground mt-2">현재 레벨</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>레벨 진행률</span>
                          <span>{((selectedUser.level % 10) * 10)}%</span>
                        </div>
                        <Progress value={(selectedUser.level % 10) * 10} className="h-2" />
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="text-center p-2 bg-muted/50 rounded">
                          <div className="font-bold text-lg">{selectedUser.rating}</div>
                          <div className="text-muted-foreground">평점</div>
                        </div>
                        <div className="text-center p-2 bg-muted/50 rounded">
                          <div className="font-bold text-lg">{selectedUser.successRate}%</div>
                          <div className="text-muted-foreground">성공률</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <DollarSign className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">오늘 수익</p>
                          <p className="font-bold">{formatCurrency(selectedUser.todayEarnings)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">총 수익</p>
                          <p className="font-bold">{formatCurrency(selectedUser.totalEarnings)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Users className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">추천인 수</p>
                          <p className="font-bold">{selectedUser.referralCount}명</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* 활동 탭 */}
              <TabsContent value="activity" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MousePointer className="w-4 h-4" />
                        캠페인 활동
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="text-lg font-bold text-blue-600">{selectedUser.activeCampaigns}</div>
                          <div className="text-muted-foreground">활성 캠페인</div>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="text-lg font-bold text-green-600">{selectedUser.completedCampaigns}</div>
                          <div className="text-muted-foreground">완료 캠페인</div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>캠페인 성공률</span>
                          <span className="font-medium">{selectedUser.successRate}%</span>
                        </div>
                        <Progress value={selectedUser.successRate} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        접속 정보
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">가입일</span>
                        <span className="text-sm font-medium">{selectedUser.joinDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">마지막 접속</span>
                        <span className="text-sm font-medium">{selectedUser.lastLoginDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">총 로그인</span>
                        <span className="text-sm font-medium">{selectedUser.loginCount}회</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">평균 이용시간</span>
                        <span className="text-sm font-medium">{Math.floor(selectedUser.avgDailyTime / 60)}시간 {selectedUser.avgDailyTime % 60}분</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* 보안 탭 */}
              <TabsContent value="security" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        보안 상태
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">위험도</span>
                        {getRiskBadge(selectedUser.riskLevel, selectedUser.suspiciousActivity)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">클릭 패턴</span>
                        <Badge variant={selectedUser.clickPattern === 'suspicious' ? 'destructive' : 'outline'}>
                          {selectedUser.clickPattern === 'suspicious' ? '의심스러움' : '정상'}
                        </Badge>
                      </div>
                      {selectedUser.suspiciousActivity && (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>의심스러운 활동 감지</AlertTitle>
                          <AlertDescription>
                            이 사용자는 비정상적인 활동 패턴을 보이고 있습니다. 추가 조사가 필요할 수 있습니다.
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        기술 정보
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">디바이스 ID</span>
                        <SafeUserContent 
                          content={selectedUser.deviceFingerprint}
                          className="text-sm font-mono"
                          maxLength={20}
                        />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">IP 주소</span>
                        <SafeUserContent 
                          content={selectedUser.ipAddress}
                          className="text-sm font-mono"
                          maxLength={15}
                        />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">계정 상태</span>
                        {getStatusBadge(selectedUser.status)}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* 관리 탭 */}
              <TabsContent value="actions" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        빠른 액션
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedUser.status === 'active' && (
                        <>
                          <Button 
                            variant="outline" 
                            className="w-full text-red-600 border-red-600 hover:bg-red-50"
                            onClick={() => {
                              handleUserAction(selectedUser.id, 'suspend')
                              setIsUserModalOpen(false)
                            }}
                          >
                            <Ban className="w-4 h-4 mr-2" />
                            계정 정지
                          </Button>
                        </>
                      )}
                      
                      {selectedUser.status === 'suspended' && (
                        <Button 
                          variant="outline" 
                          className="w-full text-green-600 border-green-600 hover:bg-green-50"
                          onClick={() => {
                            handleUserAction(selectedUser.id, 'activate')
                            setIsUserModalOpen(false)
                          }}
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          계정 복구
                        </Button>
                      )}
                      
                      {selectedUser.status === 'pending' && (
                        <Button 
                          variant="outline" 
                          className="w-full text-green-600 border-green-600 hover:bg-green-50"
                          onClick={() => {
                            handleUserAction(selectedUser.id, 'approve')
                            setIsUserModalOpen(false)
                          }}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          승인
                        </Button>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        고급 관리
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button variant="outline" className="w-full">
                        <Mail className="w-4 h-4 mr-2" />
                        이메일 발송
                      </Button>
                      <Button variant="outline" className="w-full">
                        <Activity className="w-4 h-4 mr-2" />
                        활동 로그 보기
                      </Button>
                      <Button variant="outline" className="w-full text-red-600 border-red-600 hover:bg-red-50">
                        <Shield className="w-4 h-4 mr-2" />
                        어뷰징 신고
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}