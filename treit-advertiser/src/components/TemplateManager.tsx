import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Switch } from './ui/switch'
import { Progress } from './ui/progress'
import { Separator } from './ui/separator'
import { 
  Plus, 
  Search, 
  Filter, 
  Star,
  Copy,
  Edit3,
  Trash2,
  BarChart3,
  Eye,
  Heart,
  TrendingUp,
  TrendingDown,
  Minus,
  Instagram,
  Facebook,
  Twitter,
  Smartphone,
  Loader2,
  Check,
  X,
  Lightbulb,
  Hash
} from 'lucide-react'
import { toast } from 'sonner'
import { templateApi } from '../lib/api/templates'
import type { Template, TemplateFormData, TemplateFilters, TemplateVariant, TemplatePerformance } from '../types/template'

interface TemplateManagerProps {
  advertiserId: string
  onTemplateSelect?: (template: Template) => void
  mode?: 'manage' | 'select'
}

export function TemplateManager({ advertiserId, onTemplateSelect, mode = 'manage' }: TemplateManagerProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [filters, setFilters] = useState<TemplateFilters>({
    sort_by: 'created_at',
    sort_order: 'desc'
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  // Template form state
  const [templateForm, setTemplateForm] = useState<TemplateFormData>({
    name: '',
    content: '',
    variables: [],
    hashtags: [],
    platform: 'universal',
    category: 'general',
    image_url: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newHashtag, setNewHashtag] = useState('')

  // Load templates on component mount and when filters change
  useEffect(() => {
    loadTemplates()
  }, [filters, searchQuery, selectedPlatform, selectedCategory, showFavoritesOnly])

  const loadTemplates = async () => {
    setIsLoading(true)
    try {
      const appliedFilters: TemplateFilters = {
        ...filters,
        search: searchQuery || undefined,
        platform: selectedPlatform !== 'all' ? [selectedPlatform as any] : undefined,
        category: selectedCategory !== 'all' ? [selectedCategory] : undefined,
        is_favorite: showFavoritesOnly || undefined
      }

      const result = await templateApi.getTemplates(advertiserId, appliedFilters)
      if (result.error) {
        toast.error('템플릿을 불러오는 중 오류가 발생했습니다.')
        return
      }

      setTemplates(result.data || [])
    } catch (error) {
      console.error('Load templates error:', error)
      toast.error('템플릿을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateTemplate = async () => {
    if (!templateForm.name.trim() || !templateForm.content.trim()) {
      toast.error('템플릿 이름과 내용을 입력해주세요.')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await templateApi.createTemplate(advertiserId, templateForm)
      
      if (result.error) {
        toast.error('템플릿 생성 중 오류가 발생했습니다.')
        return
      }

      toast.success('템플릿이 성공적으로 생성되었습니다!')
      setIsCreateDialogOpen(false)
      resetTemplateForm()
      loadTemplates()
    } catch (error) {
      console.error('Create template error:', error)
      toast.error('템플릿 생성 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateTemplate = async () => {
    if (!selectedTemplate) return

    setIsSubmitting(true)
    try {
      const result = await templateApi.updateTemplate(selectedTemplate.id, templateForm)
      
      if (result.error) {
        toast.error('템플릿 수정 중 오류가 발생했습니다.')
        return
      }

      toast.success('템플릿이 성공적으로 수정되었습니다!')
      setIsEditDialogOpen(false)
      resetTemplateForm()
      loadTemplates()
    } catch (error) {
      console.error('Update template error:', error)
      toast.error('템플릿 수정 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('정말로 이 템플릿을 삭제하시겠습니까?')) return

    try {
      const result = await templateApi.deleteTemplate(templateId)
      
      if (result.error) {
        toast.error('템플릿 삭제 중 오류가 발생했습니다.')
        return
      }

      toast.success('템플릿이 삭제되었습니다.')
      loadTemplates()
    } catch (error) {
      console.error('Delete template error:', error)
      toast.error('템플릿 삭제 중 오류가 발생했습니다.')
    }
  }

  const handleToggleFavorite = async (templateId: string, isFavorite: boolean) => {
    try {
      const result = await templateApi.toggleFavorite(templateId, !isFavorite)
      
      if (result.error) {
        toast.error('즐겨찾기 설정 중 오류가 발생했습니다.')
        return
      }

      toast.success(isFavorite ? '즐겨찾기에서 제거되었습니다.' : '즐겨찾기에 추가되었습니다.')
      loadTemplates()
    } catch (error) {
      console.error('Toggle favorite error:', error)
      toast.error('즐겨찾기 설정 중 오류가 발생했습니다.')
    }
  }

  const handleDuplicateTemplate = async (template: Template) => {
    const newName = prompt('복사할 템플릿의 이름을 입력하세요:', `${template.name} (복사본)`)
    if (!newName) return

    try {
      const result = await templateApi.duplicateTemplate(template.id, newName)
      
      if (result.error) {
        toast.error('템플릿 복사 중 오류가 발생했습니다.')
        return
      }

      toast.success('템플릿이 복사되었습니다.')
      loadTemplates()
    } catch (error) {
      console.error('Duplicate template error:', error)
      toast.error('템플릿 복사 중 오류가 발생했습니다.')
    }
  }

  const resetTemplateForm = () => {
    setTemplateForm({
      name: '',
      content: '',
      variables: [],
      hashtags: [],
      platform: 'universal',
      category: 'general',
      image_url: ''
    })
    setSelectedTemplate(null)
  }

  const openEditDialog = (template: Template) => {
    setSelectedTemplate(template)
    setTemplateForm({
      name: template.name,
      content: template.content,
      variables: template.variables || [],
      hashtags: template.hashtags || [],
      platform: template.platform,
      category: template.category,
      image_url: template.image_url || ''
    })
    setIsEditDialogOpen(true)
  }

  const addHashtag = () => {
    if (!newHashtag.trim()) return
    
    const hashtag = newHashtag.startsWith('#') ? newHashtag : `#${newHashtag}`
    if (!templateForm.hashtags.includes(hashtag)) {
      setTemplateForm(prev => ({
        ...prev,
        hashtags: [...prev.hashtags, hashtag]
      }))
    }
    setNewHashtag('')
  }

  const removeHashtag = (hashtag: string) => {
    setTemplateForm(prev => ({
      ...prev,
      hashtags: prev.hashtags.filter(tag => tag !== hashtag)
    }))
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram': return <Instagram className="w-4 h-4" />
      case 'facebook': return <Facebook className="w-4 h-4" />
      case 'twitter': return <Twitter className="w-4 h-4" />
      default: return <Smartphone className="w-4 h-4" />
    }
  }

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'instagram': return 'bg-gradient-to-r from-purple-500 to-pink-500'
      case 'facebook': return 'bg-blue-600'
      case 'twitter': return 'bg-sky-500'
      default: return 'bg-gray-600'
    }
  }

  const getPerformanceColor = (score?: number) => {
    if (!score) return 'text-gray-500'
    if (score >= 80) return 'text-green-500'
    if (score >= 60) return 'text-yellow-500'
    return 'text-red-500'
  }

  const TemplateDialog = ({ isOpen, onOpenChange, isEdit = false }: { isOpen: boolean, onOpenChange: (open: boolean) => void, isEdit?: boolean }) => (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? '템플릿 수정' : '새 템플릿 생성'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 기본 정보 */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="templateName">템플릿 이름</Label>
                <Input
                  id="templateName"
                  placeholder="템플릿 이름"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="templateCategory">카테고리</Label>
                <Select
                  value={templateForm.category}
                  onValueChange={(value) => setTemplateForm(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">일반</SelectItem>
                    <SelectItem value="promotion">프로모션</SelectItem>
                    <SelectItem value="event">이벤트</SelectItem>
                    <SelectItem value="review">리뷰</SelectItem>
                    <SelectItem value="lifestyle">라이프스타일</SelectItem>
                    <SelectItem value="fashion">패션</SelectItem>
                    <SelectItem value="food">음식</SelectItem>
                    <SelectItem value="tech">기술</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="templatePlatform">플랫폼</Label>
                <Select
                  value={templateForm.platform}
                  onValueChange={(value) => setTemplateForm(prev => ({ ...prev, platform: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="universal">전체 플랫폼</SelectItem>
                    <SelectItem value="instagram">인스타그램</SelectItem>
                    <SelectItem value="facebook">페이스북</SelectItem>
                    <SelectItem value="twitter">트위터</SelectItem>
                    <SelectItem value="tiktok">틱톡</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="templateImage">이미지 URL (선택사항)</Label>
                <Input
                  id="templateImage"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={templateForm.image_url}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, image_url: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* 템플릿 내용 */}
          <div className="space-y-2">
            <Label htmlFor="templateContent">템플릿 내용</Label>
            <Textarea
              id="templateContent"
              placeholder="포스팅 템플릿 내용을 작성하세요...&#10;&#10;{링크} - 딥링크가 들어갈 위치&#10;{제품명} - 변수 예시"
              rows={8}
              value={templateForm.content}
              onChange={(e) => setTemplateForm(prev => ({ ...prev, content: e.target.value }))}
            />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lightbulb className="w-4 h-4" />
              <span>변수는 {'{변수명}'} 형태로 입력하세요. 예: {'{링크}'}, {'{제품명}'}</span>
            </div>
          </div>

          {/* 해시태그 */}
          <div className="space-y-4">
            <Label>해시태그</Label>
            
            {/* 선택된 해시태그 */}
            {templateForm.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {templateForm.hashtags.map((hashtag) => (
                  <Badge key={hashtag} variant="secondary" className="cursor-pointer">
                    {hashtag}
                    <X 
                      className="w-3 h-3 ml-1" 
                      onClick={() => removeHashtag(hashtag)}
                    />
                  </Badge>
                ))}
              </div>
            )}

            {/* 해시태그 추가 */}
            <div className="flex gap-2">
              <Input
                placeholder="해시태그 입력 (# 없이)"
                value={newHashtag}
                onChange={(e) => setNewHashtag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addHashtag()}
              />
              <Button type="button" variant="outline" onClick={addHashtag}>
                <Hash className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button 
              onClick={isEdit ? handleUpdateTemplate : handleCreateTemplate}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEdit ? '수정 중...' : '생성 중...'}
                </>
              ) : (
                isEdit ? '수정' : '생성'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )

  return (
    <div className="space-y-6">
      {/* 헤더 및 필터 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">템플릿 관리</h2>
          <p className="text-muted-foreground">
            {mode === 'select' ? '캠페인에 사용할 템플릿을 선택하세요' : 'SNS 포스팅 템플릿을 관리하세요'}
          </p>
        </div>
        
        {mode === 'manage' && (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            새 템플릿
          </Button>
        )}
      </div>

      {/* 검색 및 필터 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="템플릿 이름 또는 내용으로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="플랫폼" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 플랫폼</SelectItem>
                  <SelectItem value="universal">전체 플랫폼</SelectItem>
                  <SelectItem value="instagram">인스타그램</SelectItem>
                  <SelectItem value="facebook">페이스북</SelectItem>
                  <SelectItem value="twitter">트위터</SelectItem>
                  <SelectItem value="tiktok">틱톡</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="카테고리" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 카테고리</SelectItem>
                  <SelectItem value="general">일반</SelectItem>
                  <SelectItem value="promotion">프로모션</SelectItem>
                  <SelectItem value="event">이벤트</SelectItem>
                  <SelectItem value="review">리뷰</SelectItem>
                  <SelectItem value="lifestyle">라이프스타일</SelectItem>
                  <SelectItem value="fashion">패션</SelectItem>
                  <SelectItem value="food">음식</SelectItem>
                  <SelectItem value="tech">기술</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={showFavoritesOnly}
                    onCheckedChange={setShowFavoritesOnly}
                  />
                  <Label>즐겨찾기만 보기</Label>
                </div>
              </div>

              <Select 
                value={`${filters.sort_by}_${filters.sort_order}`} 
                onValueChange={(value) => {
                  const [sort_by, sort_order] = value.split('_')
                  setFilters(prev => ({ ...prev, sort_by: sort_by as any, sort_order: sort_order as any }))
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at_desc">최신순</SelectItem>
                  <SelectItem value="created_at_asc">오래된순</SelectItem>
                  <SelectItem value="name_asc">이름순</SelectItem>
                  <SelectItem value="performance_desc">성능순</SelectItem>
                  <SelectItem value="usage_desc">사용빈도순</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 템플릿 목록 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Plus className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">템플릿이 없습니다</p>
              <p className="text-sm">첫 번째 템플릿을 생성해보세요!</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="group cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded text-white ${getPlatformColor(template.platform)}`}>
                      {getPlatformIcon(template.platform)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{template.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {template.category}
                        </Badge>
                        {template.performance_score && (
                          <Badge variant="outline" className={`text-xs ${getPerformanceColor(template.performance_score)}`}>
                            {template.performance_score}점
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleFavorite(template.id, template.is_favorite)
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Heart className={`w-4 h-4 ${template.is_favorite ? 'fill-current text-red-500' : ''}`} />
                    </Button>

                    {mode === 'manage' && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditDialog(template)
                          }}
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDuplicateTemplate(template)
                          }}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteTemplate(template.id)
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent 
                className="space-y-4"
                onClick={() => {
                  if (mode === 'select' && onTemplateSelect) {
                    onTemplateSelect(template)
                  }
                }}
              >
                {/* 템플릿 내용 미리보기 */}
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm whitespace-pre-line line-clamp-3">
                    {template.content}
                  </p>
                </div>

                {/* 해시태그 */}
                {template.hashtags && template.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {template.hashtags.slice(0, 5).map((hashtag) => (
                      <Badge key={hashtag} variant="secondary" className="text-xs">
                        {hashtag}
                      </Badge>
                    ))}
                    {template.hashtags.length > 5 && (
                      <Badge variant="secondary" className="text-xs">
                        +{template.hashtags.length - 5}
                      </Badge>
                    )}
                  </div>
                )}

                {/* 통계 */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span>사용: {template.usage_count}</span>
                    {template.performance_score !== undefined && (
                      <div className="flex items-center gap-1">
                        <BarChart3 className="w-3 h-3" />
                        {template.performance_score >= 80 ? (
                          <TrendingUp className="w-3 h-3 text-green-500" />
                        ) : template.performance_score < 60 ? (
                          <TrendingDown className="w-3 h-3 text-red-500" />
                        ) : (
                          <Minus className="w-3 h-3 text-yellow-500" />
                        )}
                      </div>
                    )}
                  </div>
                  
                  {mode === 'select' && (
                    <Button size="sm" variant="outline">
                      <Check className="w-4 h-4 mr-1" />
                      선택
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 템플릿 생성 다이얼로그 */}
      <TemplateDialog
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        isEdit={false}
      />

      {/* 템플릿 수정 다이얼로그 */}
      <TemplateDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        isEdit={true}
      />
    </div>
  )
}