import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { Server, Activity, Database, Globe, Zap, HardDrive } from 'lucide-react'

const systemStats = {
  uptime: 99.8,
  avgResponseTime: 23,
  currentUsers: 2847,
  dailyTraffic: 847,
  serverLoad: 34,
  memoryUsage: 67,
  diskUsage: 43,
  apiCalls: 1284792
}

const serverStatus = [
  { name: 'Web Server 1', status: 'healthy', load: 25, location: 'Seoul' },
  { name: 'Web Server 2', status: 'healthy', load: 31, location: 'Seoul' },
  { name: 'API Server 1', status: 'healthy', load: 18, location: 'Busan' },
  { name: 'API Server 2', status: 'warning', load: 78, location: 'Busan' },
  { name: 'Database 1', status: 'healthy', load: 45, location: 'Seoul' },
  { name: 'Database 2', status: 'healthy', load: 39, location: 'Seoul' }
]

export function SystemMonitoring() {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="outline" className="text-green-600 border-green-600">정상</Badge>
      case 'warning':
        return <Badge variant="secondary" className="text-yellow-600 bg-yellow-50">주의</Badge>
      case 'error':
        return <Badge variant="destructive">오류</Badge>
      default:
        return <Badge variant="secondary">알 수 없음</Badge>
    }
  }

  const getLoadColor = (load: number) => {
    if (load < 50) return 'text-green-600'
    if (load < 80) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      {/* 시스템 개요 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">서버 가동률</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{systemStats.uptime}%</div>
            <p className="text-xs text-muted-foreground">지난 30일 평균</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 응답시간</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.avgResponseTime}ms</div>
            <p className="text-xs text-muted-foreground">지난 1시간 평균</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">동시 접속자</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.currentUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">현재 온라인</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">일일 트래픽</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.dailyTraffic}GB</div>
            <p className="text-xs text-muted-foreground">오늘 사용량</p>
          </CardContent>
        </Card>
      </div>

      {/* 서버 상태 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            서버 상태
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {serverStatus.map((server, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4" />
                    <span className="font-medium">{server.name}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">{server.location}</Badge>
                  {getStatusBadge(server.status)}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-medium">CPU 사용률</div>
                    <div className={`text-xs ${getLoadColor(server.load)}`}>
                      {server.load}%
                    </div>
                  </div>
                  <div className="w-20">
                    <Progress value={server.load} className="h-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 시스템 리소스 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              CPU 사용률
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">평균 부하</span>
                <span className="text-sm font-medium">{systemStats.serverLoad}%</span>
              </div>
              <Progress value={systemStats.serverLoad} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              메모리 사용률
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">RAM 사용량</span>
                <span className="text-sm font-medium">{systemStats.memoryUsage}%</span>
              </div>
              <Progress value={systemStats.memoryUsage} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="w-4 h-4" />
              디스크 사용률
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">저장 공간</span>
                <span className="text-sm font-medium">{systemStats.diskUsage}%</span>
              </div>
              <Progress value={systemStats.diskUsage} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API 호출 통계 */}
      <Card>
        <CardHeader>
          <CardTitle>API 호출 통계</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{systemStats.apiCalls.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">총 호출 수</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">99.2%</div>
              <div className="text-sm text-muted-foreground">성공률</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">156ms</div>
              <div className="text-sm text-muted-foreground">평균 응답시간</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-red-600">892</div>
              <div className="text-sm text-muted-foreground">에러 수</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}