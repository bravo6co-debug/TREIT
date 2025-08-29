import React, { useState } from 'react';
import { ArrowLeft, Gift, ShoppingCart, Smartphone, Coffee, Gamepad2, ShirtIcon } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

interface GiftCard {
  id: string;
  name: string;
  brand: string;
  icon: React.ElementType;
  color: string;
  amounts: number[];
  category: string;
  description: string;
}

interface Purchase {
  id: string;
  giftCard: GiftCard;
  amount: number;
  purchaseDate: string;
  status: 'pending' | 'completed' | 'delivered';
  code?: string;
}

export default function GiftShopScreen({ 
  onBack, 
  userBalance 
}: { 
  onBack: () => void;
  userBalance: number;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGiftCard, setSelectedGiftCard] = useState<GiftCard | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [showPurchaseHistory, setShowPurchaseHistory] = useState(false);

  const giftCards: GiftCard[] = [
    {
      id: '1',
      name: '스타벅스',
      brand: 'Starbucks',
      icon: Coffee,
      color: 'bg-green-500',
      amounts: [5000, 10000, 20000, 30000],
      category: 'cafe',
      description: '전국 스타벅스 매장에서 사용 가능'
    },
    {
      id: '2',
      name: '구글 플레이',
      brand: 'Google Play',
      icon: Smartphone,
      color: 'bg-green-400',
      amounts: [10000, 30000, 50000, 100000],
      category: 'mobile',
      description: '앱 구매 및 인앱 결제에 사용 가능'
    },
    {
      id: '3',
      name: '스팀 월렛',
      brand: 'Steam',
      icon: Gamepad2,
      color: 'bg-blue-600',
      amounts: [10000, 20000, 50000, 100000],
      category: 'game',
      description: '스팀 게임 및 DLC 구매에 사용 가능'
    },
    {
      id: '4',
      name: '쿠팡',
      brand: 'Coupang',
      icon: ShoppingCart,
      color: 'bg-orange-500',
      amounts: [10000, 30000, 50000, 100000],
      category: 'shopping',
      description: '쿠팡에서 상품 구매에 사용 가능'
    }
  ];

  const [purchases] = useState<Purchase[]>([
    {
      id: '1',
      giftCard: giftCards[0],
      amount: 10000,
      purchaseDate: '2024-01-15',
      status: 'delivered',
      code: 'SB-1234-5678-9012'
    },
    {
      id: '2',
      giftCard: giftCards[1],
      amount: 30000,
      purchaseDate: '2024-01-10',
      status: 'delivered',
      code: 'GP-ABCD-EFGH-IJKL'
    }
  ]);

  const categories = [
    { id: 'all', name: '전체', count: giftCards.length },
    { id: 'cafe', name: '카페', count: giftCards.filter(card => card.category === 'cafe').length },
    { id: 'mobile', name: '모바일', count: giftCards.filter(card => card.category === 'mobile').length },
    { id: 'game', name: '게임', count: giftCards.filter(card => card.category === 'game').length },
    { id: 'shopping', name: '쇼핑', count: giftCards.filter(card => card.category === 'shopping').length }
  ];

  const filteredGiftCards = selectedCategory === 'all' 
    ? giftCards 
    : giftCards.filter(card => card.category === selectedCategory);

  const handlePurchase = () => {
    if (!selectedGiftCard || !selectedAmount) return;
    
    if (selectedAmount > userBalance) {
      alert('잔액이 부족합니다.');
      return;
    }

    // 구매 처리 로직
    console.log('Purchase:', { giftCard: selectedGiftCard, amount: selectedAmount });
    alert('구매가 완료되었습니다! 구매내역에서 확인해주세요.');
    
    setShowPurchaseDialog(false);
    setSelectedGiftCard(null);
    setSelectedAmount(null);
  };

  const renderPurchaseHistory = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">구매내역</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowPurchaseHistory(false)}
        >
          상품권 보기
        </Button>
      </div>
      
      {purchases.map((purchase) => {
        const IconComponent = purchase.giftCard.icon;
        return (
          <Card key={purchase.id} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <div className={`w-12 h-12 ${purchase.giftCard.color} rounded-lg flex items-center justify-center mr-3`}>
                  <IconComponent size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-medium">{purchase.giftCard.name}</h3>
                  <p className="text-sm text-gray-600">₩{purchase.amount.toLocaleString()}</p>
                </div>
              </div>
              <Badge className={
                purchase.status === 'delivered' ? 'bg-green-100 text-green-800' :
                purchase.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                'bg-yellow-100 text-yellow-800'
              }>
                {purchase.status === 'delivered' ? '발급완료' :
                 purchase.status === 'completed' ? '처리완료' : '처리중'}
              </Badge>
            </div>
            
            {purchase.code && (
              <div className="bg-gray-50 rounded-lg p-3 mt-3">
                <p className="text-xs text-gray-500 mb-1">상품권 코드</p>
                <p className="font-mono text-sm font-semibold">{purchase.code}</p>
                <Button size="sm" variant="outline" className="mt-2 w-full">
                  코드 복사
                </Button>
              </div>
            )}
            
            <p className="text-xs text-gray-500 mt-2">구매일: {purchase.purchaseDate}</p>
          </Card>
        );
      })}
    </div>
  );

  const renderGiftCards = () => (
    <div className="space-y-4">
      {/* Category Filter */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category.id}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === category.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setSelectedCategory(category.id)}
          >
            {category.name} ({category.count})
          </button>
        ))}
      </div>

      {/* Gift Cards Grid */}
      <div className="grid grid-cols-1 gap-4">
        {filteredGiftCards.map((giftCard) => {
          const IconComponent = giftCard.icon;
          return (
            <Card 
              key={giftCard.id} 
              className="p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                setSelectedGiftCard(giftCard);
                setShowPurchaseDialog(true);
              }}
            >
              <div className="flex items-center mb-3">
                <div className={`w-14 h-14 ${giftCard.color} rounded-xl flex items-center justify-center mr-4`}>
                  <IconComponent size={28} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{giftCard.name}</h3>
                  <p className="text-gray-600 text-sm">{giftCard.description}</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {giftCard.amounts.map((amount) => (
                  <Badge key={amount} variant="outline" className="text-xs">
                    ₩{amount.toLocaleString()}
                  </Badge>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={onBack} className="mr-3">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-lg font-semibold">상품권샵</h1>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowPurchaseHistory(!showPurchaseHistory)}
        >
          {showPurchaseHistory ? '상품권 보기' : '구매내역'}
        </Button>
      </div>

      <div className="p-4">
        {/* Balance Card */}
        <Card className="p-4 mb-6 bg-gradient-to-r from-purple-500 to-purple-700 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">사용 가능한 금액</p>
              <p className="text-2xl font-bold">₩{userBalance.toLocaleString()}</p>
            </div>
            <Gift size={32} className="text-purple-200" />
          </div>
        </Card>

        {/* Content */}
        <div className="mb-20">
          {showPurchaseHistory ? renderPurchaseHistory() : renderGiftCards()}
        </div>
      </div>

      {/* Purchase Dialog */}
      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{selectedGiftCard?.name} 상품권 구매</DialogTitle>
          </DialogHeader>
          
          {selectedGiftCard && (
            <div className="space-y-4">
              <div className="text-center">
                <div className={`w-16 h-16 ${selectedGiftCard.color} rounded-xl flex items-center justify-center mx-auto mb-3`}>
                  <selectedGiftCard.icon size={32} className="text-white" />
                </div>
                <p className="text-gray-600 text-sm">{selectedGiftCard.description}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-3">금액 선택</p>
                <div className="grid grid-cols-2 gap-2">
                  {selectedGiftCard.amounts.map((amount) => (
                    <button
                      key={amount}
                      className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                        selectedAmount === amount
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedAmount(amount)}
                    >
                      ₩{amount.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>
              
              {selectedAmount && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <div className="flex justify-between mb-1">
                    <span>구매 금액</span>
                    <span>₩{selectedAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>보유 금액</span>
                    <span>₩{userBalance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-1">
                    <span>구매 후 잔액</span>
                    <span className={userBalance - selectedAmount < 0 ? 'text-red-600' : 'text-green-600'}>
                      ₩{(userBalance - selectedAmount).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowPurchaseDialog(false)}
                >
                  취소
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handlePurchase}
                  disabled={!selectedAmount || selectedAmount > userBalance}
                >
                  구매하기
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}