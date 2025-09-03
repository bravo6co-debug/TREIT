import React, { useState } from 'react';
import { X, Camera, Send, User } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

interface PostWriteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (postData: {
    content: string;
    category: string;
    image_url?: string;
  }) => Promise<void>;
  userProfile?: {
    full_name: string;
    current_level: number;
    avatar_url?: string;
  };
}

const categories = [
  { key: 'general', label: '자유', color: 'bg-blue-100 text-blue-800' },
  { key: 'question', label: '질문', color: 'bg-orange-100 text-orange-800' },
  { key: 'tip', label: '팁', color: 'bg-green-100 text-green-800' },
  { key: 'success', label: '성과', color: 'bg-purple-100 text-purple-800' },
  { key: 'review', label: '후기', color: 'bg-pink-100 text-pink-800' }
];

export default function PostWriteModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  userProfile 
}: PostWriteModalProps) {
  const [content, setContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [charCount, setCharCount] = useState(0);

  const maxChars = 1000;

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if (text.length <= maxChars) {
      setContent(text);
      setCharCount(text.length);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('파일 크기는 5MB 이하만 업로드 가능합니다.');
        return;
      }
      
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setPreviewUrl(null);
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      alert('내용을 입력해주세요.');
      return;
    }

    if (content.trim().length < 10) {
      alert('내용은 최소 10자 이상 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrl = undefined;
      
      // TODO: Implement image upload to Supabase storage if imageFile exists
      // For now, we'll skip image upload functionality
      
      await onSubmit({
        content: content.trim(),
        category: selectedCategory,
        image_url: imageUrl
      });

      // Reset form
      setContent('');
      setSelectedCategory('general');
      setCharCount(0);
      setImageFile(null);
      setPreviewUrl(null);
      onClose();
    } catch (error) {
      alert('게시글 작성에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategoryInfo = categories.find(cat => cat.key === selectedCategory);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">새 게시글 작성</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="p-2"
          >
            <X size={20} />
          </Button>
        </div>

        <div className="p-4">
          {/* User Info */}
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              {userProfile?.avatar_url ? (
                <img 
                  src={userProfile.avatar_url} 
                  alt="Profile" 
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User size={20} className="text-blue-600" />
              )}
            </div>
            <div>
              <div className="flex items-center">
                <span className="font-semibold">
                  {userProfile?.full_name || '사용자'}
                </span>
                <Badge className="ml-2 bg-purple-100 text-purple-800">
                  Lv.{userProfile?.current_level || 1}
                </Badge>
              </div>
              <div className="text-sm text-gray-500">
                커뮤니티에 글을 남겨보세요
              </div>
            </div>
          </div>

          {/* Category Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              카테고리
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.key}
                  onClick={() => setSelectedCategory(category.key)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category.key
                      ? category.color
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              내용
            </label>
            <textarea
              value={content}
              onChange={handleContentChange}
              placeholder="어떤 이야기를 나누고 싶나요? 다른 부업러들과 경험을 공유해보세요!"
              rows={6}
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-gray-500">
                최소 10자 이상 입력해주세요
              </span>
              <span className={`text-sm ${charCount > maxChars * 0.9 ? 'text-red-500' : 'text-gray-500'}`}>
                {charCount}/{maxChars}
              </span>
            </div>
          </div>

          {/* Image Upload (Optional) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              이미지 (선택사항)
            </label>
            
            {previewUrl ? (
              <div className="relative">
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="w-full max-h-40 object-cover rounded-lg"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 bg-white bg-opacity-80 hover:bg-opacity-100"
                >
                  <X size={16} />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Camera className="w-6 h-6 mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500">클릭하여 이미지 업로드</p>
                  <p className="text-xs text-gray-400">최대 5MB</p>
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </label>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={onClose}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button 
              className="flex-1"
              onClick={handleSubmit}
              disabled={isSubmitting || !content.trim() || content.trim().length < 10}
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  작성 중...
                </div>
              ) : (
                <div className="flex items-center">
                  <Send size={16} className="mr-2" />
                  게시하기
                </div>
              )}
            </Button>
          </div>

          {/* Guidelines */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm text-gray-700 mb-2">커뮤니티 가이드라인</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• 서로를 존중하고 건전한 소통을 지향해주세요</li>
              <li>• 개인정보나 민감한 정보 공유는 자제해주세요</li>
              <li>• 스팸, 광고, 부적절한 내용은 삭제될 수 있습니다</li>
              <li>• 질문이나 도움이 필요한 내용은 언제든 환영합니다</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}