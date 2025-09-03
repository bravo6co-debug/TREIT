import React, { memo } from 'react';
import { ShoppingCart, Star, ExternalLink } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ImageWithFallback } from './figma/ImageWithFallback';

const CoupangBanner = memo(() => {
  const handleCoupangClick = () => {
    window.open('https://www.coupang.com', '_blank');
  };

  return (
    <div className="px-4 mb-6">
      <Card 
        className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]"
        onClick={handleCoupangClick}
      >
        <div className="relative">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1664455340023-214c33a9d0bd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvbmxpbmUlMjBzaG9wcGluZyUyMHBhY2thZ2VzJTIwZGVsaXZlcnl8ZW58MXx8fHwxNzU2Mzc0NDU3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            alt="쿠팡 쇼핑"
            className="w-full h-32 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-600/90 to-slate-800/90 flex items-center">
            <div className="flex-1 p-4 text-white">
              <div className="flex items-center mb-2">
                <ShoppingCart size={20} className="mr-2" />
                <Badge className="bg-orange-500 text-white font-semibold">
                  쿠팡
                </Badge>
              </div>
              <h3 className="text-lg font-semibold mb-1">쿠팡 쇼핑</h3>
              <p className="text-slate-100 text-sm mb-2">최대 적립금 구매금액의 2.2%</p>
              <div className="flex items-center text-orange-300">
                <Star size={14} className="mr-1" />
                <span className="text-xs">로켓 배송으로 빠른 배송</span>
              </div>
            </div>
            <div className="p-4 text-right text-white">
              <div className="text-2xl font-bold">2.2%</div>
              <div className="text-xs text-slate-200">최대 적립</div>
              <ExternalLink size={16} className="mt-2 ml-auto" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
});

CoupangBanner.displayName = 'CoupangBanner';

export default CoupangBanner;