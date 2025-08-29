import { Bell, Search, Settings, User, LogOut, Shield, Clock } from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Input } from './ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu'
import { Avatar, AvatarFallback } from './ui/avatar'

interface AdminUser {
  id: string
  name: string
  role: string
  permissions: string[]
  department: string
  loginTime: string
}

interface HeaderProps {
  currentAdmin?: AdminUser | null
  onLogout?: () => void
}

export function Header({ currentAdmin, onLogout }: HeaderProps) {
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
      case 'super_admin': return 'text-purple-600'
      case 'admin': return 'text-blue-600'
      case 'settlement_admin': return 'text-green-600'
      case 'viewer': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  const formatLoginTime = (loginTime: string) => {
    try {
      const date = new Date(loginTime)
      return date.toLocaleString('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return loginTime
    }
  }

  return (
    <header className="border-b bg-card px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">광고 플랫폼 관리 대시보드</h1>
          {currentAdmin && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="w-3 h-3" />
              <span className={getRoleColor(currentAdmin.role)}>
                {getRoleName(currentAdmin.role)}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input 
              placeholder="검색..." 
              className="pl-10 bg-input-background border-0"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="w-4 h-4" />
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                7
              </Badge>
            </Button>
            
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
            
            {currentAdmin ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs">
                        {currentAdmin.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{currentAdmin.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{currentAdmin.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {currentAdmin.department}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  <div className="px-2 py-1.5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Shield className="w-3 h-3" />
                      <span className={getRoleColor(currentAdmin.role)}>
                        {getRoleName(currentAdmin.role)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <User className="w-3 h-3" />
                      <span>ID: {currentAdmin.id}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>로그인: {formatLoginTime(currentAdmin.loginTime)}</span>
                    </div>
                  </div>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>프로필</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>설정</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem 
                    onClick={onLogout}
                    className="text-red-600 focus:text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>로그아웃</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" size="sm">
                <User className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}