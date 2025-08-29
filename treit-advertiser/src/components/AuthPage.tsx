import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Badge } from './ui/badge'
import { ArrowLeft, Mail, Lock, User, Building, Phone, TrendingUp } from 'lucide-react'
import { toast } from 'sonner@2.0.3'

interface User {
  id: string
  email: string
  name: string
}

interface AuthPageProps {
  onSuccess: (user: User) => void
  onBack: () => void
}

export function AuthPage({ onSuccess, onBack }: AuthPageProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  })
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    company: '',
    phone: '',
    businessType: 'ecommerce'
  })

  const businessTypes = [
    { value: 'ecommerce', label: '이커머스' },
    { value: 'service', label: '서비스업' },
    { value: 'education', label: '교육' },
    { value: 'healthcare', label: '헬스케어' },
    { value: 'tech', label: '기술/IT' },
    { value: 'finance', label: '금융' },
    { value: 'others', label: '기타' }
  ]

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!loginForm.email || !loginForm.password) {
      toast.error('모든 필드를 입력해주세요.')
      return
    }

    setIsLoading(true)

    // Mock login - 실제로는 Supabase auth 사용
    setTimeout(() => {
      const mockUser: User = {
        id: '1',
        email: loginForm.email,
        name: loginForm.email.split('@')[0]
      }
      
      toast.success('로그인되었습니다!')
      onSuccess(mockUser)
      setIsLoading(false)
    }, 1000)
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!signupForm.name || !signupForm.email || !signupForm.password || !signupForm.company) {
      toast.error('필수 항목을 모두 입력해주세요.')
      return
    }

    if (signupForm.password !== signupForm.confirmPassword) {
      toast.error('비밀번호가 일치하지 않습니다.')
      return
    }

    if (signupForm.password.length < 8) {
      toast.error('비밀번호는 8자 이상이어야 합니다.')
      return
    }

    setIsLoading(true)

    // Mock signup - 실제로는 Supabase auth 사용
    setTimeout(() => {
      const mockUser: User = {
        id: '1',
        email: signupForm.email,
        name: signupForm.name
      }
      
      toast.success('회원가입이 완료되었습니다!')
      onSuccess(mockUser)
      setIsLoading(false)
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            돌아가기
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">ClickBoost</span>
          </div>
        </div>
      </header>

      {/* Auth Form */}
      <div className="flex items-center justify-center px-6 pb-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">환영합니다!</h1>
            <p className="text-muted-foreground">
              ClickBoost와 함께 성공적인 광고를 시작하세요
            </p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">로그인</TabsTrigger>
              <TabsTrigger value="signup">회원가입</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>로그인</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">이메일</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="your@email.com"
                          className="pl-10"
                          value={loginForm.email}
                          onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password">비밀번호</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          id="login-password"
                          type="password"
                          placeholder="••••••••"
                          className="pl-10"
                          value={loginForm.password}
                          onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                        />
                      </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? '로그인 중...' : '로그인'}
                    </Button>

                    <div className="text-center">
                      <a href="#" className="text-sm text-primary hover:underline">
                        비밀번호를 잊으셨나요?
                      </a>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="signup">
              <Card>
                <CardHeader>
                  <CardTitle>회원가입</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignup} className="space-y-4">
                    {/* 기본 정보 */}
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name">이름 *</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                          <Input
                            id="signup-name"
                            placeholder="홍길동"
                            className="pl-10"
                            value={signupForm.name}
                            onChange={(e) => setSignupForm(prev => ({ ...prev, name: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-email">이메일 *</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="your@email.com"
                            className="pl-10"
                            value={signupForm.email}
                            onChange={(e) => setSignupForm(prev => ({ ...prev, email: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-password">비밀번호 *</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                          <Input
                            id="signup-password"
                            type="password"
                            placeholder="8자 이상"
                            className="pl-10"
                            value={signupForm.password}
                            onChange={(e) => setSignupForm(prev => ({ ...prev, password: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">비밀번호 확인 *</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                          <Input
                            id="confirm-password"
                            type="password"
                            placeholder="비밀번호 재입력"
                            className="pl-10"
                            value={signupForm.confirmPassword}
                            onChange={(e) => setSignupForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>

                    {/* 비즈니스 정보 */}
                    <div className="pt-4 border-t">
                      <h3 className="font-medium mb-4">비즈니스 정보</h3>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="company">회사명 *</Label>
                          <div className="relative">
                            <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                              id="company"
                              placeholder="(주)회사명"
                              className="pl-10"
                              value={signupForm.company}
                              onChange={(e) => setSignupForm(prev => ({ ...prev, company: e.target.value }))}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phone">연락처</Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                              id="phone"
                              placeholder="010-1234-5678"
                              className="pl-10"
                              value={signupForm.phone}
                              onChange={(e) => setSignupForm(prev => ({ ...prev, phone: e.target.value }))}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>업종</Label>
                          <div className="flex flex-wrap gap-2">
                            {businessTypes.map((type) => (
                              <Badge
                                key={type.value}
                                variant={signupForm.businessType === type.value ? "default" : "secondary"}
                                className="cursor-pointer"
                                onClick={() => setSignupForm(prev => ({ ...prev, businessType: type.value }))}
                              >
                                {type.label}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? '가입 중...' : '회원가입'}
                    </Button>

                    <p className="text-xs text-muted-foreground text-center">
                      회원가입하시면 <a href="#" className="text-primary hover:underline">이용약관</a>과{' '}
                      <a href="#" className="text-primary hover:underline">개인정보처리방침</a>에 동의한 것으로 간주됩니다.
                    </p>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Demo Account Info */}
          <Card className="mt-6 bg-muted/50">
            <CardContent className="pt-6">
              <div className="text-center">
                <h4 className="font-medium mb-2">테스트 계정</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  바로 체험해보시려면 아래 계정을 사용하세요
                </p>
                <div className="text-sm space-y-1">
                  <div>이메일: demo@clickboost.com</div>
                  <div>비밀번호: demo1234</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}