import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { ImageWithFallback } from './figma/ImageWithFallback'
import { Check, TrendingUp, Target, Shield, Zap, Users, BarChart3 } from 'lucide-react'

interface LandingPageProps {
  onGetStarted: () => void
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const features = [
    {
      icon: Target,
      title: '자발적 확산',
      description: '소비자가 자연스럽게 SNS에 콘텐츠를 올려 브랜드가 확산됩니다'
    },
    {
      icon: BarChart3,
      title: '높은 인게이지먼트',
      description: '광고 같지 않은 자연스러운 노출로 더 높은 참여율을 달성하세요'
    },
    {
      icon: Shield,
      title: '투명한 보상',
      description: '참여자에게 명확한 보상을 제공하는 신뢰할 수 있는 시스템'
    },
    {
      icon: Zap,
      title: '3초 포스팅',
      description: '간단하고 빠른 포스팅으로 누구나 쉽게 참여할 수 있습니다'
    }
  ]

  const pricingPlans = [
    {
      name: '무료 체험',
      price: 0,
      clicks: 50,
      features: [
        '50 포스팅 무료 제공',
        '기본 리포트',
        '1회 한정',
        '서비스 체험용'
      ],
      popular: false,
      description: '서비스를 체험해보세요'
    },
    {
      name: '스타터팩',
      price: 90000,
      clicks: 1000,
      features: [
        '1,000 포스팅 보장',
        '실시간 분석',
        '이메일 지원',
        '캠페인 관리'
      ],
      popular: true,
      description: '시작하기에 적합한 패키지'
    },
    {
      name: '프리미엄팩',
      price: 240000,
      clicks: 2000,
      features: [
        '2,000 포스팅 보장',
        '고급 분석 도구',
        '우선 지원',
        '상세 리포트',
        'A/B 테스트'
      ],
      popular: false,
      description: '더 많은 포스팅이 필요한 비즈니스'
    }
  ]

  const stats = [
    { label: '누적 포스팅수', value: '1,200,000+' },
    { label: '만족한 브랜드', value: '850+' },
    { label: '평균 인게이지먼트', value: '8.5%' },
    { label: '고객 만족도', value: '98%' }
  ]

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">Tre-it</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-muted-foreground hover:text-foreground">기능</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground">가격</a>
            <a href="#about" className="text-muted-foreground hover:text-foreground">소개</a>
          </nav>
          <Button onClick={onGetStarted}>시작하기</Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              3초 포스팅으로
              <br />
              자연스러운 브랜드 노출
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              소비자가 자연스럽게 SNS에 콘텐츠를 올리며 보상을 받는 
              새로운 마케팅 플랫폼입니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button size="lg" onClick={onGetStarted} className="text-lg px-8 py-4">
                무료로 시작하기
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-4">
                데모 보기
              </Button>
            </div>
            
            {/* Hero Image */}
            <div className="relative max-w-4xl mx-auto">
              <div className="relative rounded-xl overflow-hidden shadow-2xl">
                <ImageWithFallback 
                  src="https://images.unsplash.com/photo-1686061594225-3e92c0cd51b0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaWdpdGFsJTIwbWFya2V0aW5nJTIwZGFzaGJvYXJkJTIwYW5hbHl0aWNzfGVufDF8fHx8MTc1NjI3OTUxNHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                  alt="Digital Marketing Dashboard"
                  className="w-full h-64 sm:h-80 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, index) => (
              <div key={index}>
                <div className="text-3xl font-bold mb-2">{stat.value}</div>
                <div className="text-primary-foreground/80">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              왜 Tre-it을 선택해야 할까요?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              자발적 확산과 높은 인게이지먼트로 효율적인 마케팅을 실현하세요
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              투명하고 합리적인 가격
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              무료 체험부터 대용량 패키지까지, 필요에 맞는 포스팅 패키지를 선택하세요
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card key={index} className={`relative ${plan.popular ? 'ring-2 ring-primary shadow-lg scale-105' : ''}`}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    추천
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <div className="text-4xl font-bold">
                      {plan.price === 0 ? '무료' : `₩${plan.price.toLocaleString()}`}
                    </div>
                    <div className="text-muted-foreground">{plan.clicks.toLocaleString()} 포스팅</div>
                    {plan.price > 0 && (
                      <div className="text-sm text-muted-foreground">
                        포스팅당 ₩{Math.round(plan.price / plan.clicks)}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-2">
                      {plan.description}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full" 
                    variant={plan.popular ? "default" : "outline"}
                    onClick={onGetStarted}
                  >
                    시작하기
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-secondary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl font-bold mb-6">
              지금 시작하고 결과를 확인하세요
            </h2>
            <p className="text-xl mb-8 opacity-90">
              수천 개의 기업이 이미 Tre-it으로 자연스러운 브랜드 확산을 경험했습니다. 
              당신의 비즈니스도 성장시켜보세요.
            </p>
            <Button 
              size="lg" 
              variant="secondary" 
              className="text-lg px-8 py-4"
              onClick={onGetStarted}
            >
              무료로 시작하기
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl">Tre-it</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground">개인정보처리방침</a>
              <a href="#" className="hover:text-foreground">이용약관</a>
              <a href="#" className="hover:text-foreground">고객지원</a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            © 2024 Tre-it. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}