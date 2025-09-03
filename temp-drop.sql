-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS initialize_user_on_insert ON public.users;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_business() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_signup() CASCADE;
DROP FUNCTION IF EXISTS public.initialize_user_level() CASCADE;