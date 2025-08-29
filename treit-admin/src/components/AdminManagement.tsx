import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Alert, AlertDescription } from './ui/alert'
import { Avatar, AvatarFallback } from './ui/avatar'
import { 
  Shield, 
  UserPlus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Search,
  Filter,
  AlertCircle,
  CheckCircle,
  Clock,
  Key,
  Settings
} from 'lucide-react'
import { toast } from 'sonner@2.0.3'

interface AdminUser {
  id: string
  password: string
  name: string
  role: string
  permissions: string[]
  lastLogin: string
  department: string
  status: string
  createdDate: string
  email: string
  phone: string
}

// 관리자 계정 데이터
const initialAdmins: AdminUser[] = [
  {
    id: 'superadmin',
    password: 'admin123!',
    name: '슈퍼관리자',
    role: 'super_admin',
    permissions: ['all'],
    lastLogin: '2025.01.15 09:30',
    department: '시스템관리팀',
    status: 'active',
    createdDate: '2024.01.01',
    email: 'superadmin@company.com',
    phone: '02-1234-5678'
  },
  {
    id: 'admin01',
    password: 'admin123!',
    name: '김관리',
    role: 'admin',
    permissions: ['users', 'advertisers', 'campaigns', 'analytics', 'system'],
    lastLogin: '2025.01.15 08:45',
    department: '운영팀',
    status: 'active',
    createdDate: '2024.03.15',
    email: 'admin01@company.com',
    phone: '02-1234-5679'
  },
  {
    id: 'viewer01',
    password: 'viewer123!',
    name: '이조회',
    role: 'viewer',
    permissions: ['dashboard', 'analytics'],
    lastLogin: '2025.01.14 17:20',
    department: '분석팀',
    status: 'active',
    createdDate: '2024.05.20',
    email: 'viewer01@company.com',
    phone: '02-1234-5680'
  },
  {
    id: 'settlement01',
    password: 'settle123!',
    name: '박정산',
    role: 'settlement_admin',
    permissions: ['dashboard', 'settlement', 'users', 'advertisers'],
    lastLogin: '2025.01.15 10:15',
    department: '정산팀',
    status: 'active',
    createdDate: '2024.07.10',
    email: 'settlement01@company.com',
    phone: '02-1234-5681'
  },
  {
    id: 'temp_admin',
    password: 'temp123!',
    name: '임시관리자',
    role: 'admin',
    permissions: ['users', 'campaigns'],
    lastLogin: '2025.01.10 14:30',
    department: '임시팀',
    status: 'inactive',
    createdDate: '2024.12.01',
    email: 'temp@company.com',
    phone: '02-1234-5682'
  }
]

// 역할별 권한 정의
const rolePermissions = {
  super_admin: {
    name: '슈퍼관리자',
    permissions: ['all'],
    description: '모든 시스템에 대한 완전한 권한'
  },
  admin: {
    name: '일반관리자',
    permissions: ['dashboard', 'users', 'advertisers', 'campaigns', 'analytics', 'system'],
    description: '대부분의 관리 기능에 대한 권한 (정산 제외)'
  },
  settlement_admin: {
    name: '정산관리자',
    permissions: ['dashboard', 'settlement', 'users', 'advertisers'],
    description: '정산 관리 및 관련 데이터 조회 권한'
  },
  viewer: {
    name: '조회전용',
    permissions: ['dashboard', 'analytics'],
    description: '대시보드 및 분석 데이터 조회만 가능'
  }
}

