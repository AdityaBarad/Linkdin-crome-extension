-- Enable Row Level Security
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create a table for user profiles
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for profiles
CREATE POLICY "Users can view their own profile" 
  ON public.profiles 
  FOR ALL 
  USING (auth.uid() = id);

-- Create a trigger to create profile on user creation
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create a table for applied jobs
CREATE TABLE public.applied_jobs (
  id SERIAL PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id),
  job_id TEXT,
  job_title TEXT,
  company_name TEXT,
  job_location TEXT,
  job_description TEXT,
  job_url TEXT,
  date_applied TIMESTAMPTZ DEFAULT NOW(),
  application_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  platform TEXT
);

-- Disable RLS on applied_jobs
ALTER TABLE public.applied_jobs DISABLE ROW LEVEL SECURITY;

-- Create subscription plans table
CREATE TABLE public.subscription_plans (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  monthly_limit INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user subscriptions table - Updated to use profile_id instead of user_id
CREATE TABLE public.user_subscriptions (
  id SERIAL PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) NOT NULL, -- Changed from user_id to profile_id
  plan_id INTEGER REFERENCES public.subscription_plans(id) NOT NULL,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Replace the application_counts table with automation_sessions
DROP TABLE IF EXISTS public.application_counts;

-- Create automation sessions table - Updated to use profile_id instead of user_id
CREATE TABLE public.automation_sessions (
  id SERIAL PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) NOT NULL, -- Changed from user_id to profile_id
  platform TEXT NOT NULL, -- linkedin, indeed, internshala, etc.
  session_start TIMESTAMPTZ DEFAULT NOW(),
  session_end TIMESTAMPTZ,
  jobs_requested INTEGER NOT NULL, -- How many jobs the user wanted to apply to
  jobs_applied INTEGER NOT NULL DEFAULT 0, -- How many jobs were actually applied to
  search_query JSONB, -- Store search parameters used (keywords, location, etc.)
  status TEXT NOT NULL DEFAULT 'started', -- started, completed, failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comment to make the purpose of the table clearer
COMMENT ON TABLE public.automation_sessions IS 'Records each individual automation run (not user login sessions)';
COMMENT ON COLUMN public.automation_sessions.session_start IS 'When the automation run was started';
COMMENT ON COLUMN public.automation_sessions.session_end IS 'When the automation run was completed';
COMMENT ON COLUMN public.automation_sessions.jobs_requested IS 'Number of jobs the user requested to apply to in this automation run';
COMMENT ON COLUMN public.automation_sessions.jobs_applied IS 'Number of jobs actually applied to in this automation run';

-- Create payment transactions table - Updated to use profile_id instead of user_id
CREATE TABLE public.payment_transactions (
  id SERIAL PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) NOT NULL, -- Changed from user_id to profile_id
  subscription_id INTEGER REFERENCES public.user_subscriptions(id),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_method TEXT,
  payment_gateway TEXT,
  transaction_id TEXT,
  transaction_status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed
  payment_date TIMESTAMPTZ,
  metadata JSONB, -- For storing gateway-specific details
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  receipt_url TEXT,
  invoice_id TEXT,
  billing_address JSONB
);

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, description, price, monthly_limit)
VALUES 
  ('Basic', 'Apply to up to 30 jobs per month', 0, 30),
  ('Standard', 'Apply to up to 300 jobs per month', 200, 300),
  ('Premium', 'Apply to up to 600 jobs per month', 500, 600);

-- Add policies for subscription tables
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Anyone can read subscription plans
CREATE POLICY "Anyone can read subscription plans" 
  ON public.subscription_plans 
  FOR SELECT 
  USING (true);

-- Users can only see their own subscriptions - updated to use profile_id
CREATE POLICY "Users can view their own subscriptions" 
  ON public.user_subscriptions 
  FOR SELECT 
  USING (auth.uid() = profile_id); -- Changed from user_id to profile_id

-- Add INSERT policy for user_subscriptions
CREATE POLICY "Users can insert their own subscriptions" 
  ON public.user_subscriptions 
  FOR INSERT 
  WITH CHECK (auth.uid() = profile_id);

-- Add policies for automation sessions table
ALTER TABLE public.automation_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own automation sessions - updated to use profile_id
CREATE POLICY "Users can view their own automation sessions" 
  ON public.automation_sessions 
  FOR SELECT 
  USING (auth.uid() = profile_id); -- Changed from user_id to profile_id

-- Users can insert their own automation sessions - updated to use profile_id
CREATE POLICY "Users can insert their own automation sessions" 
  ON public.automation_sessions 
  FOR INSERT 
  WITH CHECK (auth.uid() = profile_id); -- Changed from user_id to profile_id

-- Users can update their own automation sessions - updated to use profile_id
CREATE POLICY "Users can update their own automation sessions" 
  ON public.automation_sessions 
  FOR UPDATE
  USING (auth.uid() = profile_id); -- Changed from user_id to profile_id

-- Add policies for payment transactions
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own payment transactions - updated to use profile_id
CREATE POLICY "Users can view their own payment transactions" 
  ON public.payment_transactions 
  FOR SELECT 
  USING (auth.uid() = profile_id); -- Changed from user_id to profile_id

