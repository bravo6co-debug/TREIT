import React, { useState } from 'react';
import { Instagram, Globe, Hash, Edit3, Save, X, CheckCircle, AlertCircle, Link, Shield } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { toast } from 'sonner';

interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  url: string;
  verified: boolean;
  icon: React.ReactNode;
  color: string;
  template: string;
}

export default function SocialAccountManager() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([
    {
      id: 'instagram',
      platform: 'Instagram',
      username: '',
      url: '',
      verified: false,
      icon: <Instagram size={20} />,
      color: 'from-pink-500 to-purple-600',
      template: '{{content}}\n\n#Tre-it #부업 #소통 #데일리 {{hashtags}}'
    },
    {
      id: 'blog',
      platform: 'Blog',
      username: '',
      url: '',
      verified: false,
      icon: <Globe size={20} />,
      color: 'from-blue-500 to-cyan-600',
      template: '블로그 포스팅 템플릿:\n제목: {{title}}\n내용: {{content}}\n\n- Tre-it 활동으로 작성된 포스팅입니다.'
    },
    {
      id: 'other',
      platform: '기타',
      username: '',
      url: '',
      verified: false,
      icon: <Hash size={20} />,
      color: 'from-gray-500 to-gray-600',
      template: '{{content}}\n\n📱 Tre-it 활동 인증\n#Tre-it #부업 #소통 #인증'
    }
  ]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempData, setTempData] = useState<{ username: string; url: string }>({ username: '', url: '' });

  const handleEdit = (account: SocialAccount) => {
    setEditingId(account.id);
    setTempData({ username: account.username, url: account.url });
  };

  const handleSave = (accountId: string) => {
    // URL 유효성 검증
    if (tempData.url && !isValidUrl(tempData.url)) {
      toast.error('올바른 URL 형식을 입력해주세요.');
      return;
    }

    setAccounts(prev => prev.map(account => 
      account.id === accountId 
        ? { 
            ...account, 
            username: tempData.username,
            url: tempData.url,
            verified: tempData.url ? true : false
          }
        : account
    ));
    
    setEditingId(null);
    setTempData({ username: '', url: '' });
    
    if (tempData.url) {
      toast.success('🪙✨ 계정 정보가 저장되었습니다! 크로스 체크를 위해 등록되었습니다! ✨🪙');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setTempData({ username: '', url: '' });
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const copyTemplate = (template: string) => {
    navigator.clipboard.writeText(template);
    toast.success('🪙✨ 템플릿이 클립보드에 복사되었습니다! ✨🪙');
  };

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-500 mb-3 px-2">
        SNS 계정 관리
      </h3>
      <Card className="p-6 bg-white shadow-sm border">
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mr-3">
            <Shield size={24} className="text-yellow-600" />
          </div>
          <div className="flex-1">
            <div className="font-medium">계정 인증</div>
            <p className="text-sm text-gray-500">크로스 체크 및 어뷰징 방지를 위한 계정 등록</p>
          </div>
          <Badge className="bg-yellow-100 text-yellow-800 font-semibold">
            인증 필수
          </Badge>
        </div>

        <div className="space-y-4">
          {accounts.map((account) => (
            <div key={account.id} className="border border-gray-100 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className={`w-10 h-10 bg-gradient-to-r ${account.color} rounded-lg flex items-center justify-center mr-3 text-white`}>
                    {account.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800">{account.platform}</h4>
                    <div className="flex items-center">
                      {account.verified ? (
                        <div className="flex items-center text-emerald-600">
                          <CheckCircle size={14} className="mr-1" />
                          <span className="text-xs">인증됨</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-amber-600">
                          <AlertCircle size={14} className="mr-1" />
                          <span className="text-xs">미등록</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {editingId !== account.id && (
                  <Button
                    onClick={() => handleEdit(account)}
                    variant="outline"
                    size="sm"
                    className="text-slate-600 hover:text-slate-800"
                  >
                    <Edit3 size={14} className="mr-1" />
                    {account.url ? '수정' : '등록'}
                  </Button>
                )}
              </div>

              {editingId === account.id ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      사용자명/채널명
                    </label>
                    <Input
                      value={tempData.username}
                      onChange={(e) => setTempData(prev => ({ ...prev, username: e.target.value }))}
                      placeholder={account.platform === '기타' ? '예: @username 또는 계정명' : '예: @username 또는 채널명'}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {account.platform} URL
                    </label>
                    <Input
                      value={tempData.url}
                      onChange={(e) => setTempData(prev => ({ ...prev, url: e.target.value }))}
                      placeholder={account.platform === '기타' ? '예: https://example.com/username' : `예: https://${account.platform.toLowerCase()}.com/username`}
                      className="w-full"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleSave(account.id)}
                      size="sm"
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                      <Save size={14} className="mr-1" />
                      저장
                    </Button>
                    <Button
                      onClick={handleCancel}
                      variant="outline"
                      size="sm"
                    >
                      <X size={14} className="mr-1" />
                      취소
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {account.username && (
                    <div className="text-sm text-slate-600">
                      <strong>사용자명:</strong> {account.username}
                    </div>
                  )}
                  {account.url && (
                    <div className="text-sm text-slate-600 break-all">
                      <strong>URL:</strong> 
                      <a 
                        href={account.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 ml-1"
                      >
                        {account.url}
                      </a>
                    </div>
                  )}
                  
                  {account.url && (
                    <div className="mt-3 p-4 bg-gradient-to-br from-white via-purple-50 to-pink-50 rounded-lg border border-purple-200 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-slate-700 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">링크 템플릿</span>
                        <Button
                          onClick={() => copyTemplate(account.template)}
                          variant="outline"
                          size="sm"
                          className="text-xs px-3 py-1 bg-gradient-to-r from-purple-400 to-pink-400 text-white border-0 hover:from-purple-500 hover:to-pink-500 hover:shadow-lg hover:shadow-purple-400/30 transition-all duration-200 shadow-purple-400/20"
                        >
                          <Link size={12} className="mr-1" />
                          복사
                        </Button>
                      </div>
                      <div className="text-xs text-slate-700 font-mono whitespace-pre-wrap bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-gradient-to-r from-purple-200 to-pink-200 shadow-inner">
                        {account.template}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-start">
            <AlertCircle size={16} className="text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <strong>크로스 체크 안내:</strong> 등록된 계정 정보는 미션 수행 검증과 어뷰징 방지를 위해 사용됩니다. 
              정확한 정보를 입력해주세요.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}