export function AdminManagement() {
  const [admins, setAdmins] = useState<AdminUser[]>(initialAdmins)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null)
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})
  
  const [newAdmin, setNewAdmin] = useState({
    id: '',
    password: '',
    name: '',
    role: '',
    department: '',
    email: '',
    phone: ''
  })

  // 필터링된 관리자 목록
  const filteredAdmins = admins.filter(admin => {
    const matchesSearch = admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         admin.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         admin.department.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'all' || admin.role === roleFilter
    const matchesStatus = statusFilter === 'all' || admin.status === statusFilter
    
    return matchesSearch && matchesRole && matchesStatus
  })

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Badge variant="outline" className="text-purple-600 border-purple-600">슈퍼관리자</Badge>
      case 'admin':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">일반관리자</Badge>
      case 'settlement_admin':
        return <Badge variant="outline" className="text-green-600 border-green-600">정산관리자</Badge>
      case 'viewer':
        return <Badge variant="secondary">조회전용</Badge>
      default:
        return <Badge variant="secondary">알 수 없음</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="text-green-600 border-green-600">활성</Badge>
      case 'inactive':
        return <Badge variant="secondary">비활성</Badge>
      case 'suspended':
        return <Badge variant="outline" className="text-red-600 border-red-600">정지</Badge>
      default:
        return <Badge variant="secondary">알 수 없음</Badge>
    }
  }

  const handleAddAdmin = () => {
    if (!newAdmin.id || !newAdmin.password || !newAdmin.name || !newAdmin.role) {
      toast.error('필수 필드를 모두 입력해주세요.')
      return
    }

    if (admins.find(admin => admin.id === newAdmin.id)) {
      toast.error('이미 존재하는 관리자 ID입니다.')
      return
    }

    const adminToAdd: AdminUser = {
      ...newAdmin,
      permissions: rolePermissions[newAdmin.role as keyof typeof rolePermissions]?.permissions || [],
      lastLogin: '미접속',
      status: 'active',
      createdDate: new Date().toISOString().split('T')[0]
    }

    setAdmins([...admins, adminToAdd])
    setNewAdmin({
      id: '',
      password: '',
      name: '',
      role: '',
      department: '',
      email: '',
      phone: ''
    })
    setIsAddDialogOpen(false)
    toast.success('관리자가 추가되었습니다.')
  }

  const handleDeleteAdmin = (adminId: string) => {
    if (adminId === 'superadmin') {
      toast.error('슈퍼관리자는 삭제할 수 없습니다.')
      return
    }

    setAdmins(admins.filter(admin => admin.id !== adminId))
    toast.success('관리자가 삭제되었습니다.')
  }

  const handleStatusToggle = (adminId: string) => {
    if (adminId === 'superadmin') {
      toast.error('슈퍼관리자의 상태는 변경할 수 없습니다.')
      return
    }

    setAdmins(admins.map(admin => 
      admin.id === adminId 
        ? { ...admin, status: admin.status === 'active' ? 'inactive' : 'active' }
        : admin
    ))
    toast.success('관리자 상태가 변경되었습니다.')
  }

  const togglePasswordVisibility = (adminId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [adminId]: !prev[adminId]
    }))
  }

  const resetPassword = (adminId: string) => {
    const newPassword = 'temp' + Math.random().toString(36).substr(2, 6) + '!'
    setAdmins(admins.map(admin => 
      admin.id === adminId 
        ? { ...admin, password: newPassword }
        : admin
    ))
    toast.success(`비밀번호가 재설정되었습니다: ${newPassword}`)
  }

  return (
    <div className="space-y-6">
      {/* 관리자 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">전체 관리자</p>
                <p className="font-bold">{admins.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">활성 관리자</p>
                <p className="font-bold">{admins.filter(a => a.status === 'active').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">오늘 접속</p>
                <p className="font-bold">{admins.filter(a => a.lastLogin.includes('2025.01.15')).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Settings className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">슈퍼관리자</p>
                <p className="font-bold">{admins.filter(a => a.role === 'super_admin').length}</p>
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
            관리자 검색 및 필터
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="이름, ID, 부서 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="역할 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 역할</SelectItem>
                <SelectItem value="super_admin">슈퍼관리자</SelectItem>
                <SelectItem value="admin">일반관리자</SelectItem>
                <SelectItem value="settlement_admin">정산관리자</SelectItem>
                <SelectItem value="viewer">조회전용</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="상태 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 상태</SelectItem>
                <SelectItem value="active">활성</SelectItem>
                <SelectItem value="inactive">비활성</SelectItem>
                <SelectItem value="suspended">정지</SelectItem>
              </SelectContent>
            </Select>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="w-4 h-4 mr-1" />
                  관리자 추가
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>새 관리자 추가</DialogTitle>
                  <DialogDescription>
                    새로운 관리자 계정을 생성합니다.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="new-id">관리자 ID</Label>
                      <Input
                        id="new-id"
                        value={newAdmin.id}
                        onChange={(e) => setNewAdmin({...newAdmin, id: e.target.value})}
                        placeholder="관리자 ID"
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-password">비밀번호</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newAdmin.password}
                        onChange={(e) => setNewAdmin({...newAdmin, password: e.target.value})}
                        placeholder="비밀번호"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="new-name">이름</Label>
                      <Input
                        id="new-name"
                        value={newAdmin.name}
                        onChange={(e) => setNewAdmin({...newAdmin, name: e.target.value})}
                        placeholder="관리자 이름"
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-role">역할</Label>
                      <Select value={newAdmin.role} onValueChange={(value) => setNewAdmin({...newAdmin, role: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="역할 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">일반관리자</SelectItem>
                          <SelectItem value="settlement_admin">정산관리자</SelectItem>
                          <SelectItem value="viewer">조회전용</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="new-department">부서</Label>
                      <Input
                        id="new-department"
                        value={newAdmin.department}
                        onChange={(e) => setNewAdmin({...newAdmin, department: e.target.value})}
                        placeholder="부서명"
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-email">이메일</Label>
                      <Input
                        id="new-email"
                        type="email"
                        value={newAdmin.email}
                        onChange={(e) => setNewAdmin({...newAdmin, email: e.target.value})}
                        placeholder="이메일 주소"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="new-phone">전화번호</Label>
                    <Input
                      id="new-phone"
                      value={newAdmin.phone}
                      onChange={(e) => setNewAdmin({...newAdmin, phone: e.target.value})}
                      placeholder="전화번호"
                    />
                  </div>
                  
                  {newAdmin.role && rolePermissions[newAdmin.role as keyof typeof rolePermissions] && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>{rolePermissions[newAdmin.role as keyof typeof rolePermissions].name}</strong>: {rolePermissions[newAdmin.role as keyof typeof rolePermissions].description}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    취소
                  </Button>
                  <Button onClick={handleAddAdmin}>
                    추가
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="mt-4 text-sm text-muted-foreground">
            총 {admins.length}명 중 {filteredAdmins.length}명 표시
          </div>
        </CardContent>
      </Card>

      {/* 관리자 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>관리자 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>관리자 정보</TableHead>
                <TableHead>역할/권한</TableHead>
                <TableHead>계정 정보</TableHead>
                <TableHead>최근 접속</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAdmins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback>{admin.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{admin.name}</div>
                        <div className="text-sm text-muted-foreground">{admin.department}</div>
                        <div className="text-xs text-muted-foreground">{admin.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {getRoleBadge(admin.role)}
                      <div className="text-xs text-muted-foreground">
                        권한: {admin.permissions.includes('all') ? '모든 권한' : `${admin.permissions.length}개`}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm">ID: <code className="bg-gray-100 px-1 rounded text-xs">{admin.id}</code></div>
                      <div className="flex items-center gap-1 text-sm">
                        <span>PW:</span>
                        <code className="bg-gray-100 px-1 rounded text-xs">
                          {showPasswords[admin.id] ? admin.password : '••••••••'}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePasswordVisibility(admin.id)}
                          className="h-6 w-6 p-0"
                        >
                          {showPasswords[admin.id] ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground">생성: {admin.createdDate}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{admin.lastLogin}</div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(admin.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusToggle(admin.id)}
                        disabled={admin.id === 'superadmin'}
                      >
                        {admin.status === 'active' ? '비활성화' : '활성화'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => resetPassword(admin.id)}
                      >
                        <Key className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteAdmin(admin.id)}
                        disabled={admin.id === 'superadmin'}
                        className="text-red-600 border-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 역할별 권한 설명 */}
      <Card>
        <CardHeader>
          <CardTitle>역할별 권한 설명</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(rolePermissions).map(([role, info]) => (
              <div key={role} className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {getRoleBadge(role)}
                </div>
                <p className="text-sm text-muted-foreground mb-2">{info.description}</p>
                <div className="text-xs text-muted-foreground">
                  <strong>접근 가능한 메뉴:</strong> {info.permissions.includes('all') ? '모든 메뉴' : info.permissions.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}