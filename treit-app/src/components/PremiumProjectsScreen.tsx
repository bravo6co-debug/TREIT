import React, { useState } from 'react';
import { ArrowLeft, Copy, Edit, ExternalLink, DollarSign, Clock, Star, Zap } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { toast } from 'sonner';

interface PremiumProject {
  id: number;
  company: string;
  title: string;
  description: string;
  content: string;
  link: string;
  cpc: number;
  premium: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: string;
  requirements: string[];
  bonus?: number;
}

interface PremiumProjectsScreenProps {
  onBack: () => void;
}

export default function PremiumProjectsScreen({ onBack }: PremiumProjectsScreenProps) {
  const [selectedProject, setSelectedProject] = useState<PremiumProject | null>(null);

  const premiumProjects: PremiumProject[] = [
    {
      id: 1,
      company: '스타벅스 코리아',
      title: '신메뉴 런칭 캠페인',
      description: '스타벅스 신메뉴에 대한 인스타그램 스토리 및 피드 홍보',
      content: '🌟 스타벅스 신메뉴가 출시되었어요! ☕️\n\n달콤한 카라멜 마키아토와 함께하는 특별한 하루 💝\n맛있는 커피와 함께 여러분의 하루를 더욱 달콤하게 만들어보세요!\n\n#스타벅스 #신메뉴 #카라멜마키아토 #커피타임',
      link: 'https://www.starbucks.co.kr/menu/new',
      cpc: 1200,
      premium: true,
      difficulty: 'medium',
      estimatedTime: '30분',
      requirements: ['팔로워 1000명 이상', '카페 관련 포스팅 경험', '고퀄리티 사진 촬영 가능'],
      bonus: 500
    },
    {
      id: 2,
      company: '나이키 코리아',
      title: '에어맥스 신상품 홍보',
      description: '나이키 에어맥스 신상품에 대한 인스타그램 리뷰 포스팅',
      content: '👟 NEW 나이키 에어맥스 2024 출시! 🔥\n\n혁신적인 디자인과 최고의 편안함을 경험해보세요!\n운동할 때도, 일상에서도 완벽한 스타일링이 가능해요 ✨\n\n지금 나이키 매장과 온라인에서 만나보실 수 있습니다!\n\n#나이키 #에어맥스 #신상품 #운동화 #스포츠패션',
      link: 'https://www.nike.com/kr/airmax',
      cpc: 2500,
      premium: true,
      difficulty: 'hard',
      estimatedTime: '1시간',
      requirements: ['팔로워 5000명 이상', '패션/스포츠 관련 포스팅 경험', '브랜드 협업 경험'],
      bonus: 1000
    },
    {
      id: 3,
      company: '올리브영',
      title: '뷰티 신상품 체험단',
      description: '올리브영 뷰티 신상품 체험 후 인스타그램 리뷰',
      content: '💄 올리브영 HOT 신상품 체험 후기! ✨\n\n이번에 체험해본 제품들이 정말 대박이에요! 💕\n특히 이 립스틱은 발색도 좋고 지속력도 완벽해요 👄\n\n여러분도 올리브영에서 만나보세요!\n제품 정보는 링크 확인! 🔗\n\n#올리브영 #뷰티 #화장품리뷰 #신상품',
      link: 'https://www.oliveyoung.co.kr/new',
      cpc: 800,
      premium: true,
      difficulty: 'easy',
      estimatedTime: '45분',
      requirements: ['팔로워 500명 이상', '뷰티 관련 포스팅 경험'],
      bonus: 200
    },
    {
      id: 4,
      company: '배달의민족',
      title: '신규 레스토랑 홍보',
      description: '배달의민족 신규 입점 레스토랑 주문 후 리뷰',
      content: '🍔 배민에 새로 입점한 맛집 발견! 🎉\n\n진짜 맛있어서 깜짝 놀랐어요! 😋\n특히 이 버거는 패티가 정말 육즙이 가득하고\n소스도 완벽한 조화를 이뤄요! 👌\n\n여러분도 꼭 주문해보세요!\n첫 주문 할인도 있다고 하니까 놓치지 마세요! 💰\n\n#배달의민족 #맛집 #버거 #신상맛집',
      link: 'https://www.baemin.com/new-restaurant',
      cpc: 1500,
      premium: true,
      difficulty: 'medium',
      estimatedTime: '1시간 30분',
      requirements: ['팔로워 2000명 이상', '음식 리뷰 경험', '실제 주문 후 리뷰 작성'],
      bonus: 700
    }
  ];

  const handleCopyContent = (project: PremiumProject) => {
    navigator.clipboard.writeText(project.content);
    toast.success('홍보 내용이 클립보드에 복사되었습니다!');
  };

  const handleCopyLink = (project: PremiumProject) => {
    navigator.clipboard.writeText(project.link);
    toast.success('링크가 클립보드에 복사되었습니다!');
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'hard': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '쉬움';
      case 'medium': return '보통';
      case 'hard': return '어려움';
      default: return '보통';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 shadow-lg">
        <div className="flex items-center mb-2">
          <button onClick={onBack} className="mr-3">
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center">
            <Zap size={24} className="mr-2 text-yellow-300" />
            <h1 className="text-lg font-semibold">프리미엄 프로젝트</h1>
          </div>
        </div>
        <p className="text-purple-100 text-sm ml-10">고수익 프리미엄 미션에 도전해보세요!</p>
      </div>

      {/* Premium Benefits Banner */}
      <div className="p-4">
        <Card className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
          <div className="flex items-center mb-2">
            <Star size={20} className="text-amber-500 mr-2" />
            <h3 className="font-semibold text-amber-800">프리미엄 혜택</h3>
          </div>
          <div className="text-sm text-amber-700 space-y-1">
            <div>• 일반 프로젝트 대비 최대 3배 높은 수익</div>
            <div>• 완료 시 보너스 XP 추가 지급</div>
            <div>• 우선 검토 및 빠른 승인</div>
          </div>
        </Card>
      </div>

      {/* Premium Projects List */}
      <div className="px-4 space-y-4 mb-20">
        {premiumProjects.map((project) => (
          <Card key={project.id} className="p-4 hover:shadow-md transition-shadow border-l-4 border-l-purple-500">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <Badge className="bg-purple-100 text-purple-700 mr-2">
                    PREMIUM
                  </Badge>
                  <Badge className={getDifficultyColor(project.difficulty)}>
                    {getDifficultyText(project.difficulty)}
                  </Badge>
                </div>
                <h3 className="text-lg font-semibold text-gray-800">{project.company}</h3>
                <p className="text-gray-600 mb-2">{project.title}</p>
                <p className="text-sm text-gray-500 mb-3">{project.description}</p>
              </div>
            </div>

            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center text-sm text-gray-600 space-x-4">
                <div className="flex items-center">
                  <DollarSign size={16} className="mr-1 text-green-500" />
                  <span className="font-semibold text-green-600">₩{project.cpc.toLocaleString()}</span>
                  {project.bonus && (
                    <span className="text-xs text-orange-600 ml-1">+{project.bonus}XP</span>
                  )}
                </div>
                <div className="flex items-center">
                  <Clock size={16} className="mr-1 text-blue-500" />
                  <span>{project.estimatedTime}</span>
                </div>
              </div>
            </div>

            <div className="mb-3">
              <p className="text-sm font-medium text-gray-700 mb-1">필수 조건:</p>
              <div className="text-xs text-gray-600">
                {project.requirements.map((req, index) => (
                  <div key={index}>• {req}</div>
                ))}
              </div>
            </div>

            <div className="flex space-x-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                    onClick={() => setSelectedProject(project)}
                  >
                    <Edit size={16} className="mr-1" />
                    상세보기
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md mx-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center">
                      <Zap size={20} className="mr-2 text-purple-600" />
                      {project.company}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">홍보 내용</h4>
                      <div className="bg-gray-50 p-3 rounded-lg text-sm whitespace-pre-line">
                        {project.content}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">업체 링크</h4>
                      <div className="bg-gray-50 p-3 rounded-lg text-sm break-all">
                        {project.link}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => handleCopyContent(project)}
                        className="flex-1"
                        size="sm"
                      >
                        <Copy size={16} className="mr-1" />
                        내용 복사
                      </Button>
                      <Button
                        onClick={() => handleCopyLink(project)}
                        variant="outline"
                        className="flex-1"
                        size="sm"
                      >
                        <ExternalLink size={16} className="mr-1" />
                        링크 복사
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button
                onClick={() => handleCopyContent(project)}
                variant="outline"
                size="sm"
                className="px-3"
              >
                <Copy size={16} />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}