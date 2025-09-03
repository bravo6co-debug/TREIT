import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Mail, Lock, User, Phone, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { auth } from '../lib/supabase';
import { useAuthStore } from '../lib/stores/authStore';
import treItLogo from 'figma:asset/4d914e156bb643f84e4345ddcffa6614b97a1685.png';

interface LoginScreenProps {
  onLoginSuccess: () => void;
  onSwitchToSignup: () => void;
}

interface SignupData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  phone: string;
  marketingConsent: boolean;
}

export default function LoginScreen({ onLoginSuccess, onSwitchToSignup }: LoginScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, signup } = useAuthStore();
  
  // Login form state
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  
  // Signup form state
  const [signupData, setSignupData] = useState<SignupData>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    marketingConsent: false
  });
  
  // Form validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check for existing session
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const { session } = await auth.getSession();
    if (session) {
      onLoginSuccess();
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (isLogin) {
      if (!loginData.email) newErrors.email = '이메일을 입력해주세요';
      if (!loginData.password) newErrors.password = '비밀번호를 입력해주세요';
    } else {
      if (!signupData.email) newErrors.email = '이메일을 입력해주세요';
      if (!signupData.fullName) newErrors.fullName = '이름을 입력해주세요';
      if (!signupData.phone) newErrors.phone = '전화번호를 입력해주세요';
      if (!signupData.password) newErrors.password = '비밀번호를 입력해주세요';
      if (signupData.password.length < 6) newErrors.password = '비밀번호는 6자 이상이어야 합니다';
      if (signupData.password !== signupData.confirmPassword) {
        newErrors.confirmPassword = '비밀번호가 일치하지 않습니다';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      const success = await login(loginData.email, loginData.password);
      
      if (success) {
        onLoginSuccess();
      }
    } catch (error) {
      toast.error('로그인 중 예상치 못한 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      const success = await signup(
        signupData.email, 
        signupData.password, 
        { 
          full_name: signupData.fullName,
          phone: signupData.phone 
        }
      );
      
      if (success) {
        setIsLogin(true);
        // Clear signup form
        setSignupData({
          email: '',
          password: '',
          confirmPassword: '',
          fullName: '',
          phone: '',
          marketingConsent: false
        });
      }
    } catch (error) {
      toast.error('회원가입 중 예상치 못한 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await auth.signInWithGoogle();
      if (error) {
        toast.error('Google 로그인에 실패했습니다: ' + error.message);
      }
    } catch (error) {
      toast.error('Google 로그인 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    if (isLogin) {
      setLoginData(prev => ({ ...prev, [field]: value }));
    } else {
      setSignupData(prev => ({ ...prev, [field]: value }));
    }
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img src={treItLogo} alt="TreIt Logo" className="w-16 h-16" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              {isLogin ? '로그인' : '회원가입'}
            </CardTitle>
            <CardDescription className="text-gray-600">
              {isLogin ? 'TreIt 계정으로 로그인하세요' : '새로운 TreIt 계정을 만드세요'}
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Google Login Button */}
          <Button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            <Shield className="w-4 h-4 mr-2" />
            Google로 계속하기
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">또는</span>
            </div>
          </div>

          {/* Login Form */}
          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">이메일</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="이메일을 입력하세요"
                    value={loginData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.email && (
                  <div className="flex items-center text-sm text-red-500">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.email}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">비밀번호</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="비밀번호를 입력하세요"
                    value={loginData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className={`pl-10 pr-10 ${errors.password ? 'border-red-500' : ''}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.password && (
                  <div className="flex items-center text-sm text-red-500">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.password}
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? '로그인 중...' : '로그인'}
              </Button>
            </form>
          ) : (
            /* Signup Form */
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-fullname">이름</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="signup-fullname"
                    type="text"
                    placeholder="이름을 입력하세요"
                    value={signupData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    className={`pl-10 ${errors.fullName ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.fullName && (
                  <div className="flex items-center text-sm text-red-500">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.fullName}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-phone">전화번호</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="signup-phone"
                    type="tel"
                    placeholder="전화번호를 입력하세요"
                    value={signupData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className={`pl-10 ${errors.phone ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.phone && (
                  <div className="flex items-center text-sm text-red-500">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.phone}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email">이메일</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="이메일을 입력하세요"
                    value={signupData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.email && (
                  <div className="flex items-center text-sm text-red-500">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.email}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password">비밀번호</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="비밀번호를 입력하세요 (6자 이상)"
                    value={signupData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className={`pl-10 pr-10 ${errors.password ? 'border-red-500' : ''}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.password && (
                  <div className="flex items-center text-sm text-red-500">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.password}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-confirm-password">비밀번호 확인</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="signup-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="비밀번호를 다시 입력하세요"
                    value={signupData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className={`pl-10 pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.confirmPassword && (
                  <div className="flex items-center text-sm text-red-500">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.confirmPassword}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="marketing-consent"
                  checked={signupData.marketingConsent}
                  onChange={(e) => handleInputChange('marketingConsent', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="marketing-consent" className="text-sm text-gray-600">
                  마케팅 정보 수신에 동의합니다 (선택사항)
                </Label>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? '회원가입 중...' : '회원가입'}
              </Button>
            </form>
          )}

          {/* Switch between Login/Signup */}
          <div className="text-center">
            <Button
              variant="link"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              {isLogin ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
            </Button>
          </div>

          {/* Forgot Password */}
          {isLogin && (
            <div className="text-center">
              <Button variant="link" className="text-sm text-gray-600 hover:text-gray-900">
                비밀번호를 잊으셨나요?
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
