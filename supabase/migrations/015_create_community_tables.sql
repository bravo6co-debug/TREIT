-- ========================================
-- Community Features Migration
-- ========================================

-- Community Posts Table
CREATE TABLE IF NOT EXISTS public.community_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    image_url TEXT,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_trending BOOLEAN DEFAULT FALSE,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    reports_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Community Comments Table
CREATE TABLE IF NOT EXISTS public.community_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL,
    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES public.community_comments(id) ON DELETE CASCADE,
    likes_count INTEGER DEFAULT 0,
    reports_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Community Likes Table (for posts and comments)
CREATE TABLE IF NOT EXISTS public.community_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment')),
    target_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, target_type, target_id)
);

-- Community Reports Table
CREATE TABLE IF NOT EXISTS public.community_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment')),
    target_id UUID NOT NULL,
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    reviewed_by UUID REFERENCES public.user_profiles(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, target_type, target_id)
);

-- ========================================
-- Indexes for Performance
-- ========================================

-- Posts indexes
CREATE INDEX IF NOT EXISTS idx_community_posts_user_id ON public.community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_category ON public.community_posts(category);
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON public.community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_is_active ON public.community_posts(is_active);
CREATE INDEX IF NOT EXISTS idx_community_posts_is_trending ON public.community_posts(is_trending) WHERE is_trending = TRUE;
CREATE INDEX IF NOT EXISTS idx_community_posts_is_pinned ON public.community_posts(is_pinned) WHERE is_pinned = TRUE;

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_community_comments_post_id ON public.community_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_user_id ON public.community_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_parent_comment_id ON public.community_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_created_at ON public.community_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_comments_is_active ON public.community_comments(is_active);

-- Likes indexes
CREATE INDEX IF NOT EXISTS idx_community_likes_user_id ON public.community_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_community_likes_target ON public.community_likes(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_community_likes_created_at ON public.community_likes(created_at DESC);

-- Reports indexes
CREATE INDEX IF NOT EXISTS idx_community_reports_target ON public.community_reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_community_reports_status ON public.community_reports(status);
CREATE INDEX IF NOT EXISTS idx_community_reports_created_at ON public.community_reports(created_at DESC);

-- ========================================
-- Functions and Triggers
-- ========================================

-- Function to update likes count on posts
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.target_type = 'post' THEN
            UPDATE public.community_posts 
            SET likes_count = likes_count + 1, updated_at = NOW()
            WHERE id = NEW.target_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.target_type = 'post' THEN
            UPDATE public.community_posts 
            SET likes_count = GREATEST(likes_count - 1, 0), updated_at = NOW()
            WHERE id = OLD.target_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update likes count on comments
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.target_type = 'comment' THEN
            UPDATE public.community_comments 
            SET likes_count = likes_count + 1, updated_at = NOW()
            WHERE id = NEW.target_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.target_type = 'comment' THEN
            UPDATE public.community_comments 
            SET likes_count = GREATEST(likes_count - 1, 0), updated_at = NOW()
            WHERE id = OLD.target_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update comments count on posts
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.community_posts 
        SET comments_count = comments_count + 1, updated_at = NOW()
        WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.community_posts 
        SET comments_count = GREATEST(comments_count - 1, 0), updated_at = NOW()
        WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update reports count
CREATE OR REPLACE FUNCTION update_reports_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.target_type = 'post' THEN
            UPDATE public.community_posts 
            SET reports_count = reports_count + 1, updated_at = NOW()
            WHERE id = NEW.target_id;
        ELSIF NEW.target_type = 'comment' THEN
            UPDATE public.community_comments 
            SET reports_count = reports_count + 1, updated_at = NOW()
            WHERE id = NEW.target_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.target_type = 'post' THEN
            UPDATE public.community_posts 
            SET reports_count = GREATEST(reports_count - 1, 0), updated_at = NOW()
            WHERE id = OLD.target_id;
        ELSIF OLD.target_type = 'comment' THEN
            UPDATE public.community_comments 
            SET reports_count = GREATEST(reports_count - 1, 0), updated_at = NOW()
            WHERE id = OLD.target_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to increment post views
CREATE OR REPLACE FUNCTION increment_post_views(post_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.community_posts 
    SET views_count = views_count + 1, updated_at = NOW()
    WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- Triggers
-- ========================================

-- Triggers for updating likes count
DROP TRIGGER IF EXISTS trigger_update_post_likes_count ON public.community_likes;
CREATE TRIGGER trigger_update_post_likes_count
    AFTER INSERT OR DELETE ON public.community_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_post_likes_count();

DROP TRIGGER IF EXISTS trigger_update_comment_likes_count ON public.community_likes;
CREATE TRIGGER trigger_update_comment_likes_count
    AFTER INSERT OR DELETE ON public.community_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_comment_likes_count();

-- Triggers for updating comments count
DROP TRIGGER IF EXISTS trigger_update_post_comments_count ON public.community_comments;
CREATE TRIGGER trigger_update_post_comments_count
    AFTER INSERT OR DELETE ON public.community_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_post_comments_count();

-- Triggers for updating reports count
DROP TRIGGER IF EXISTS trigger_update_reports_count ON public.community_reports;
CREATE TRIGGER trigger_update_reports_count
    AFTER INSERT OR DELETE ON public.community_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_reports_count();

-- Triggers for updating updated_at timestamps
DROP TRIGGER IF EXISTS trigger_update_community_posts_updated_at ON public.community_posts;
CREATE TRIGGER trigger_update_community_posts_updated_at
    BEFORE UPDATE ON public.community_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_community_comments_updated_at ON public.community_comments;
CREATE TRIGGER trigger_update_community_comments_updated_at
    BEFORE UPDATE ON public.community_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- Row Level Security (RLS) Policies
-- ========================================

-- Enable RLS on all community tables
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;

-- ========================================
-- RLS Policies for community_posts
-- ========================================

-- Anyone can read active posts
CREATE POLICY "Anyone can view active posts" ON public.community_posts
    FOR SELECT USING (is_active = true);

-- Users can insert their own posts
CREATE POLICY "Users can create their own posts" ON public.community_posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own posts
CREATE POLICY "Users can update their own posts" ON public.community_posts
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete their own posts" ON public.community_posts
    FOR DELETE USING (auth.uid() = user_id);

-- Admins can do everything
CREATE POLICY "Admins can manage all posts" ON public.community_posts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'support')
        )
    );

