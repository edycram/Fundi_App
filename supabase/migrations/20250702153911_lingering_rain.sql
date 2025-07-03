/*
  # Initial Schema for FundiConnect

  1. Authentication Setup
    - Uses Supabase built-in auth for users
    - Custom profiles table to extend user data with roles

  2. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `role` (text, either 'client' or 'fundi')
      - `full_name` (text)
      - `phone` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `fundi_profiles`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `bio` (text)
      - `services` (text array)
      - `location` (text)
      - `hourly_rate` (integer)
      - `availability` (jsonb)
      - `profile_image_url` (text)
      - `is_verified` (boolean)
      - `rating` (decimal)
      - `total_jobs` (integer)
    
    - `bookings`
      - `id` (uuid, primary key)
      - `client_id` (uuid, references profiles)
      - `fundi_id` (uuid, references profiles)
      - `service` (text)
      - `description` (text)
      - `scheduled_date` (date)
      - `scheduled_time` (time)
      - `status` (text)
      - `total_amount` (integer)
      - `location` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `reviews`
      - `id` (uuid, primary key)
      - `booking_id` (uuid, references bookings)
      - `client_id` (uuid, references profiles)
      - `fundi_id` (uuid, references profiles)
      - `rating` (integer, 1-5)
      - `comment` (text)
      - `created_at` (timestamp)

  3. Security
    - Enable RLS on all tables
    - Add appropriate policies for each user role
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('client', 'fundi')),
  full_name text NOT NULL,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create fundi_profiles table
CREATE TABLE IF NOT EXISTS fundi_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bio text,
  services text[] NOT NULL DEFAULT '{}',
  location text NOT NULL,
  hourly_rate integer NOT NULL DEFAULT 0,
  availability jsonb DEFAULT '{}',
  profile_image_url text,
  is_verified boolean DEFAULT false,
  rating decimal(3,2) DEFAULT 0.00,
  total_jobs integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fundi_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service text NOT NULL,
  description text,
  scheduled_date date NOT NULL,
  scheduled_time time NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled')),
  total_amount integer NOT NULL DEFAULT 0,
  location text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fundi_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(booking_id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fundi_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Fundi profiles policies
CREATE POLICY "Anyone can read fundi profiles"
  ON fundi_profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Fundis can manage own profile"
  ON fundi_profiles
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Bookings policies
CREATE POLICY "Users can read own bookings"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (client_id = auth.uid() OR fundi_id = auth.uid());

CREATE POLICY "Clients can create bookings"
  ON bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Users can update relevant bookings"
  ON bookings
  FOR UPDATE
  TO authenticated
  USING (client_id = auth.uid() OR fundi_id = auth.uid());

-- Reviews policies
CREATE POLICY "Anyone can read reviews"
  ON reviews
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Clients can create reviews for their bookings"
  ON reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_fundi_profiles_location ON fundi_profiles(location);
CREATE INDEX IF NOT EXISTS idx_fundi_profiles_services ON fundi_profiles USING GIN(services);
CREATE INDEX IF NOT EXISTS idx_fundi_profiles_rating ON fundi_profiles(rating DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_fundi_id ON bookings(fundi_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_reviews_fundi_id ON reviews(fundi_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fundi_profiles_updated_at BEFORE UPDATE ON fundi_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();