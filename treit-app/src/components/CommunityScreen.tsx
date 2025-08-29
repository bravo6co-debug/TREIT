import React, { useState, useEffect } from 'react';
import { MessageCircle, Heart, Share2, Users, TrendingUp, Clock, User, Plus } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar } from './ui/avatar';
import PostWriteModal from './PostWriteModal';
import { db, auth } from '../lib/supabase';
import type { CommunityPostWithDetails } from '../../../types/supabase';

const categories = [
  { key: 'all', label: '전체', color: 'bg-gray-100 text-gray-800' },
  { key: 'general', label: '자유', color: 'bg-blue-100 text-blue-800' },
  { key: 'question', label: '질문', color: 'bg-orange-100 text-orange-800' },
  { key: 'tip', label: '팁', color: 'bg-green-100 text-green-800' },
  { key: 'success', label: '성과', color: 'bg-purple-100 text-purple-800' },
  { key: 'review', label: '후기', color: 'bg-pink-100 text-pink-800' }
];

// Helper function to get time ago
const getTimeAgo = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return '방금 전';
  if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}시간 전`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}일 전`;
  
  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths}개월 전`;
};

// Get category display info
const getCategoryInfo = (category: string) => {
  return categories.find(cat => cat.key === category) || categories[0];
};

export default function CommunityScreen() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [posts, setPosts] = useState<CommunityPostWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [communityStats, setCommunityStats] = useState({
    activeUsers: 0,
    todaysPosts: 0,
    newMembers: 0
  });

  // Load current user and profile
  useEffect(() => {
    const loadUser = async () => {
      const { user } = await auth.getUser();
      if (user) {
        setCurrentUser(user);
        const { data: profile } = await db.users.getProfile(user.id);
        setUserProfile(profile);
      }
    };
    loadUser();
  }, []);

  // Load posts
  const loadPosts = async (category: string = 'all', offset: number = 0) => {
    try {
      const { data, error } = await db.community.posts.getPosts({
        category: category === 'all' ? undefined : category,
        limit: 20,
        offset,
        userId: currentUser?.id
      });

      if (error) throw error;

      if (offset === 0) {
        setPosts(data || []);
      } else {
        setPosts(prev => [...prev, ...(data || [])]);
      }

      setHasMore((data?.length || 0) === 20);
    } catch (error) {
      console.error('Failed to load posts:', error);
      // Fallback for development without database
      if (offset === 0) {
        setPosts([]);
      }
      setHasMore(false);
    }
  };

  // Initial load
  useEffect(() => {
    const initialLoad = async () => {
      setIsLoading(true);
      await loadPosts(selectedCategory);
      setIsLoading(false);
    };
    initialLoad();
  }, [selectedCategory, currentUser]);

  // Load more posts
  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    await loadPosts(selectedCategory, posts.length);
    setIsLoadingMore(false);
  };

  // Handle category change
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };

  // Handle like toggle
  const toggleLike = async (postId: string) => {
    if (!currentUser) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      const { data, error } = await db.community.likes.toggleLike('post', postId, currentUser.id);
      if (error) throw error;

      // Update local state
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          const isLiked = data?.action === 'added';
          return {
            ...post,
            is_liked: isLiked,
            likes_count: post.likes_count + (isLiked ? 1 : -1)
          };
        }
        return post;
      }));
    } catch (error) {
      console.error('Failed to toggle like:', error);
      alert('좋아요 처리에 실패했습니다.');
    }
  };

  // Handle post submission
  const handlePostSubmit = async (postData: {
    content: string;
    category: string;
    image_url?: string;
  }) => {
    if (!currentUser || !userProfile) {
      // For demo purposes without authentication
      const mockPost = {
        id: Date.now().toString(),
        user_id: 'demo-user',
        author_name: '데모 사용자',
        content: postData.content,
        category: postData.category,
        image_url: postData.image_url,
        is_pinned: false,
        is_trending: false,
        likes_count: 0,
        comments_count: 0,
        views_count: 0,
        reports_count: 0,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_profiles: {
          id: 'demo-user',
          full_name: '데모 사용자',
          avatar_url: null,
          current_level: 5
        },
        is_liked: false,
        is_reported: false
      };
      
      setPosts(prev => [mockPost as any, ...prev]);
      alert('데모 게시글이 작성되었습니다! (실제 환경에서는 로그인이 필요합니다)');
      return;
    }

    try {
      const { data, error } = await db.community.posts.createPost({
        ...postData,
        user_id: currentUser.id,
        author_name: userProfile.full_name || '사용자'
      });

      if (error) throw error;

      // Add new post to the top of the list
      if (data) {
        setPosts(prev => [data, ...prev]);
      }

      alert('게시글이 성공적으로 작성되었습니다!');
    } catch (error) {
      console.error('Failed to create post:', error);
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white p-4 shadow-sm">
          <h1 className="text-lg font-semibold">커뮤니티</h1>
          <p className="text-sm text-gray-600">다른 부업러들과 소통해보세요</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white p-4 shadow-sm">
        <h1 className="text-lg font-semibold">커뮤니티</h1>
        <p className="text-sm text-gray-600">다른 부업러들과 소통해보세요</p>
      </div>

      {/* Stats Bar */}
      <div className="bg-white p-4 border-b">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-blue-600">{communityStats.activeUsers || 1247}</div>
            <div className="text-xs text-gray-500">활성 유저</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-600">{communityStats.todaysPosts || posts.length}</div>
            <div className="text-xs text-gray-500">오늘의 글</div>
          </div>
          <div>
            <div className="text-lg font-bold text-purple-600">{communityStats.newMembers || 89}</div>
            <div className="text-xs text-gray-500">새 멤버</div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-white p-4 border-b">
        <div className="flex space-x-2 overflow-x-auto">
          {categories.map((category) => (
            <Button
              key={category.key}
              variant={selectedCategory === category.key ? "default" : "outline"}
              size="sm"
              onClick={() => handleCategoryChange(category.key)}
              className="whitespace-nowrap"
            >
              {category.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Posts */}
      <div className="p-4">
        <div className="space-y-4">
          {posts.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-gray-500 mb-4">
                <MessageCircle size={48} className="mx-auto mb-2 text-gray-300" />
                <p className="text-lg font-medium">아직 게시글이 없습니다</p>
                <p className="text-sm">첫 번째 게시글을 작성해보세요!</p>
              </div>
              {currentUser && (
                <Button 
                  onClick={() => setIsWriteModalOpen(true)}
                  className="mt-4"
                >
                  첫 글 작성하기
                </Button>
              )}
            </Card>
          ) : (
            posts.map((post) => {
              const categoryInfo = getCategoryInfo(post.category);
              return (
                <Card key={post.id} className="p-4">
                  {/* Post Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        {post.user_profiles?.avatar_url ? (
                          <img 
                            src={post.user_profiles.avatar_url} 
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
                            {post.user_profiles?.full_name || post.author_name}
                          </span>
                          <Badge className="ml-2 bg-purple-100 text-purple-800">
                            Lv.{post.user_profiles?.current_level || 1}
                          </Badge>
                          {post.is_trending && (
                            <TrendingUp size={14} className="ml-1 text-red-500" />
                          )}
                        </div>
                        <div className="flex items-center text-xs text-gray-500">
                          <Clock size={12} className="mr-1" />
                          {getTimeAgo(post.created_at)}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className={categoryInfo.color}>
                      {categoryInfo.label}
                    </Badge>
                  </div>

                  {/* Post Content */}
                  <div className="mb-4">
                    <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {post.content}
                    </p>
                    {post.image_url && (
                      <img 
                        src={post.image_url} 
                        alt="Post image" 
                        className="mt-3 rounded-lg max-h-64 object-cover w-full"
                      />
                    )}
                  </div>

                  {/* Post Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => toggleLike(post.id)}
                        className={`flex items-center space-x-1 ${
                          post.is_liked ? 'text-red-500' : 'text-gray-500'
                        } hover:text-red-500 transition-colors`}
                        disabled={!currentUser}
                      >
                        <Heart 
                          size={16} 
                          className={post.is_liked ? 'fill-current' : ''} 
                        />
                        <span className="text-sm">
                          {post.likes_count}
                        </span>
                      </button>
                      
                      <button className="flex items-center space-x-1 text-gray-500 hover:text-blue-500 transition-colors">
                        <MessageCircle size={16} />
                        <span className="text-sm">{post.comments_count}</span>
                      </button>
                    </div>
                    
                    <button className="flex items-center space-x-1 text-gray-500 hover:text-blue-500 transition-colors">
                      <Share2 size={16} />
                      <span className="text-sm">공유</span>
                    </button>
                  </div>
                </Card>
              );
            })
          )}

          {/* Load More Button */}
          {hasMore && posts.length > 0 && (
            <div className="text-center pt-4">
              <Button 
                variant="outline" 
                onClick={handleLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-2" />
                    로딩 중...
                  </div>
                ) : (
                  '더보기'
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Floating Action Button */}
        <div className="fixed bottom-24 right-4">
          <Button 
            onClick={() => setIsWriteModalOpen(true)}
            className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg"
          >
            <Plus size={24} />
          </Button>
        </div>
      </div>

      {/* Post Write Modal */}
      <PostWriteModal
        isOpen={isWriteModalOpen}
        onClose={() => setIsWriteModalOpen(false)}
        onSubmit={handlePostSubmit}
        userProfile={userProfile}
      />
    </div>
  );
}