-- ========================================
-- RLS Policies for community_comments
-- ========================================

-- Anyone can read active comments
CREATE POLICY "Anyone can view active comments" ON public.community_comments
    FOR SELECT USING (is_active = true);

-- Users can insert their own comments
CREATE POLICY "Users can create their own comments" ON public.community_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update their own comments" ON public.community_comments
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments" ON public.community_comments
    FOR DELETE USING (auth.uid() = user_id);

-- Admins can do everything
CREATE POLICY "Admins can manage all comments" ON public.community_comments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'support')
        )
    );

-- ========================================
-- RLS Policies for community_likes
-- ========================================

-- Users can view all likes
CREATE POLICY "Users can view all likes" ON public.community_likes
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can create their own likes
CREATE POLICY "Users can create their own likes" ON public.community_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own likes
CREATE POLICY "Users can delete their own likes" ON public.community_likes
    FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- RLS Policies for community_reports
-- ========================================

-- Users can view their own reports
CREATE POLICY "Users can view their own reports" ON public.community_reports
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own reports
CREATE POLICY "Users can create their own reports" ON public.community_reports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can manage all reports
CREATE POLICY "Admins can manage all reports" ON public.community_reports
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'support')
        )
    );

-- ========================================
-- Grant permissions
-- ========================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_comments TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.community_likes TO authenticated;
GRANT SELECT, INSERT ON public.community_reports TO authenticated;

-- Grant all permissions to service role
GRANT ALL ON public.community_posts TO service_role;
GRANT ALL ON public.community_comments TO service_role;
GRANT ALL ON public.community_likes TO service_role;
GRANT ALL ON public.community_reports TO service_role;

-- Grant usage on sequences (if any)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;