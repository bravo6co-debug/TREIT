import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Badge } from './ui/badge'
import { Activity } from 'lucide-react'

const data = [
  { time: '00:00', clicks: 1200, activeUsers: 450 },
  { time: '04:00', clicks: 800, activeUsers: 320 },
  { time: '08:00', clicks: 2500, activeUsers: 890 },
  { time: '12:00', clicks: 4200, activeUsers: 1100 },
  { time: '16:00', clicks: 3800, activeUsers: 950 },
  { time: '20:00', clicks: 2900, activeUsers: 720 },
  { time: '23:59', clicks: 1800, activeUsers: 580 },
]

export function RealTimeChart() {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>실시간 활동 모니터링</CardTitle>
            <Badge variant="outline" className="text-xs">
              <Activity className="w-3 h-3 mr-1" />
              실시간
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            마지막 업데이트: 방금 전
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="time" 
              className="text-xs fill-muted-foreground"
            />
            <YAxis 
              yAxisId="clicks"
              orientation="left"
              className="text-xs fill-muted-foreground"
            />
            <YAxis 
              yAxisId="users"
              orientation="right"
              className="text-xs fill-muted-foreground"
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
            />
            <Legend />
            <Line 
              yAxisId="clicks"
              type="monotone" 
              dataKey="clicks" 
              stroke="hsl(var(--chart-1))" 
              strokeWidth={2}
              name="클릭 수"
              dot={{ fill: 'hsl(var(--chart-1))' }}
            />
            <Line 
              yAxisId="users"
              type="monotone" 
              dataKey="activeUsers" 
              stroke="hsl(var(--chart-2))" 
              strokeWidth={2}
              name="활성 유저"
              dot={{ fill: 'hsl(var(--chart-2))' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}