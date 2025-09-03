import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Alert, AlertDescription } from './ui/alert'
import { Eye, EyeOff, Shield, AlertCircle } from 'lucide-react'
import { toast } from 'sonner@2.0.3'

interface LoginPageProps {
  onLogin: (adminData: any) => void
}

// 관리자 계정 데이터 (실제로는 백엔드에서 가져와야 함)
const adminAccounts = [
  {
    id: 'superadmin',
    password: 'admin123!',
    name: '슈퍼관리자',
    role: 'super_admin',
    permissions: ['all'],
    lastLogin: '2025.01.15 09:30',
    department: '시스템관리팀'
  },
  {
    id: 'admin01',
    password: 'admin123!',
    name: '김관리',
    role: 'admin',
    permissions: ['users', 'advertisers', 'campaigns', 'analytics', 'system'],
    lastLogin: '2025.01.15 08:45',
    department: '운영팀'
  },
  {
    id: 'viewer01',
    password: 'viewer123!',
    name: '이조회',
    role: 'viewer',
    permissions: ['dashboard', 'analytics'],
    lastLogin: '2025.01.14 17:20',
    department: '분석팀'
  },
  {
    id: 'settlement01',
    password: 'settle123!',
    name: '박정산',
    role: 'settlement_admin',
    permissions: ['dashboard', 'settlement', 'users', 'advertisers'],
    lastLogin: '2025.01.15 10:15',
    department: '정산팀'
  }
]

export function LoginPage({ onLogin }: LoginPageProps) {
  const [formData, setFormData] = useState({
    id: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError('')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // 입력 검증
      if (!formData.id || !formData.password) {
        setError('관리자 ID와 비밀번호를 입력해주세요.')
        return
      }

      // 로그인 처리 시뮬레이션 (1초 지연)
      await new Promise(resolve => setTimeout(resolve, 1000))

      // 계정 확인
      const admin = adminAccounts.find(
        acc => acc.id === formData.id && acc.password === formData.password
      )

      if (!admin) {
        setError('관리자 ID 또는 비밀번호가 올바르지 않습니다.')
        return
      }

      // 로그인 성공
      const loginData = {
        ...admin,
        loginTime: new Date().toISOString(),
        sessionId: Math.random().toString(36).substr(2, 9)
      }

      toast.success(`${admin.name}님, 환영합니다!`)
      onLogin(loginData)

    } catch (error) {
      setError('로그인 처리 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'text-purple-600'
      case 'admin': return 'text-blue-600'
      case 'settlement_admin': return 'text-green-600'
      case 'viewer': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  const getRoleName = (role: string) => {
    switch (role) {
      case 'super_admin': return '슈퍼관리자'
      case 'admin': return '일반관리자'
      case 'settlement_admin': return '정산관리자'
      case 'viewer': return '조회전용'
      default: return '알 수 없음'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* 로고 및 제목 */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">광고 플랫폼 관리자</h1>
          <p className="text-sm text-gray-600">관리자 계정으로 로그인하세요</p>
        </div>

        {/* 로그인 폼 */}
        <Card>
          <CardHeader>
            <CardTitle>로그인</CardTitle>
            <CardDescription>
              관리자 ID와 비밀번호를 입력해주세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-id">관리자 ID</Label>
                <Input
                  id="admin-id"
                  type="text"
                  placeholder="관리자 ID를 입력하세요"
                  value={formData.id}
                  onChange={(e) => handleInputChange('id', e.target.value)}
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="비밀번호를 입력하세요"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? '로그인 중...' : '로그인'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 테스트 계정 안내 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">테스트 계정</CardTitle>
            <CardDescription className="text-xs">
              개발용 테스트 계정입니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {adminAccounts.map((account) => (
              <div key={account.id} className="p-3 border rounded-lg bg-gray-50 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{account.name}</span>
                  <span className={`text-xs ${getRoleBadgeColor(account.role)}`}>
                    {getRoleName(account.role)}
                  </span>
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>ID: <code className="bg-white px-1 rounded">{account.id}</code></div>
                  <div>PW: <code className="bg-white px-1 rounded">{account.password}</code></div>
                  <div>부서: {account.department}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 보안 안내 */}
        <div className="text-center text-xs text-gray-500 space-y-1">
          <p>• 관리자 계정은 보안이 중요합니다</p>
          <p>• 로그인 기록이 시스템에 저장됩니다</p>
          <p>• 30분 미사용시 자동 로그아웃됩니다</p>
        </div>
      </div>
    </div>
  )
}