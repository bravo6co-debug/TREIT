import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { AlertTriangle, CheckCircle, Clock, Server, CreditCard } from 'lucide-react'

const alerts = [
  {
    id: 1,
    type: 'settlement',
    title: '인출 요청',
    description: '4건의 유저 인출 요청이 대기 중입니다.',
    time: '방금 전',
    action: '정산관리'
  },
  {
    id: 2,
    type: 'warning',
    title: '신고 접수',
    description: '부적절한 광고 콘텐츠 신고가 접수되었습니다.',
    time: '3분 전',
    action: '확인하기'
  },
  {
    id: 3,
    type: 'info',
    title: '환불 요청',
    description: '광고주 2명이 환불을 요청했습니다.',
    time: '15분 전',
    action: '승인하기'
  },
  {
    id: 4,
    type: 'success',
    title: '시스템 정상',
    description: '모든 서버가 정상 작동 중입니다.',
    time: '1시간 전',
    action: '상세보기'
  }
]

export function AlertSystem() {
  const getIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-4 h-4" />
      case 'info': return <Clock className="w-4 h-4" />
      case 'success': return <CheckCircle className="w-4 h-4" />
      case 'settlement': return <CreditCard className="w-4 h-4" />
      default: return <Server className="w-4 h-4" />
    }
  }

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'warning': return 'destructive' as const
      case 'info': return 'secondary' as const
      case 'success': return 'outline' as const
      case 'settlement': return 'secondary' as const
      default: return 'secondary' as const
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>긴급 알림</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {alerts.map((alert) => (
          <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg border">
            <div className="mt-0.5">
              {getIcon(alert.type)}
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">{alert.title}</h4>
                <Badge variant={getBadgeVariant(alert.type)} className="text-xs">
                  {alert.type === 'warning' && '긴급'}
                  {alert.type === 'info' && '대기'}
                  {alert.type === 'success' && '정상'}
                  {alert.type === 'settlement' && '정산'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{alert.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{alert.time}</span>
                <Button variant="outline" size="sm" className="text-xs">
                  {alert.action}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}