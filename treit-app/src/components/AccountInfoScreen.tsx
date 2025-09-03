import React, { useState } from 'react';
import { ArrowLeft, Building, CreditCard, CheckCircle, Plus } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';

// XSS 보안 유틸리티 import
import { 
  sanitizeText, 
  sanitizeUserProfile, 
  detectXSSPatterns 
} from '@shared/xss-protection';
import { SafeUserContent } from '@shared/components/SafeHTML';

interface AccountInfo {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  isVerified: boolean;
}

interface TaxCard {
  id: string;
  cardNumber: string;
  cardHolder: string;
  issueDate: string;
  isActive: boolean;
}

export default function AccountInfoScreen({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'bank' | 'tax'>('bank');
  const [showAddForm, setShowAddForm] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isFormValid, setIsFormValid] = useState(true);
  
  const [bankAccounts] = useState<AccountInfo[]>([
    {
      id: '1',
      bankName: '국민은행',
      accountNumber: '123-45-6789012',
      accountHolder: '철수',
      isVerified: true
    }
  ]);
  
  const [taxCards] = useState<TaxCard[]>([
    {
      id: '1',
      cardNumber: '1234-5678-****-****',
      cardHolder: '철수',
      issueDate: '2024-01',
      isActive: true
    }
  ]);

  const [formData, setFormData] = useState({
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    cardNumber: '',
    cardHolder: '',
    expiryDate: ''
  });

  // 입력 검증 및 XSS 방지 함수
  const validateAndSanitizeInput = (field: string, value: string): string | null => {
    setValidationErrors([]);
    setIsFormValid(true);

    // XSS 패턴 검사
    if (detectXSSPatterns(value)) {
      setValidationErrors(prev => [...prev, `${field}에 허용되지 않는 문자가 포함되어 있습니다.`]);
      setIsFormValid(false);
      return null;
    }

    // 필드별 특별 검증
    let sanitizedValue = sanitizeText(value);

    switch (field) {
      case 'accountNumber':
        // 계좌번호: 숫자와 하이픈만 허용
        sanitizedValue = sanitizedValue.replace(/[^0-9-]/g, '');
        if (sanitizedValue.length > 20) {
          setValidationErrors(prev => [...prev, '계좌번호는 20자를 초과할 수 없습니다.']);
          setIsFormValid(false);
          return null;
        }
        break;
      
      case 'accountHolder':
      case 'cardHolder':
        // 이름: 한글, 영문, 공백만 허용
        sanitizedValue = sanitizedValue.replace(/[^a-zA-Z가-힣\s]/g, '');
        if (sanitizedValue.length > 50) {
          setValidationErrors(prev => [...prev, '이름은 50자를 초과할 수 없습니다.']);
          setIsFormValid(false);
          return null;
        }
        break;

      case 'cardNumber':
        // 카드번호: 숫자와 하이픈만 허용
        sanitizedValue = sanitizedValue.replace(/[^0-9-]/g, '');
        if (sanitizedValue.length > 19) {
          setValidationErrors(prev => [...prev, '카드번호는 19자를 초과할 수 없습니다.']);
          setIsFormValid(false);
          return null;
        }
        break;

      case 'expiryDate':
        // 유효기간: MM/YY 형식
        sanitizedValue = sanitizedValue.replace(/[^0-9/]/g, '');
        if (sanitizedValue.length > 5) {
          setValidationErrors(prev => [...prev, '유효기간은 MM/YY 형식으로 입력해주세요.']);
          setIsFormValid(false);
          return null;
        }
        break;
    }

    return sanitizedValue;
  };

  // 안전한 입력 핸들러
  const handleSafeInput = (field: keyof typeof formData, value: string) => {
    const sanitizedValue = validateAndSanitizeInput(field, value);
    if (sanitizedValue !== null) {
      setFormData(prev => ({
        ...prev,
        [field]: sanitizedValue
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 최종 검증
    if (!isFormValid || validationErrors.length > 0) {
      alert('입력된 정보에 문제가 있습니다. 다시 확인해주세요.');
      return;
    }

    // 모든 필드가 입력되었는지 확인
    if (activeTab === 'bank') {
      if (!formData.bankName || !formData.accountNumber || !formData.accountHolder) {
        alert('모든 필드를 입력해주세요.');
        return;
      }
    } else {
      if (!formData.cardNumber || !formData.cardHolder || !formData.expiryDate) {
        alert('모든 필드를 입력해주세요.');
        return;
      }
    }

    // 최종 데이터 정화
    const sanitizedData = sanitizeUserProfile({
      bankName: formData.bankName,
      accountNumber: formData.accountNumber,
      accountHolder: formData.accountHolder,
      cardNumber: formData.cardNumber,
      cardHolder: formData.cardHolder,
      expiryDate: formData.expiryDate
    });

    setShowAddForm(false);
    setFormData({
      bankName: '',
      accountNumber: '',
      accountHolder: '',
      cardNumber: '',
      cardHolder: '',
      expiryDate: ''
    });
    setValidationErrors([]);
    setIsFormValid(true);
  };

  const renderBankAccounts = () => (
    <div className="space-y-4">
      {bankAccounts.map((account) => (
        <Card key={account.id} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <Building size={24} className="text-blue-600" />
              </div>
              <div>
                <SafeUserContent 
                  content={account.bankName}
                  className="font-medium"
                  maxLength={50}
                />
                <SafeUserContent 
                  content={account.accountNumber}
                  className="text-gray-600"
                  maxLength={20}
                />
              </div>
            </div>
            {account.isVerified && (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle size={14} className="mr-1" />
                인증완료
              </Badge>
            )}
          </div>
          <div className="text-sm text-gray-500">
            예금주: <SafeUserContent 
              content={account.accountHolder}
              className="inline"
              maxLength={50}
            />
          </div>
        </Card>
      ))}
      
      <Button 
        variant="outline" 
        className="w-full h-16 border-2 border-dashed"
        onClick={() => {
          setActiveTab('bank');
          setShowAddForm(true);
        }}
      >
        <Plus size={20} className="mr-2" />
        계좌 추가
      </Button>
    </div>
  );

  const renderTaxCards = () => (
    <div className="space-y-4">
      {taxCards.map((card) => (
        <Card key={card.id} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                <CreditCard size={24} className="text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium">소득공제 카드</h3>
                <SafeUserContent 
                  content={card.cardNumber}
                  className="text-gray-600"
                  maxLength={19}
                />
              </div>
            </div>
            {card.isActive && (
              <Badge className="bg-green-100 text-green-800">활성</Badge>
            )}
          </div>
          <div className="text-sm text-gray-500">
            카드소유자: <SafeUserContent 
              content={card.cardHolder}
              className="inline"
              maxLength={50}
            /> | 발급일: <SafeUserContent 
              content={card.issueDate}
              className="inline"
              maxLength={10}
            />
          </div>
        </Card>
      ))}
      
      <Button 
        variant="outline" 
        className="w-full h-16 border-2 border-dashed"
        onClick={() => {
          setActiveTab('tax');
          setShowAddForm(true);
        }}
      >
        <Plus size={20} className="mr-2" />
        카드 추가
      </Button>
    </div>
  );

  const renderAddForm = () => (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">
        {activeTab === 'bank' ? '계좌 추가' : '소득공제 카드 추가'}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {activeTab === 'bank' ? (
          <>
            <div>
              <Label htmlFor="bankName">은행명</Label>
              <Select value={formData.bankName} onValueChange={(value) => setFormData({...formData, bankName: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="은행을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="국민은행">국민은행</SelectItem>
                  <SelectItem value="신한은행">신한은행</SelectItem>
                  <SelectItem value="하나은행">하나은행</SelectItem>
                  <SelectItem value="우리은행">우리은행</SelectItem>
                  <SelectItem value="기업은행">기업은행</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="accountNumber">계좌번호</Label>
              <Input
                id="accountNumber"
                placeholder="계좌번호를 입력하세요"
                value={formData.accountNumber}
                onChange={(e) => handleSafeInput('accountNumber', e.target.value)}
                maxLength={20}
              />
              {validationErrors.some(error => error.includes('계좌번호')) && (
                <p className="text-xs text-red-500 mt-1">
                  {validationErrors.find(error => error.includes('계좌번호'))}
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="accountHolder">예금주</Label>
              <Input
                id="accountHolder"
                placeholder="예금주명을 입력하세요"
                value={formData.accountHolder}
                onChange={(e) => handleSafeInput('accountHolder', e.target.value)}
                maxLength={50}
              />
              {validationErrors.some(error => error.includes('이름')) && (
                <p className="text-xs text-red-500 mt-1">
                  {validationErrors.find(error => error.includes('이름'))}
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <div>
              <Label htmlFor="cardNumber">카드번호</Label>
              <Input
                id="cardNumber"
                placeholder="1234-5678-9012-3456"
                value={formData.cardNumber}
                onChange={(e) => handleSafeInput('cardNumber', e.target.value)}
                maxLength={19}
              />
              {validationErrors.some(error => error.includes('카드번호')) && (
                <p className="text-xs text-red-500 mt-1">
                  {validationErrors.find(error => error.includes('카드번호'))}
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="cardHolder">카드소유자</Label>
              <Input
                id="cardHolder"
                placeholder="카드에 표시된 이름을 입력하세요"
                value={formData.cardHolder}
                onChange={(e) => handleSafeInput('cardHolder', e.target.value)}
                maxLength={50}
              />
              {validationErrors.some(error => error.includes('이름')) && (
                <p className="text-xs text-red-500 mt-1">
                  {validationErrors.find(error => error.includes('이름'))}
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="expiryDate">유효기간</Label>
              <Input
                id="expiryDate"
                placeholder="MM/YY"
                value={formData.expiryDate}
                onChange={(e) => handleSafeInput('expiryDate', e.target.value)}
                maxLength={5}
              />
              {validationErrors.some(error => error.includes('유효기간')) && (
                <p className="text-xs text-red-500 mt-1">
                  {validationErrors.find(error => error.includes('유효기간'))}
                </p>
              )}
            </div>
          </>
        )}
        
        <div className="flex space-x-2 pt-4">
          <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddForm(false)}>
            취소
          </Button>
          <Button 
            type="submit" 
            className="flex-1"
            disabled={!isFormValid || validationErrors.length > 0}
          >
            {activeTab === 'bank' ? '계좌 추가' : '카드 추가'}
          </Button>
        </div>
      </form>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white p-4 shadow-sm flex items-center">
        <button onClick={onBack} className="mr-3">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-semibold">정산 정보 관리</h1>
      </div>

      <div className="p-4">
        {/* Tab Navigation */}
        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'bank' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => {
              setActiveTab('bank');
              setShowAddForm(false);
            }}
          >
            <Building size={16} className="inline mr-2" />
            계좌 정보
          </button>
          <button
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'tax' 
                ? 'bg-white text-purple-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => {
              setActiveTab('tax');
              setShowAddForm(false);
            }}
          >
            <CreditCard size={16} className="inline mr-2" />
            소득공제 카드
          </button>
        </div>

        {/* Content */}
        <div className="mb-20">
          {showAddForm ? renderAddForm() : (
            activeTab === 'bank' ? renderBankAccounts() : renderTaxCards()
          )}
        </div>

        {/* Info Card */}
        <Card className="p-4 bg-blue-50 border-blue-200 mb-4">
          <div className="flex items-start">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <div className="text-sm">
              <p className="font-medium text-blue-900 mb-1">정산 정보 안내</p>
              <p className="text-blue-700">
                • 계좌 정보: 프로젝트 수익 정산을 위한 계좌입니다<br/>
                • 소득공제 카드: 3.3% 세금계산서 발행을 위한 카드입니다<br/>
                • 정보 변경 후 인증까지 1-2일 소요될 수 있습니다
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}