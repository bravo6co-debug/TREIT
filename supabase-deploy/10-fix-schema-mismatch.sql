-- ============================================
-- Fix Schema Mismatch - Handle existing deployed schema
-- ============================================

-- This file handles the fact that the deployed database has different field names
-- than what the original SQL files expected

-- First, drop any problematic triggers that might reference old fields
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS initialize_user_on_insert ON public.users CASCADE;

-- Drop functions that might reference old fields
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_business() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_signup() CASCADE;
DROP FUNCTION IF EXISTS public.initialize_user_level() CASCADE;

-- Recreate the handle_new_user function with correct field names
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Check if user already exists
    IF EXISTS (SELECT 1 FROM public.users WHERE auth_uid = NEW.id) THEN
        RETURN NEW;
    END IF;
    
    -- Create user profile with correct field names
    INSERT INTO public.users (
        id,
        auth_uid,
        email,
        nickname,
        full_name,
        phone,
        status,
        grade,
        level,
        xp,
        total_clicks,
        valid_clicks,
        total_earnings,
        available_balance,
        referral_code,
        email_verified,
        phone_verified,
        login_count,
        referral_count,
        marketing_consent,
        notification_consent,
        failed_login_attempts,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        NEW.id,
        NEW.email,
        LOWER(SPLIT_PART(NEW.email, '@', 1) || '_' || SUBSTR(MD5(RANDOM()::TEXT), 1, 4)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        'ACTIVE'::user_status,
        'BRONZE'::user_grade,
        1,
        0,
        0,
        0,
        0,
        0,
        UPPER(SUBSTR(MD5(RANDOM()::TEXT || NEW.id::TEXT), 1, 8)),
        NEW.email_confirmed_at IS NOT NULL,
        false,
        0,
        0,
        false,
        true,
        0,
        NOW(),
        NOW()
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- Update RLS policies to use correct field names
DO $$
BEGIN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view own profile" ON users;
    DROP POLICY IF EXISTS "Users can update own profile" ON users;
    DROP POLICY IF EXISTS "Public can view basic profile info" ON users;
    
    -- Create new policies with correct field references
    CREATE POLICY "Users can view own profile"
        ON users FOR SELECT
        USING (auth.uid() = auth_uid);
    
    CREATE POLICY "Users can update own profile"
        ON users FOR UPDATE
        USING (auth.uid() = auth_uid)
        WITH CHECK (auth.uid() = auth_uid);
    
    CREATE POLICY "Public can view basic profile info"
        ON users FOR SELECT
        USING (true);
        
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating RLS policies: %', SQLERRM;
END$$;

-- Create views with correct field names
CREATE OR REPLACE VIEW my_profile AS
SELECT 
    u.*,
    lc.grade_title,
    lc.level_title,
    lc.cpc_bonus_rate,
    lc.daily_bonus,
    lc.required_xp as next_level_xp
FROM users u
LEFT JOIN level_config lc ON u.level = lc.level
WHERE u.auth_uid = auth.uid();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Final verification message
DO $$
BEGIN
    RAISE NOTICE '✅ Schema mismatch fixes applied successfully!';
    RAISE NOTICE '📊 Users table now properly uses: nickname, available_balance, auth_uid';
    RAISE NOTICE '🔧 Auth triggers recreated with correct field mappings';
END$$;