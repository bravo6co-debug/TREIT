import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Badge } from './ui/badge'
import { Calendar } from './ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Separator } from './ui/separator'
import { Switch } from './ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { CalendarIcon, Check, Hash, ImageIcon, Eye, Lightbulb, Plus, X, Link, Settings, BookOpen, Loader2, Copy, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { toast } from 'sonner'

// Import new components and APIs
import { DeeplinkGenerator } from './DeeplinkGenerator'
import { TemplateManager } from './TemplateManager'
import { campaignApi } from '../lib/api/campaigns'
import { deeplinkApi } from '../lib/api/deeplinks'
import type { CampaignFormData, Campaign } from '../types/campaign'
import type { Template } from '../types/template'
import type { Deeplink } from '../types/deeplink'

// Import XSS protection utilities
import { 
  sanitizeText, 
  sanitizeHtml, 
  sanitizeCampaignData, 
  sanitizeSearchQuery,
  escapeUrl,
  detectXSSPatterns
} from '@shared/xss-protection'
import { SafeHTML, SafeCampaignTitle, SafeCampaignDescription, SafeHTMLInput, SafeImage } from '@shared/components/SafeHTML'

interface CampaignAddProps {
  onSuccess: () => void
  advertiserId: string
}

export function CampaignAdd({ onSuccess, advertiserId }: CampaignAddProps) {
  const [formData, setFormData] = useState<CampaignFormData>({
    title: '',
    description: '',
    original_url: '',
    cost_per_click: 90, // 포스팅당 90원
    total_budget: 0,
    daily_budget: 0,
    total_clicks_target: 0,
    start_date: null,
    end_date: null,
    image_url: '',
    hashtags: [],
    post_template: '',
    platform_targets: []
  })

  // XSS 검증 상태
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [isContentSafe, setIsContentSafe] = useState(true)

  // UI state
  const [customHashtag, setCustomHashtag] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [generatedDeeplink, setGeneratedDeeplink] = useState<Deeplink | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDeeplinkGenerator, setShowDeeplinkGenerator] = useState(false)
  const [showTemplateManager, setShowTemplateManager] = useState(false)
  const [enableAutoDeeplink, setEnableAutoDeeplink] = useState(true)

  // Calculate values
  const totalAmount = formData.total_clicks_target * formData.cost_per_click || 0
  const dailyBudget = formData.daily_budget || 0
  const postingPrice = formData.quantity > 0 ? Math.round(totalAmount / formData.quantity) : 0

  // XSS 검증 함수
  const validateInputSecurity = (field: string, value: string): boolean => {
    if (!value || typeof value !== 'string') return true

    const hasXSS = detectXSSPatterns(value)
    if (hasXSS) {
      setValidationErrors(prev => [...prev, `${field}에서 허용되지 않는 문자가 감지되었습니다.`])
      setIsContentSafe(false)
      return false
    }
    return true
  }

  // 안전한 입력 처리 함수
  const handleSafeInput = (field: keyof CampaignFormData, value: any) => {
    setValidationErrors([])
    setIsContentSafe(true)

    if (typeof value === 'string') {
      // XSS 패턴 검사
      if (!validateInputSecurity(field, value)) {
        toast.error(`${field}에 허용되지 않는 문자가 포함되어 있습니다.`)
        return
      }

      // 필드별 특별 처리
      let sanitizedValue = value
      if (field === 'title' || field === 'description') {
        sanitizedValue = sanitizeText(value)
      } else if (field === 'post_template') {
        sanitizedValue = sanitizeHtml(value, { allowedTags: ['br'], allowedAttributes: [] })
      } else if (field === 'original_url' || field === 'image_url') {
        sanitizedValue = escapeUrl(value)
        if (sanitizedValue === '' && value !== '') {
          toast.error('유효하지 않은 URL 형식입니다.')
          return
        }
      }

      setFormData(prev => ({ ...prev, [field]: sanitizedValue }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }
  
  // 추천 해시태그
  const recommendedHashtags = [
    '#일상', '#소통', '#좋아요', '#팔로우', '#맞팔', 
    '#인스타그램', '#데일리', '#라이프', '#추천', '#공유',
    '#이벤트', '#체험', '#리뷰', '#신상', '#득템',
    '#꿀팁', '#정보', '#트렌드', '#핫플', '#맛집'
  ]

  // 포스팅 템플릿 예시
  const templateExamples = [
    "오늘 발견한 좋은 정보 공유해요! 🎉\n정말 유용한 것 같아서 올려봅니다 ✨\n\n{링크}\n\n여러분도 한번 확인해보세요! 😊",
    "이거 진짜 괜찮네요! 👍\n친구들한테도 추천하고 싶어서 공유합니다 💝\n\n{링크}\n\n도움이 되시길 바라요! 🙏",
    "요즘 핫한 거 찾았어요! 🔥\n너무 좋아서 바로 공유드려요 ⭐\n\n{링크}\n\n많은 분들이 관심 가질 것 같아요! 😍"
  ]
  
  const calculatePeriod = () => {
    if (formData.start_date && formData.end_date) {
      const diffTime = Math.abs(formData.end_date.getTime() - formData.start_date.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays
    }
    return 0
  }

  // Auto-calculate budget when quantity changes
  useEffect(() => {
    if (formData.total_clicks_target && formData.cost_per_click) {
      const newTotalBudget = formData.total_clicks_target * formData.cost_per_click
      const period = calculatePeriod()
      const newDailyBudget = period > 0 ? Math.ceil(newTotalBudget / period) : 0
      
      setFormData(prev => ({
        ...prev,
        total_budget: newTotalBudget,
        daily_budget: newDailyBudget
      }))
    }
  }, [formData.total_clicks_target, formData.cost_per_click, formData.start_date, formData.end_date])

  const addHashtag = (hashtag: string) => {
    if (formData.hashtags.length >= 10) {
      toast.error('해시태그는 최대 10개까지만 선택 가능합니다.')
      return
    }

    // 해시태그 XSS 검증
    if (!validateInputSecurity('hashtag', hashtag)) {
      toast.error('해시태그에 허용되지 않는 문자가 포함되어 있습니다.')
      return
    }

    const sanitizedHashtag = sanitizeText(hashtag)
    if (!formData.hashtags.includes(sanitizedHashtag)) {
      setFormData(prev => ({
        ...prev,
        hashtags: [...prev.hashtags, sanitizedHashtag]
      }))
    }
  }

  const removeHashtag = (hashtag: string) => {
    setFormData(prev => ({
      ...prev,
      hashtags: prev.hashtags.filter(tag => tag !== hashtag)
    }))
  }

  const addCustomHashtag = () => {
    if (formData.hashtags.length >= 10) {
      toast.error('해시태그는 최대 10개까지만 선택 가능합니다.')
      return
    }
    
    if (!customHashtag.trim()) return

    // 커스텀 해시태그 XSS 검증
    if (!validateInputSecurity('custom_hashtag', customHashtag)) {
      toast.error('해시태그에 허용되지 않는 문자가 포함되어 있습니다.')
      return
    }

    const cleanHashtag = sanitizeText(customHashtag.trim())
    const hashtag = cleanHashtag.startsWith('#') ? cleanHashtag : `#${cleanHashtag}`
    
    // 해시태그 길이 및 패턴 검증
    if (hashtag.length > 30) {
      toast.error('해시태그는 30자를 초과할 수 없습니다.')
      return
    }

    // 해시태그에 허용되지 않는 문자 체크 (영문, 숫자, 한글, _ 만 허용)
    if (!/^#[a-zA-Z0-9가-힣_]+$/.test(hashtag)) {
      toast.error('해시태그는 영문, 숫자, 한글, _만 사용할 수 있습니다.')
      return
    }
    
    if (!formData.hashtags.includes(hashtag)) {
      setFormData(prev => ({
        ...prev,
        hashtags: [...prev.hashtags, hashtag]
      }))
      setCustomHashtag('')
    }
  }

  const useTemplate = (template: string) => {
    setFormData(prev => ({ ...prev, post_template: template }))
    toast.success('템플릿이 적용되었습니다!')
  }

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template)
    setFormData(prev => ({
      ...prev,
      post_template: template.content,
      hashtags: [...new Set([...prev.hashtags, ...template.hashtags])],
      image_url: template.image_url || prev.image_url
    }))
    setShowTemplateManager(false)
    toast.success(`템플릿 "${template.name}"이 적용되었습니다!`)
  }

  const handleDeeplinkCreated = (deeplink: Deeplink) => {
    setGeneratedDeeplink(deeplink)
    setFormData(prev => ({
      ...prev,
      original_url: deeplink.original_url
    }))
    setShowDeeplinkGenerator(false)
  }

  const getPreviewText = () => {
    let preview = formData.post_template.replace('{링크}', generatedDeeplink?.deeplink_url || formData.original_url || '[링크 주소]')
    
    // Replace other common variables
    preview = preview.replace('{제품명}', formData.title || '[제품명]')
    preview = preview.replace('{설명}', formData.description || '[제품 설명]')
    
    if (formData.hashtags.length > 0) {
      preview += '\n\n' + formData.hashtags.join(' ')
    }
    
    return preview
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.title || !formData.original_url || !formData.total_clicks_target || !formData.start_date || !formData.end_date) {
      toast.error('기본 정보를 모두 입력해주세요.')
      return
    }

    if (!formData.post_template.trim()) {
      toast.error('SNS 포스팅 템플릿을 작성해주세요.')
      return
    }

    if (formData.total_clicks_target <= 0) {
      toast.error('목표 클릭수는 0보다 큰 값을 입력해주세요.')
      return
    }

    if (formData.end_date <= formData.start_date) {
      toast.error('종료일은 시작일보다 늦어야 합니다.')
      return
    }

    // 최종 XSS 검증
    if (!isContentSafe || validationErrors.length > 0) {
      toast.error('입력된 내용에 문제가 있습니다. 다시 확인해주세요.')
      return
    }

    setIsSubmitting(true)
    try {
      // 데이터 정화
      const sanitizedFormData = sanitizeCampaignData({
        ...formData,
        hashtags: formData.hashtags.map(tag => sanitizeText(tag))
      })

      // Create campaign
      const campaignResult = await campaignApi.createCampaign(advertiserId, sanitizedFormData)
      
      if (campaignResult.error) {
        toast.error('캠페인 생성 중 오류가 발생했습니다.')
        return
      }

      const campaign = campaignResult.data!

      // Auto-generate deeplink if enabled and not already created
      if (enableAutoDeeplink && !generatedDeeplink) {
        const deeplinkResult = await deeplinkApi.createDeeplink(campaign.id, {
          original_url: formData.original_url,
          title: formData.title,
          description: formData.description,
          generate_qr: true,
          generate_short_url: true,
          utm_parameters: {
            utm_source: 'treit',
            utm_medium: 'social',
            utm_campaign: formData.title.toLowerCase().replace(/\s+/g, '_')
          }
        })
        
        if (deeplinkResult.data) {
          setGeneratedDeeplink(deeplinkResult.data)
        }
      }

      toast.success('캠페인이 성공적으로 생성되었습니다!')
      onSuccess()
      
    } catch (error) {
      console.error('Create campaign error:', error)
      toast.error('캠페인 생성 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1>새 캠페인 추가</h1>
        <p className="text-muted-foreground">소비자들이 자연스럽게 SNS에 올릴 포스팅 템플릿을 작성하세요</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">캠페인 이름</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleSafeInput('title', e.target.value)}
                  placeholder="캠페인 이름을 입력하세요"
                  maxLength={100}
                />
                {validationErrors.some(error => error.includes('title')) && (
                  <p className="text-xs text-red-500">
                    유효하지 않은 문자가 포함되어 있습니다.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">캠페인 설명 (선택사항)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleSafeInput('description', e.target.value)}
                  placeholder="캠페인에 대한 간단한 설명을 입력하세요"
                  rows={2}
                  maxLength={500}
                />
                {validationErrors.some(error => error.includes('description')) && (
                  <p className="text-xs text-red-500">
                    유효하지 않은 문자가 포함되어 있습니다.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="original_url">원본 URL</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeeplinkGenerator(true)}
                    >
                      <Link className="w-4 h-4 mr-2" />
                      딥링크 생성
                    </Button>
                    {generatedDeeplink && (
                      <Badge variant="secondary" className="text-xs">
                        딥링크 생성됨
                      </Badge>
                    )}
                  </div>
                </div>
                <Input
                  id="original_url"
                  type="url"
                  value={formData.original_url}
                  onChange={(e) => handleSafeInput('original_url', e.target.value)}
                  placeholder="https://example.com"
                  readOnly={!!generatedDeeplink}
                />
                {validationErrors.some(error => error.includes('original_url')) && (
                  <p className="text-xs text-red-500">
                    유효하지 않은 URL 형식입니다.
                  </p>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>소비자들이 포스팅과 함께 공유할 원본 주소입니다</span>
                  {generatedDeeplink && (
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">✓ 추적 가능한 딥링크로 변환됨</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(generatedDeeplink.deeplink_url)}
                        className="h-6 px-2"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="total_clicks_target">목표 클릭수</Label>
                  <Input
                    id="total_clicks_target"
                    type="number"
                    value={formData.total_clicks_target}
                    onChange={(e) => setFormData(prev => ({ ...prev, total_clicks_target: parseInt(e.target.value) || 0 }))}
                    placeholder="1000"
                    min="1"
                  />
                  <p className="text-xs text-muted-foreground">
                    클릭당 ₩{formData.cost_per_click.toLocaleString()}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image_url">이미지 URL (선택사항)</Label>
                  <Input
                    id="image_url"
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => handleSafeInput('image_url', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                  {validationErrors.some(error => error.includes('image_url')) && (
                    <p className="text-xs text-red-500">
                      유효하지 않은 URL 형식입니다.
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    포스팅에 첨부할 이미지
                  </p>
                </div>
              </div>

              {/* 집행 기간 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>시작일</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.start_date ? (
                          format(formData.start_date, "PPP", { locale: ko })
                        ) : (
                          <span>날짜 선택</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.start_date || undefined}
                        onSelect={(date) => setFormData(prev => ({ ...prev, start_date: date || null }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>종료일</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.end_date ? (
                          format(formData.end_date, "PPP", { locale: ko })
                        ) : (
                          <span>날짜 선택</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.end_date || undefined}
                        onSelect={(date) => setFormData(prev => ({ ...prev, end_date: date || null }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SNS 포스팅 템플릿 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                SNS 포스팅 템플릿
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                소비자들이 자신의 SNS에 올릴 기본 템플릿을 작성하세요
              </p>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="write">
                <TabsList>
                  <TabsTrigger value="write">직접 작성</TabsTrigger>
                  <TabsTrigger value="templates">템플릿 선택</TabsTrigger>
                </TabsList>
                
                <TabsContent value="write" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="template">포스팅 내용</Label>
                    <SafeHTMLInput
                      value={formData.post_template}
                      onChange={(value, isValid) => {
                        setFormData(prev => ({ ...prev, post_template: value }))
                        setIsContentSafe(isValid)
                      }}
                      placeholder="예: 오늘 발견한 좋은 정보 공유해요! 🎉&#10;정말 유용한 것 같아서 올려봅니다 ✨&#10;&#10;{링크}&#10;&#10;여러분도 한번 확인해보세요! 😊"
                      className="min-h-[150px] w-full p-3 border border-input rounded-md"
                      mode="basic"
                      maxLength={2000}
                    />
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" />
                        <span>사용 가능한 변수: {'{링크}'}, {'{제품명}'}, {'{설명}'}</span>
                      </div>
                      {enableAutoDeeplink && (
                        <div className="flex items-center gap-2 text-green-600">
                          <Check className="w-4 h-4" />
                          <span>캠페인 생성 시 자동으로 추적 가능한 딥링크가 생성됩니다</span>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="templates" className="space-y-4">
                  <div className="space-y-3">
                    {templateExamples.map((template, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <p className="text-sm whitespace-pre-line mb-3">{template}</p>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => useTemplate(template)}
                        >
                          이 템플릿 사용
                        </Button>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* 해시태그 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="w-5 h-5" />
                해시태그
                <Badge variant="outline" className="ml-auto">
                  {formData.hashtags.length}/10
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                포스팅에 추가할 해시태그를 선택하세요 (최대 10개까지)
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 선택된 해시태그 */}
              {formData.hashtags.length > 0 && (
                <div className="space-y-2">
                  <Label>선택된 해시태그</Label>
                  <div className="flex flex-wrap gap-2">
                    {formData.hashtags.map((hashtag) => (
                      <Badge key={hashtag} variant="secondary" className="cursor-pointer hover:bg-destructive/20">
                        {hashtag}
                        <X 
                          className="w-3 h-3 ml-1 hover:text-destructive" 
                          onClick={() => removeHashtag(hashtag)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* 커스텀 해시태그 추가 */}
              <div className="space-y-2">
                <Label>직접 추가</Label>
                <div className="flex gap-2">
                  <Input
                    value={customHashtag}
                    onChange={(e) => setCustomHashtag(e.target.value)}
                    placeholder="해시태그 입력 (# 없이)"
                    onKeyPress={(e) => e.key === 'Enter' && addCustomHashtag()}
                    disabled={formData.hashtags.length >= 10}
                    maxLength={29} // # 포함해서 30자
                  />
                  <Button 
                    type="button" 
                    size="sm" 
                    onClick={addCustomHashtag}
                    disabled={!customHashtag.trim() || formData.hashtags.length >= 10}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {formData.hashtags.length >= 10 && (
                  <p className="text-xs text-destructive">
                    해시태그 10개를 모두 선택했습니다. 추가하려면 기존 해시태그를 삭제해주세요.
                  </p>
                )}
              </div>

              {/* 추천 해시태그 */}
              <div className="space-y-2">
                <Label>추천 해시태그</Label>
                <div className="flex flex-wrap gap-2">
                  {recommendedHashtags.map((hashtag) => {
                    const isSelected = formData.hashtags.includes(hashtag)
                    const isDisabled = formData.hashtags.length >= 10 && !isSelected
                    
                    return (
                      <Badge 
                        key={hashtag} 
                        variant={isSelected ? "default" : "outline"}
                        className={`cursor-pointer transition-colors ${
                          isDisabled 
                            ? 'opacity-50 cursor-not-allowed' 
                            : isSelected 
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-primary hover:text-primary-foreground'
                        }`}
                        onClick={() => !isDisabled && addHashtag(hashtag)}
                      >
                        {hashtag}
                        {isSelected && <X className="w-3 h-3 ml-1" onClick={(e) => {
                          e.stopPropagation()
                          removeHashtag(hashtag)
                        }} />}
                      </Badge>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  선택된 해시태그를 클릭하면 제거됩니다
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview & Summary */}
        <div className="lg:col-span-1 space-y-6">
          {/* 포스팅 미리보기 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                포스팅 미리보기
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-muted rounded-lg">
                <div className="space-y-3">
                  {formData.image_url && (
                    <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                      <SafeImage 
                        src={formData.image_url} 
                        alt="포스팅 이미지" 
                        className="w-full h-full object-cover rounded-lg"
                        fallbackSrc="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIxIDEyQTkgOSAwIDEgMSAzIDEyQTkgOSAwIDAgMSAyMSAxMloiIGZpbGw9IiNmM2Y0ZjYiLz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIxIDEyQTkgOSAwIDEgMSAzIDEyQTkgOSAwIDAgMSAyMSAxMloiIGZpbGw9IiNmM2Y0ZjYiLz4K"
                      />
                    </div>
                  )}
                  
                  <SafeHTML
                    html={getPreviewText() || '포스팅 템플릿을 작성하면 여기에 미리보기가 표시됩니다.'}
                    mode="text"
                    className="text-sm whitespace-pre-line"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 비용 요약 */}
          <Card>
            <CardHeader>
              <CardTitle>비용 요약</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>포스팅 수량:</span>
                  <span>{parseInt(formData.quantity).toLocaleString() || 0}개</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>포스팅당 단가:</span>
                  <span>₩{postingPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>집행 기간:</span>
                  <span>{calculatePeriod()}일</span>
                </div>
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>총 결제 금액:</span>
                  <span>₩{totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 가이드라인 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                포스팅 가이드라인
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• 자연스럽고 친근한 톤으로 작성하세요</p>
                <p>• 광고임을 노골적으로 드러내지 마세요</p>
                <p>• 이모지를 적절히 활용하세요</p>
                <p>• 해시태그는 최대 10개까지 선택 가능합니다</p>
                <p>• 개인적인 경험처럼 작성하세요</p>
              </div>
            </CardContent>
          </Card>

          {/* 버튼 */}
          <div className="space-y-3">
            <Button onClick={handleSubmit} className="w-full" size="lg">
              <Check className="w-4 h-4 mr-2" />
              캠페인 생성
            </Button>
            <Button type="button" variant="outline" onClick={onSuccess} className="w-full">
              취소
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}