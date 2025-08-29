import { useState } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { RadioGroup, RadioGroupItem } from './ui/radio-group'
import { Separator } from './ui/separator'
import { ArrowLeft, CreditCard, Wallet, Building, Check, Zap, Gift, Star } from 'lucide-react'
import { toast } from 'sonner'

interface PaymentPageProps {
  onSuccess: () => void
  onBack: () => void
}

export function PaymentPage({ onSuccess, onBack }: PaymentPageProps) {
  const [selectedPackage, setSelectedPackage] = useState('starter')
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [isProcessing, setIsProcessing] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [discount, setDiscount] = useState(0)

  const packages = [
    {
      id: 'free',
      name: '무료 체험',
      clicks: 50,
      price: 0,
      pricePerClick: 0,
      popular: false,
      features: [
        '50 포스팅 무료 제공',
        '기본 리포트',
        '1회 한정',
        '서비스 체험용'
      ],
      description: '서비스를 체험해보세요',
      badge: '무료'
    },
    {
      id: 'starter',
      name: '스타터팩',
      clicks: 1000,
      price: 90000,
      pricePerClick: 90,
      popular: true,
      features: [
        '1,000 포스팅 보장',
        '실시간 분석',
        '이메일 지원',
        '캠페인 관리'
      ],
      description: '시작하기에 적합한 패키지',
      badge: '인기'
    },
    {
      id: 'premium',
      name: '프리미엄팩',
      clicks: 2000,
      price: 240000,
      pricePerClick: 120,
      popular: false,
      features: [
        '2,000 포스팅 보장',
        '고급 분석 도구',
        '우선 지원',
        '상세 리포트',
        'A/B 테스트'
      ],
      description: '더 많은 클릭이 필요한 비즈니스',
      badge: '대용량'
    }
  ]

  const paymentMethods = [
    { id: 'card', name: '신용/체크카드', icon: CreditCard, description: '즉시 결제' },
    { id: 'transfer', name: '계좌이체', icon: Building, description: '1-2시간 소요' },
    { id: 'virtual', name: '가상계좌', icon: Wallet, description: '24시간 내 입금' }
  ]

  const selectedPkg = packages.find(pkg => pkg.id === selectedPackage)
  const finalPrice = selectedPkg ? selectedPkg.price - (selectedPkg.price * discount / 100) : 0

  const applyPromoCode = () => {
    const validCodes = {
      'WELCOME10': 10,
      'FIRST20': 20,
      'SAVE15': 15
    }

    if (validCodes[promoCode as keyof typeof validCodes]) {
      setDiscount(validCodes[promoCode as keyof typeof validCodes])
      toast.success(`프로모션 코드가 적용되었습니다! ${validCodes[promoCode as keyof typeof validCodes]}% 할인`)
    } else {
      toast.error('유효하지 않은 프로모션 코드입니다.')
    }
  }

  const handlePayment = () => {
    if (!selectedPkg) return

    setIsProcessing(true)

    // Mock payment processing
    setTimeout(() => {
      if (selectedPkg.id === 'free') {
        toast.success('무료 포스팅이 계정에 추가되었습니다!')
        toast.success(`${selectedPkg.clicks} 포스팅을 무료로 받으셨습니다.`)
      } else {
        toast.success(`${selectedPkg.name} 구매가 완료되었습니다!`)
        toast.success(`${selectedPkg.clicks.toLocaleString()} 포스팅이 계정에 추가되었습니다.`)
      }
      setIsProcessing(false)
      onSuccess()
    }, 2000)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          뒤로가기
        </Button>
        <div>
          <h1>포스팅 패키지 선택</h1>
          <p className="text-muted-foreground">원하는 패키지를 선택하고 캠페인을 시작하세요</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Package Selection */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>패키지 선택</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className={`relative border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedPackage === pkg.id 
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedPackage(pkg.id)}
                  >
                    {pkg.popular && (
                      <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary">
                        {pkg.badge}
                      </Badge>
                    )}
                    
                    {!pkg.popular && pkg.badge && (
                      <Badge variant="secondary" className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                        {pkg.badge}
                      </Badge>
                    )}
                    
                    <div className="text-center mb-4">
                      <h3 className="font-semibold text-lg">{pkg.name}</h3>
                      <div className="text-2xl font-bold mt-2">
                        {pkg.price === 0 ? '무료' : `₩${pkg.price.toLocaleString()}`}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {pkg.clicks.toLocaleString()} 포스팅
                      </div>
                      {pkg.price > 0 && (
                        <div className="text-xs text-muted-foreground">
                          포스팅당 ₩{pkg.pricePerClick}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">{pkg.description}</p>
                    </div>

                    <ul className="space-y-2 text-sm">
                      {pkg.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {selectedPackage === pkg.id && (
                      <div className="absolute top-2 right-2">
                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Payment Method - 무료 패키지가 아닐 때만 표시 */}
          {selectedPkg && selectedPkg.price > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>결제 방법</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <div className="space-y-3">
                    {paymentMethods.map((method) => (
                      <div key={method.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={method.id} id={method.id} />
                        <Label 
                          htmlFor={method.id} 
                          className="flex items-center gap-3 cursor-pointer flex-1 p-3 rounded-lg border hover:bg-muted/50"
                        >
                          <method.icon className="w-5 h-5" />
                          <div className="flex-1">
                            <div className="font-medium">{method.name}</div>
                            <div className="text-sm text-muted-foreground">{method.description}</div>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          )}

          {/* Promo Code - 유료 패키지일 때만 표시 */}
          {selectedPkg && selectedPkg.price > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5" />
                  프로모션 코드
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="프로모션 코드 입력"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  />
                  <Button variant="outline" onClick={applyPromoCode}>
                    적용
                  </Button>
                </div>
                {discount > 0 && (
                  <div className="mt-2 text-sm text-green-600">
                    {discount}% 할인이 적용되었습니다!
                  </div>
                )}
                <div className="mt-3 text-xs text-muted-foreground">
                  사용 가능한 코드: WELCOME10, FIRST20, SAVE15
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>선택 요약</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedPkg && (
                <>
                  <div className="flex justify-between items-center">
                    <span>{selectedPkg.name}</span>
                    <span className="font-medium">
                      {selectedPkg.price === 0 ? '무료' : `₩${selectedPkg.price.toLocaleString()}`}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>포스팅 수량</span>
                    <span>{selectedPkg.clicks.toLocaleString()}개</span>
                  </div>

                  {selectedPkg.price > 0 && (
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>포스팅당 단가</span>
                      <span>₩{selectedPkg.pricePerClick}</span>
                    </div>
                  )}

                  {discount > 0 && selectedPkg.price > 0 && (
                    <div className="flex justify-between items-center text-sm text-green-600">
                      <span>할인 ({discount}%)</span>
                      <span>-₩{((selectedPkg.price * discount) / 100).toLocaleString()}</span>
                    </div>
                  )}

                  {selectedPkg.price > 0 && <Separator />}

                  <div className="flex justify-between items-center font-semibold text-lg">
                    <span>총 {selectedPkg.price === 0 ? '혜택' : '결제금액'}</span>
                    <span>{selectedPkg.price === 0 ? '무료' : `₩${finalPrice.toLocaleString()}`}</span>
                  </div>

                  <div className="bg-muted p-3 rounded-lg text-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-primary" />
                      <span className="font-medium">포함된 혜택</span>
                    </div>
                    <ul className="space-y-1 text-muted-foreground">
                      {selectedPkg.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <Check className="w-3 h-3" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handlePayment}
                    disabled={isProcessing}
                  >
                    {isProcessing 
                      ? '처리 중...' 
                      : selectedPkg.price === 0 
                        ? '무료로 시작하기'
                        : `₩${finalPrice.toLocaleString()} 결제하기`
                    }
                  </Button>

                  <div className="text-xs text-muted-foreground text-center">
                    {selectedPkg.price === 0 
                      ? '무료 포스팅이 즉시 계정에 추가됩니다'
                      : '결제 후 즉시 포스팅이 계정에 충전됩니다'
                    }
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}