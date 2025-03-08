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

