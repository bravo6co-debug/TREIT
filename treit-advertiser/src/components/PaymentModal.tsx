import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Badge } from './ui/badge'
import { RadioGroup, RadioGroupItem } from './ui/radio-group'
import { Checkbox } from './ui/checkbox'
import { Card, CardContent } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { 
  CreditCard, Smartphone, Building2, Gift, Shield, Check,
  AlertCircle, Loader2, Zap, Star, Crown, Percent, Clock
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'

interface PaymentPackage {
  id: string
  name: string
  amount: number
  bonusAmount: number
  totalAmount: number
  discount: number
  popular: boolean
  features: string[]
  icon: React.ReactNode
}

interface PaymentMethod {
  id: string
  type: 'card' | 'bank' | 'digital' | 'mobile'
  name: string
  icon: React.ReactNode
  fee: number
  processingTime: string
  description: string
}

interface PaymentModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (amount: number, transactionId: string) => void
  selectedAmount?: number
}

export function PaymentModal({ 
  isOpen, 
  onOpenChange, 
  onSuccess,
  selectedAmount = 100000 
}: PaymentModalProps) {
  const [currentStep, setCurrentStep] = useState<'package' | 'method' | 'details' | 'processing' | 'success'>('package')
  const [selectedPackage, setSelectedPackage] = useState<PaymentPackage | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)
  const [customAmount, setCustomAmount] = useState(selectedAmount)
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardHolder: '',
    bankAccount: '',
    bankCode: '',
    phoneNumber: '',
    agreeTerms: false,
    agreeMarketing: false
  })
  const [transactionId, setTransactionId] = useState('')

  // 결제 패키지 정의
  const paymentPackages: PaymentPackage[] = [
    {
      id: 'starter',
      name: '스타터',
      amount: 50000,
      bonusAmount: 0,
      totalAmount: 50000,
      discount: 0,
      popular: false,
      features: ['기본 캠페인 실행', '표준 분석 리포트'],
      icon: <Zap className="w-5 h-5" />
    },
    {
      id: 'standard',
      name: '스탠다드',
      amount: 100000,
      bonusAmount: 10000,
      totalAmount: 110000,
      discount: 10,
      popular: true,
      features: ['보너스 ₩10,000', '우선 고객 지원', '상세 분석 리포트'],
      icon: <Star className="w-5 h-5" />
    },
    {
      id: 'premium',
      name: '프리미엄',
      amount: 200000,
      bonusAmount: 30000,
      totalAmount: 230000,
      discount: 15,
      popular: false,
      features: ['보너스 ₩30,000', '전담 계정 매니저', '실시간 최적화', '프리미엄 템플릿'],
      icon: <Crown className="w-5 h-5" />
    },
    {
      id: 'enterprise',
      name: '엔터프라이즈',
      amount: 500000,
      bonusAmount: 100000,
      totalAmount: 600000,
      discount: 20,
      popular: false,
      features: ['보너스 ₩100,000', '맞춤형 솔루션', 'API 접근', '24/7 지원', '전략 컨설팅'],
      icon: <Building2 className="w-5 h-5" />
    }
  ]

  // 결제 수단 정의
  const paymentMethods: PaymentMethod[] = [
    {
      id: 'card',
      type: 'card',
      name: '신용카드',
      icon: <CreditCard className="w-5 h-5" />,
      fee: 0,
      processingTime: '즉시',
      description: '대부분의 신용카드 지원'
    },
    {
      id: 'bank',
      type: 'bank',
      name: '계좌이체',
      icon: <Building2 className="w-5 h-5" />,
      fee: 0,
      processingTime: '1-2분',
      description: '안전한 은행 계좌 이체'
    },
    {
      id: 'mobile',
      type: 'mobile',
      name: '휴대폰 결제',
      icon: <Smartphone className="w-5 h-5" />,
      fee: 3.3,
      processingTime: '즉시',
      description: '통신사를 통한 간편 결제'
    }
  ]

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep('package')
      setSelectedPackage(null)
      setSelectedMethod(null)
      setIsProcessing(false)
      setPaymentDetails({
        cardNumber: '',
        expiryDate: '',
        cvv: '',
        cardHolder: '',
        bankAccount: '',
        bankCode: '',
        phoneNumber: '',
        agreeTerms: false,
        agreeMarketing: false
      })
    }
  }, [isOpen])

  const handleSelectPackage = (pkg: PaymentPackage) => {
    setSelectedPackage(pkg)
    setCustomAmount(pkg.totalAmount)
  }

  const handleSelectMethod = (method: PaymentMethod) => {
    setSelectedMethod(method)
  }

  const handleNextStep = () => {
    if (currentStep === 'package' && (selectedPackage || customAmount > 0)) {
      setCurrentStep('method')
    } else if (currentStep === 'method' && selectedMethod) {
      setCurrentStep('details')
    } else if (currentStep === 'details') {
      handleProcessPayment()
    }
  }

  const handlePreviousStep = () => {
    if (currentStep === 'method') {
      setCurrentStep('package')
    } else if (currentStep === 'details') {
      setCurrentStep('method')
    }
  }

  const validatePaymentDetails = () => {
    if (!paymentDetails.agreeTerms) {
      toast.error('이용약관에 동의해주세요.')
      return false
    }

    if (selectedMethod?.type === 'card') {
      if (!paymentDetails.cardNumber || !paymentDetails.expiryDate || !paymentDetails.cvv || !paymentDetails.cardHolder) {
        toast.error('카드 정보를 모두 입력해주세요.')
        return false
      }
    } else if (selectedMethod?.type === 'bank') {
      if (!paymentDetails.bankAccount || !paymentDetails.bankCode) {
        toast.error('계좌 정보를 모두 입력해주세요.')
        return false
      }
    } else if (selectedMethod?.type === 'mobile') {
      if (!paymentDetails.phoneNumber) {
        toast.error('휴대폰 번호를 입력해주세요.')
        return false
      }
    }

    return true
  }

  const handleProcessPayment = async () => {
    if (!validatePaymentDetails()) {
      return
    }

    setIsProcessing(true)
    setCurrentStep('processing')

    try {
      // 실제 결제 처리 로직
      await new Promise(resolve => setTimeout(resolve, 3000)) // Mock processing time
      
      const mockTransactionId = `TXN${Date.now()}`
      setTransactionId(mockTransactionId)

      // Supabase에 거래 기록 저장 (실제 구현)
      const { error } = await supabase
        .from('transactions')
        .insert({
          transaction_id: mockTransactionId,
          user_id: 'current_user_id', // 실제 사용자 ID
          type: 'deposit',
          amount: selectedPackage?.totalAmount || customAmount,
          payment_method: selectedMethod?.type,
          status: 'completed',
          created_at: new Date().toISOString()
        })

      if (error) {
        throw error
      }

      setCurrentStep('success')
      
      if (onSuccess) {
        onSuccess(selectedPackage?.totalAmount || customAmount, mockTransactionId)
      }

      toast.success('결제가 완료되었습니다!')
      
      // 3초 후 모달 닫기
      setTimeout(() => {
        onOpenChange(false)
      }, 3000)

    } catch (error) {
      console.error('Payment processing error:', error)
      toast.error('결제 처리 중 오류가 발생했습니다.')
      setCurrentStep('details')
    } finally {
      setIsProcessing(false)
    }
  }

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = matches && matches[0] || ''
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    if (parts.length) {
      return parts.join(' ')
    } else {
      return v
    }
  }

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\D/g, '')
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4)
    }
    return v
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            캠페인 크레딧 충전
          </DialogTitle>
          <DialogDescription>
            캠페인 실행을 위한 크레딧을 충전하세요. 안전하고 빠른 결제를 제공합니다.
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center space-x-4 py-4">
          {[
            { key: 'package', label: '패키지 선택' },
            { key: 'method', label: '결제 수단' },
            { key: 'details', label: '결제 정보' },
            { key: 'processing', label: '처리 중' },
            { key: 'success', label: '완료' }
          ].map((step, index) => (
            <div key={step.key} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === step.key ? 'bg-primary text-primary-foreground' :
                ['package', 'method', 'details', 'processing'].indexOf(currentStep) > index ? 'bg-green-500 text-white' :
                'bg-muted text-muted-foreground'
              }`}>
                {['package', 'method', 'details', 'processing'].indexOf(currentStep) > index ? (
                  <Check className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>
              {index < 4 && (
                <div className={`w-8 h-0.5 mx-2 ${
                  ['package', 'method', 'details', 'processing'].indexOf(currentStep) > index ? 'bg-green-500' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Package Selection */}
        {currentStep === 'package' && (
          <div className="space-y-4">
            <Tabs defaultValue="packages" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="packages">패키지 선택</TabsTrigger>
                <TabsTrigger value="custom">직접 입력</TabsTrigger>
              </TabsList>
              
              <TabsContent value="packages" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {paymentPackages.map((pkg) => (
                    <Card 
                      key={pkg.id} 
                      className={`cursor-pointer transition-all ${
                        selectedPackage?.id === pkg.id ? 'ring-2 ring-primary' : 'hover:shadow-md'
                      } ${pkg.popular ? 'border-primary' : ''}`}
                      onClick={() => handleSelectPackage(pkg)}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {pkg.icon}
                            <h3 className="font-semibold">{pkg.name}</h3>
                          </div>
                          {pkg.popular && (
                            <Badge className="bg-gradient-to-r from-orange-500 to-red-500">
                              인기
                            </Badge>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold">₩{pkg.totalAmount.toLocaleString()}</span>
                            {pkg.discount > 0 && (
                              <Badge variant="outline" className="text-green-600">
                                <Percent className="w-3 h-3 mr-1" />
                                {pkg.discount}% 할인
                              </Badge>
                            )}
                          </div>
                          
                          {pkg.bonusAmount > 0 && (
                            <p className="text-sm text-green-600">
                              + 보너스 ₩{pkg.bonusAmount.toLocaleString()}
                            </p>
                          )}
                          
                          <ul className="space-y-1 text-xs text-muted-foreground">
                            {pkg.features.map((feature, idx) => (
                              <li key={idx} className="flex items-center gap-1">
                                <Check className="w-3 h-3 text-green-500" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="custom" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="customAmount">충전 금액</Label>
                    <Input
                      id="customAmount"
                      type="number"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(Number(e.target.value))}
                      min={10000}
                      step={10000}
                      className="text-lg"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      최소 ₩10,000부터 충전 가능합니다
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2">
                    {[50000, 100000, 200000, 500000].map((amount) => (
                      <Button
                        key={amount}
                        variant={customAmount === amount ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCustomAmount(amount)}
                      >
                        {(amount / 10000).toFixed(0)}만원
                      </Button>
                    ))}
                  </div>
                  
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex justify-between items-center">
                      <span>충전 금액</span>
                      <span className="font-bold text-lg">₩{customAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Step 2: Payment Method Selection */}
        {currentStep === 'method' && (
          <div className="space-y-4">
            <h3 className="font-semibold">결제 수단을 선택하세요</h3>
            <RadioGroup value={selectedMethod?.id} onValueChange={(value) => {
              const method = paymentMethods.find(m => m.id === value)
              if (method) handleSelectMethod(method)
            }}>
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <div key={method.id}>
                    <Label htmlFor={method.id} className="cursor-pointer">
                      <Card className={`transition-all hover:shadow-md ${
                        selectedMethod?.id === method.id ? 'ring-2 ring-primary' : ''
                      }`}>
                        <CardContent className="pt-6">
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value={method.id} id={method.id} />
                            <div className="flex items-center gap-3 flex-1">
                              {method.icon}
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium">{method.name}</h4>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="w-3 h-3" />
                                    {method.processingTime}
                                  </div>
                                </div>
                                <p className="text-sm text-muted-foreground">{method.description}</p>
                                {method.fee > 0 && (
                                  <p className="text-xs text-orange-600">
                                    수수료: {method.fee}%
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>
        )}

        {/* Step 3: Payment Details */}
        {currentStep === 'details' && selectedMethod && (
          <div className="space-y-4">
            <h3 className="font-semibold">결제 정보를 입력하세요</h3>
            
            {selectedMethod.type === 'card' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cardNumber">카드 번호</Label>
                  <Input
                    id="cardNumber"
                    value={paymentDetails.cardNumber}
                    onChange={(e) => setPaymentDetails(prev => ({
                      ...prev,
                      cardNumber: formatCardNumber(e.target.value)
                    }))}
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expiryDate">유효기간</Label>
                    <Input
                      id="expiryDate"
                      value={paymentDetails.expiryDate}
                      onChange={(e) => setPaymentDetails(prev => ({
                        ...prev,
                        expiryDate: formatExpiryDate(e.target.value)
                      }))}
                      placeholder="MM/YY"
                      maxLength={5}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      value={paymentDetails.cvv}
                      onChange={(e) => setPaymentDetails(prev => ({
                        ...prev,
                        cvv: e.target.value.replace(/\D/g, '').substring(0, 4)
                      }))}
                      placeholder="123"
                      maxLength={4}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="cardHolder">카드 소유자</Label>
                  <Input
                    id="cardHolder"
                    value={paymentDetails.cardHolder}
                    onChange={(e) => setPaymentDetails(prev => ({
                      ...prev,
                      cardHolder: e.target.value
                    }))}
                    placeholder="홍길동"
                  />
                </div>
              </div>
            )}

            {selectedMethod.type === 'bank' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bankCode">은행 선택</Label>
                  <select
                    id="bankCode"
                    value={paymentDetails.bankCode}
                    onChange={(e) => setPaymentDetails(prev => ({
                      ...prev,
                      bankCode: e.target.value
                    }))}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">은행을 선택하세요</option>
                    <option value="004">KB국민은행</option>
                    <option value="011">NH농협은행</option>
                    <option value="003">IBK기업은행</option>
                    <option value="088">신한은행</option>
                    <option value="020">우리은행</option>
                    <option value="081">KEB하나은행</option>
                    <option value="027">한국씨티은행</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="bankAccount">계좌번호</Label>
                  <Input
                    id="bankAccount"
                    value={paymentDetails.bankAccount}
                    onChange={(e) => setPaymentDetails(prev => ({
                      ...prev,
                      bankAccount: e.target.value.replace(/\D/g, '')
                    }))}
                    placeholder="123456789012"
                  />
                </div>
              </div>
            )}

            {selectedMethod.type === 'mobile' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="phoneNumber">휴대폰 번호</Label>
                  <Input
                    id="phoneNumber"
                    value={paymentDetails.phoneNumber}
                    onChange={(e) => setPaymentDetails(prev => ({
                      ...prev,
                      phoneNumber: e.target.value.replace(/\D/g, '')
                    }))}
                    placeholder="01012345678"
                    maxLength={11}
                  />
                </div>
              </div>
            )}

            {/* 결제 요약 */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>충전 금액</span>
                <span>₩{(selectedPackage?.amount || customAmount).toLocaleString()}</span>
              </div>
              {selectedPackage?.bonusAmount && (
                <div className="flex justify-between text-green-600">
                  <span>보너스</span>
                  <span>+₩{selectedPackage.bonusAmount.toLocaleString()}</span>
                </div>
              )}
              {selectedMethod.fee > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>수수료</span>
                  <span>₩{Math.round((selectedPackage?.totalAmount || customAmount) * selectedMethod.fee / 100).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>총 결제 금액</span>
                <span>₩{((selectedPackage?.totalAmount || customAmount) * (1 + (selectedMethod.fee || 0) / 100)).toLocaleString()}</span>
              </div>
            </div>

            {/* 약관 동의 */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={paymentDetails.agreeTerms}
                  onCheckedChange={(checked) => setPaymentDetails(prev => ({
                    ...prev,
                    agreeTerms: checked as boolean
                  }))}
                />
                <Label htmlFor="terms" className="text-sm">
                  <span className="text-red-500">*</span> 이용약관 및 개인정보처리방침에 동의합니다
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="marketing"
                  checked={paymentDetails.agreeMarketing}
                  onCheckedChange={(checked) => setPaymentDetails(prev => ({
                    ...prev,
                    agreeMarketing: checked as boolean
                  }))}
                />
                <Label htmlFor="marketing" className="text-sm">
                  마케팅 정보 수신에 동의합니다 (선택)
                </Label>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Shield className="w-4 h-4 text-blue-600" />
              <p className="text-sm text-blue-700">
                SSL 암호화로 안전하게 보호되는 결제입니다
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Processing */}
        {currentStep === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <h3 className="text-lg font-semibold">결제를 처리하고 있습니다</h3>
            <p className="text-muted-foreground text-center">
              잠시만 기다려주세요. 결제가 완료되면 자동으로 크레딧이 충전됩니다.
            </p>
          </div>
        )}

        {/* Step 5: Success */}
        {currentStep === 'success' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-green-600">결제가 완료되었습니다!</h3>
            <div className="text-center space-y-2">
              <p className="text-2xl font-bold">₩{(selectedPackage?.totalAmount || customAmount).toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">거래번호: {transactionId}</p>
              <p className="text-sm text-muted-foreground">
                크레딧이 계정에 즉시 반영되었습니다
              </p>
            </div>
          </div>
        )}

        {/* Footer Buttons */}
        {!['processing', 'success'].includes(currentStep) && (
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={currentStep === 'package' ? () => onOpenChange(false) : handlePreviousStep}
            >
              {currentStep === 'package' ? '취소' : '이전'}
            </Button>
            
            <Button
              onClick={handleNextStep}
              disabled={
                (currentStep === 'package' && !selectedPackage && customAmount < 10000) ||
                (currentStep === 'method' && !selectedMethod) ||
                (currentStep === 'details' && !paymentDetails.agreeTerms) ||
                isProcessing
              }
            >
              {currentStep === 'details' ? '결제하기' : '다음'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}