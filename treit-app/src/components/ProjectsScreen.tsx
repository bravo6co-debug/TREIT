import React, { useState } from 'react';
import { Copy, Edit3, DollarSign, ExternalLink, Check, X } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';

interface PromotionMission {
  id: number;
  companyName: string;
  content: string;
  linkUrl: string;
  cpc: number;
}

const promotionMissions: PromotionMission[] = [
  {
    id: 1,
    companyName: '카페 모카',
    content: '새로 오픈한 카페 모카에서 신메뉴 출시 이벤트를 진행해요! 🎉\n\n✨ 할인 혜택:\n- 아메리카노 50% 할인\n- 케이크 세트 20% 할인\n- 첫 방문 고객 쿠폰 증정\n\n📍 위치: 강남구 테헤란로 123\n⏰ 이벤트 기간: 12월 1일~31일\n\n맛있는 커피 한 잔 어떠세요? ☕',
    linkUrl: 'https://cafe-mocha.com/event2024',
    cpc: 150
  },
  {
    id: 2,
    companyName: '스마트핏 헬스장',
    content: '새해 건강 목표 세우셨나요? 💪\n\n스마트핏에서 신년 특가 이벤트 진행 중!\n🔥 1월 한정 혜택:\n- 6개월 이용권 40% 할인\n- PT 10회 무료 제공\n- 인바디 측정 무료\n\n올해는 꼭 건강한 몸 만들어보세요!\n지금 바로 신청하세요 👇',
    linkUrl: 'https://smartfit.co.kr/newyear2024',
    cpc: 320
  },
  {
    id: 3,
    companyName: '퓨어뷰티 화장품',
    content: '겨울철 건조한 피부 때문에 고민이세요? ❄️\n\n퓨어뷰티 겨울 스킨케어 세트로 해결하세요!\n🌟 세트 구성:\n- 수분 토너 + 에센스 + 크림\n- 무료 샘플 5종 증정\n- 전국 무료배송\n\n지금 주문하면 30% 할인가로 만나볼 수 있어요!\n아름다운 피부의 시작은 퓨어뷰티와 함께 ✨',
    linkUrl: 'https://purebeauty.com/winter-set',
    cpc: 180
  },
  {
    id: 4,
    companyName: '테크기어 온라인몰',
    content: '최신 스마트워치 출시 기념 이벤트! ⌚\n\n🎁 런칭 기념 혜택:\n- 얼리버드 30% 할인\n- 무선충전기 무료 증정\n- 2년 품질보증\n- 30일 무료 체험\n\n건강관리와 스마트한 라이프스타일을 원한다면?\n테크기어에서 만나보세요! 📱',
    linkUrl: 'https://techgear.kr/smartwatch-launch',
    cpc: 250
  }
];

export default function ProjectsScreen() {
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [missions, setMissions] = useState<PromotionMission[]>(promotionMissions);
  const [editContent, setEditContent] = useState('');

  const copyToClipboard = (content: string, linkUrl: string, id: number) => {
    const fullContent = `${content}\n\n${linkUrl}`;
    navigator.clipboard.writeText(fullContent).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {
      alert('복사에 실패했습니다. 다시 시도해주세요.');
    });
  };

  const handleEdit = (mission: PromotionMission) => {
    setEditingId(mission.id);
    setEditContent(mission.content);
  };

  const handleSaveEdit = () => {
    if (editingId === null) return;
    
    setMissions(prev => prev.map(mission => 
      mission.id === editingId 
        ? { ...mission, content: editContent }
        : mission
    ));
    
    setEditingId(null);
    setEditContent('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };



  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white p-4 shadow-sm">
        <h1 className="text-lg font-semibold">프로젝트</h1>
        <p className="text-sm text-gray-600">사용 가능한 미션을 확인하세요</p>
      </div>

      <div className="p-4">
        <div className="space-y-4">
          {missions.map((mission) => (
            <Card key={mission.id} className="p-4">
              {editingId === mission.id ? (
                /* Edit Mode */
                <div className="space-y-4">
                  {/* Edit Header */}
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-blue-600">홍보 내용 수정</h3>
                    <Badge variant="outline" className="text-orange-600 border-orange-200">
                      수정 중
                    </Badge>
                  </div>

                  {/* Read-only Info */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">업체명:</span>
                        <span className="font-medium">{mission.companyName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">CPC 단가:</span>
                        <span className="font-medium text-green-600">₩{mission.cpc}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">링크:</span>
                        <span className="font-medium text-blue-600 truncate ml-2">{mission.linkUrl}</span>
                      </div>
                    </div>
                  </div>

                  {/* Content Editor */}
                  <div>
                    <label className="block text-sm font-medium mb-2">홍보 내용</label>
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      placeholder="홍보 내용을 입력하세요"
                      className="min-h-40 resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      줄바꿈과 이모지를 사용하여 매력적인 홍보 내용을 작성해보세요
                    </p>
                  </div>

                  {/* Edit Action Buttons */}
                  <div className="flex space-x-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                      className="flex-1"
                    >
                      <X size={16} className="mr-2" />
                      취소
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveEdit}
                      className="flex-1 bg-gradient-to-r from-pink-400 to-purple-500 text-white hover:from-pink-500 hover:to-purple-600 hover:shadow-lg hover:shadow-pink-400/30 shadow-pink-400/20"
                      disabled={!editContent.trim()}
                    >
                      <Check size={16} className="mr-2" />
                      시작하기
                    </Button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <>
                  {/* Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{mission.companyName}</h3>
                      <div className="flex items-center">
                        <ExternalLink size={14} className="text-gray-400 mr-1" />
                        <p className="text-sm text-gray-600 break-all">{mission.linkUrl}</p>
                      </div>
                    </div>
                    <div className="flex items-center ml-4">
                      <DollarSign size={16} className="text-green-500 mr-1" />
                      <span className="font-semibold text-green-600">₩{mission.cpc}</span>
                      <span className="text-xs text-gray-500 ml-1">/클릭</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-800 whitespace-pre-line">
                      {mission.content}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(mission.content, mission.linkUrl, mission.id);
                      }}
                      className="flex-1"
                      disabled={copiedId === mission.id}
                    >
                      <Copy size={16} className="mr-2" />
                      {copiedId === mission.id ? '복사됨!' : '복사'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(mission);
                      }}
                      className="flex-1"
                      disabled={editingId !== null}
                    >
                      <Edit3 size={16} className="mr-2" />
                      수정
                    </Button>
                  </div>
                </>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}