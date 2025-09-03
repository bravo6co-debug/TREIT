import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Separator } from './ui/separator'
import { Switch } from './ui/switch'
import { 
  Link, 
  QrCode, 
  Copy, 
  Check, 
  AlertCircle, 
  Globe, 
  Zap, 
  BarChart3,
  Download,
  Settings,
  Eye,
  ExternalLink,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { deeplinkApi } from '../lib/api/deeplinks'
import type { DeeplinkFormData, Deeplink, DeeplinkValidationResult, UtmParameters } from '../types/deeplink'

interface DeeplinkGeneratorProps {
  campaignId?: string
  onDeeplinkCreated?: (deeplink: Deeplink) => void
  initialUrl?: string
}

export function DeeplinkGenerator({ campaignId, onDeeplinkCreated, initialUrl = '' }: DeeplinkGeneratorProps) {
  const [formData, setFormData] = useState<DeeplinkFormData>({
    original_url: initialUrl,
    title: '',
    description: '',
    expires_at: undefined,
    utm_parameters: {
      utm_source: 'treit',
      utm_medium: 'social',
      utm_campaign: '',
      utm_term: '',
      utm_content: ''
    },
    tracking_parameters: {},
    generate_qr: true,
    generate_short_url: true
  })

  const [validation, setValidation] = useState<DeeplinkValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedDeeplink, setGeneratedDeeplink] = useState<Deeplink | null>(null)
  const [copiedStates, setCopiedStates] = useState<{[key: string]: boolean}>({})

  // Validate URL when it changes
  useEffect(() => {
    const validateUrl = async () => {
      if (!formData.original_url || formData.original_url.length < 8) {
        setValidation(null)
        return
      }

      setIsValidating(true)
      const result = await deeplinkApi.validateUrl(formData.original_url)
      setValidation(result.data)
      setIsValidating(false)
    }

    const debounceTimer = setTimeout(validateUrl, 500)
    return () => clearTimeout(debounceTimer)
  }, [formData.original_url])

  const handleGenerateDeeplink = async () => {
    if (!campaignId) {
      toast.error('캠페인 ID가 필요합니다.')
      return
    }

    if (!validation?.is_valid) {
      toast.error('유효한 URL을 입력해주세요.')
      return
    }

    setIsGenerating(true)
    try {
      const result = await deeplinkApi.createDeeplink(campaignId, formData)
      
      if (result.error) {
        toast.error('딥링크 생성 중 오류가 발생했습니다.')
        return
      }

      setGeneratedDeeplink(result.data!)
      onDeeplinkCreated?.(result.data!)
      toast.success('딥링크가 성공적으로 생성되었습니다!')
      
    } catch (error) {
      console.error('Generate deeplink error:', error)
      toast.error('딥링크 생성 중 오류가 발생했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedStates(prev => ({ ...prev, [key]: true }))
      toast.success('클립보드에 복사되었습니다!')
      
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [key]: false }))
      }, 2000)
    } catch (error) {
      toast.error('복사에 실패했습니다.')
    }
  }

  const downloadQRCode = async () => {
    if (!generatedDeeplink?.qr_code_url) return

    try {
      const response = await fetch(generatedDeeplink.qr_code_url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `deeplink-qr-${generatedDeeplink.id}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast.success('QR 코드가 다운로드되었습니다!')
    } catch (error) {
      toast.error('QR 코드 다운로드에 실패했습니다.')
    }
  }

  const updateUtmParameter = (key: keyof UtmParameters, value: string) => {
    setFormData(prev => ({
      ...prev,
      utm_parameters: {
        ...prev.utm_parameters,
        [key]: value
      }
    }))
  }

  const addCustomTrackingParameter = (key: string, value: string) => {
    if (!key.trim()) return
    
    setFormData(prev => ({
      ...prev,
      tracking_parameters: {
        ...prev.tracking_parameters,
        [key]: value
      }
    }))
  }

  const removeTrackingParameter = (key: string) => {
    setFormData(prev => ({
      ...prev,
      tracking_parameters: Object.fromEntries(
        Object.entries(prev.tracking_parameters || {}).filter(([k]) => k !== key)
      )
    }))
  }

  return (
    <div className="space-y-6">
      {!generatedDeeplink ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="w-5 h-5" />
              딥링크 생성기
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              원본 URL을 입력하여 추적 가능한 딥링크를 생성하세요
            </p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="basic" className="space-y-6">
              <TabsList>
                <TabsTrigger value="basic">기본 설정</TabsTrigger>
                <TabsTrigger value="utm">UTM 파라미터</TabsTrigger>
                <TabsTrigger value="advanced">고급 설정</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                {/* URL 입력 및 검증 */}
                <div className="space-y-2">
                  <Label htmlFor="originalUrl">원본 URL</Label>
                  <div className="relative">
                    <Input
                      id="originalUrl"
                      type="url"
                      placeholder="https://example.com/your-page"
                      value={formData.original_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, original_url: e.target.value }))}
                      className={
                        validation?.is_valid === false 
                          ? 'border-destructive' 
                          : validation?.is_valid === true 
                            ? 'border-green-500' 
                            : ''
                      }
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isValidating && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                      {!isValidating && validation?.is_valid === true && (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                      {!isValidating && validation?.is_valid === false && (
                        <AlertCircle className="w-4 h-4 text-destructive" />
                      )}
                    </div>
                  </div>
                  
                  {validation && (
                    <div className="space-y-2">
                      {validation.errors && validation.errors.map((error, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-destructive">
                          <AlertCircle className="w-4 h-4" />
                          {error}
                        </div>
                      ))}
                      {validation.warnings && validation.warnings.map((warning, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-yellow-600">
                          <AlertCircle className="w-4 h-4" />
                          {warning}
                        </div>
                      ))}
                      {validation.is_valid && validation.is_reachable && (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <Check className="w-4 h-4" />
                          URL이 유효하고 접근 가능합니다
                          {validation.response_time_ms && (
                            <span className="text-muted-foreground">
                              (응답시간: {validation.response_time_ms}ms)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 제목 및 설명 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">딥링크 제목 (선택사항)</Label>
                    <Input
                      id="title"
                      placeholder="딥링크 제목"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expiresAt">만료일 (선택사항)</Label>
                    <Input
                      id="expiresAt"
                      type="datetime-local"
                      value={formData.expires_at ? formData.expires_at.toISOString().slice(0, -8) : ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        expires_at: e.target.value ? new Date(e.target.value) : undefined 
                      }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">설명 (선택사항)</Label>
                  <Textarea
                    id="description"
                    placeholder="딥링크에 대한 설명을 입력하세요"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                {/* 생성 옵션 */}
                <div className="space-y-4">
                  <Label>생성 옵션</Label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <QrCode className="w-4 h-4" />
                          <span className="font-medium">QR 코드 생성</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          딥링크를 QR 코드로 변환하여 쉽게 공유할 수 있습니다
                        </p>
                      </div>
                      <Switch
                        checked={formData.generate_qr}
                        onCheckedChange={(checked) => 
                          setFormData(prev => ({ ...prev, generate_qr: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          <span className="font-medium">단축 URL 생성</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          짧고 기억하기 쉬운 URL을 생성합니다
                        </p>
                      </div>
                      <Switch
                        checked={formData.generate_short_url}
                        onCheckedChange={(checked) => 
                          setFormData(prev => ({ ...prev, generate_short_url: checked }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="utm" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    <h3 className="font-medium">UTM 파라미터</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Google Analytics 등에서 트래픽 소스를 추적하기 위한 UTM 파라미터를 설정하세요
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="utm_source">UTM Source</Label>
                      <Input
                        id="utm_source"
                        placeholder="treit"
                        value={formData.utm_parameters?.utm_source || ''}
                        onChange={(e) => updateUtmParameter('utm_source', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">트래픽 소스 (예: google, facebook, treit)</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="utm_medium">UTM Medium</Label>
                      <Input
                        id="utm_medium"
                        placeholder="social"
                        value={formData.utm_parameters?.utm_medium || ''}
                        onChange={(e) => updateUtmParameter('utm_medium', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">매체 (예: social, email, cpc)</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="utm_campaign">UTM Campaign</Label>
                      <Input
                        id="utm_campaign"
                        placeholder="summer_sale"
                        value={formData.utm_parameters?.utm_campaign || ''}
                        onChange={(e) => updateUtmParameter('utm_campaign', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">캠페인 이름</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="utm_term">UTM Term</Label>
                      <Input
                        id="utm_term"
                        placeholder="keyword"
                        value={formData.utm_parameters?.utm_term || ''}
                        onChange={(e) => updateUtmParameter('utm_term', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">키워드 (주로 검색광고에서 사용)</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="utm_content">UTM Content</Label>
                    <Input
                      id="utm_content"
                      placeholder="banner_top"
                      value={formData.utm_parameters?.utm_content || ''}
                      onChange={(e) => updateUtmParameter('utm_content', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">광고 콘텐츠 구분자 (A/B 테스트 등에서 사용)</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    <h3 className="font-medium">사용자 정의 추적 파라미터</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    추가적인 추적 파라미터를 설정하여 더 세밀한 분석을 할 수 있습니다
                  </p>

                  {/* 기존 파라미터 목록 */}
                  {Object.entries(formData.tracking_parameters || {}).length > 0 && (
                    <div className="space-y-2">
                      <Label>설정된 파라미터</Label>
                      <div className="space-y-2">
                        {Object.entries(formData.tracking_parameters || {}).map(([key, value]) => (
                          <div key={key} className="flex items-center gap-2">
                            <Badge variant="outline" className="flex items-center gap-2">
                              {key}={value}
                              <button
                                onClick={() => removeTrackingParameter(key)}
                                className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center"
                              >
                                ×
                              </button>
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 새 파라미터 추가 */}
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="파라미터 키"
                      id="new-param-key"
                    />
                    <div className="flex gap-2">
                      <Input
                        placeholder="파라미터 값"
                        id="new-param-value"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const keyInput = document.getElementById('new-param-key') as HTMLInputElement
                          const valueInput = document.getElementById('new-param-value') as HTMLInputElement
                          if (keyInput.value && valueInput.value) {
                            addCustomTrackingParameter(keyInput.value, valueInput.value)
                            keyInput.value = ''
                            valueInput.value = ''
                          }
                        }}
                      >
                        추가
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <Separator className="my-6" />

            <div className="flex justify-end">
              <Button 
                onClick={handleGenerateDeeplink}
                disabled={!validation?.is_valid || isGenerating}
                className="min-w-[120px]"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    딥링크 생성
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-500" />
              딥링크 생성 완료
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              딥링크가 성공적으로 생성되었습니다. 아래 링크들을 활용하세요.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 딥링크 URL */}
            <div className="space-y-3">
              <Label>딥링크 URL</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={generatedDeeplink.deeplink_url}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(generatedDeeplink.deeplink_url, 'deeplink')}
                >
                  {copiedStates.deeplink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(generatedDeeplink.deeplink_url, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* 단축 URL */}
            {generatedDeeplink.short_url && (
              <div className="space-y-3">
                <Label>단축 URL</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={generatedDeeplink.short_url}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(generatedDeeplink.short_url!, 'short')}
                  >
                    {copiedStates.short ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(generatedDeeplink.short_url!, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* QR 코드 */}
            {generatedDeeplink.qr_code_url && (
              <div className="space-y-3">
                <Label>QR 코드</Label>
                <div className="flex items-center gap-4">
                  <img
                    src={generatedDeeplink.qr_code_url}
                    alt="QR 코드"
                    className="w-24 h-24 border rounded-lg"
                  />
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadQRCode}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      다운로드
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(generatedDeeplink.qr_code_url!, 'qr')}
                    >
                      {copiedStates.qr ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                      URL 복사
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* 딥링크 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold">{generatedDeeplink.click_count}</div>
                <div className="text-sm text-muted-foreground">총 클릭수</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{generatedDeeplink.unique_clicks}</div>
                <div className="text-sm text-muted-foreground">순 클릭수</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{generatedDeeplink.conversion_count}</div>
                <div className="text-sm text-muted-foreground">전환수</div>
              </div>
            </div>

            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  setGeneratedDeeplink(null)
                  setFormData(prev => ({ ...prev, original_url: '', title: '', description: '' }))
                }}
              >
                새 딥링크 생성
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}