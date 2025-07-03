/*
  # Loyalty Points System

  1. New Tables
    - `loyalty_points`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `points` (integer, default 0)
      - `total_earned` (integer, default 0)
      - `total_redeemed` (integer, default 0)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `loyalty_transactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `booking_id` (uuid, references bookings, nullable)
      - `type` (text, 'earned' or 'redeemed')
      - `points` (integer)
      - `description` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for users to manage their own points

  3. Triggers
    - Award points when bookings are completed
    - Track all point transactions
*/

-- Create loyalty_points table
CREATE TABLE IF NOT EXISTS loyalty_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points integer DEFAULT 0 CHECK (points >= 0),
  total_earned integer DEFAULT 0 CHECK (total_earned >= 0),
  total_redeemed integer DEFAULT 0 CHECK (total_redeemed >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create loyalty_transactions table for audit trail
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('earned', 'redeemed')),
  points integer NOT NULL CHECK (points > 0),
  description text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- Loyalty points policies
CREATE POLICY "Users can read own loyalty points"
  ON loyalty_points
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own loyalty points"
  ON loyalty_points
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can manage all loyalty points"
  ON loyalty_points
  FOR ALL
  TO service_role
  USING (true);

-- Loyalty transactions policies
CREATE POLICY "Users can read own loyalty transactions"
  ON loyalty_transactions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can manage all loyalty transactions"
  ON loyalty_transactions
  FOR ALL
  TO service_role
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_loyalty_points_user_id ON loyalty_points(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user_id ON loyalty_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_booking_id ON loyalty_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_type ON loyalty_transactions(type);

-- Add trigger for updated_at
CREATE TRIGGER update_loyalty_points_updated_at BEFORE UPDATE ON loyalty_points
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to award loyalty points
CREATE OR REPLACE FUNCTION award_loyalty_points()
RETURNS TRIGGER AS $$
DECLARE
  points_to_award integer := 10;
  bonus_points integer := 0;
  total_points integer;
  user_bookings_count integer;
BEGIN
  -- Only award points when booking status changes to 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    
    -- Check how many completed bookings the client has
    SELECT COUNT(*) INTO user_bookings_count
    FROM bookings 
    WHERE client_id = NEW.client_id AND status = 'completed';
    
    -- Award bonus points for milestones
    IF user_bookings_count = 5 THEN
      bonus_points := 25; -- 5th booking bonus
    ELSIF user_bookings_count = 10 THEN
      bonus_points := 50; -- 10th booking bonus
    ELSIF user_bookings_count % 20 = 0 THEN
      bonus_points := 100; -- Every 20th booking bonus
    END IF;
    
    total_points := points_to_award + bonus_points;
    
    -- Insert or update loyalty points
    INSERT INTO loyalty_points (user_id, points, total_earned)
    VALUES (NEW.client_id, total_points, total_points)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      points = loyalty_points.points + total_points,
      total_earned = loyalty_points.total_earned + total_points,
      updated_at = now();
    
    -- Record the transaction
    INSERT INTO loyalty_transactions (
      user_id, 
      booking_id, 
      type, 
      points, 
      description
    ) VALUES (
      NEW.client_id,
      NEW.id,
      'earned',
      total_points,
      CASE 
        WHEN bonus_points > 0 THEN 
          format('Earned %s points for completing booking + %s bonus points (milestone: %s bookings)', 
                 points_to_award, bonus_points, user_bookings_count)
        ELSE 
          format('Earned %s points for completing booking', points_to_award)
      END
    );
    
    RAISE NOTICE 'Awarded % loyalty points to user % for booking %', total_points, NEW.client_id, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for awarding loyalty points
DROP TRIGGER IF EXISTS loyalty_points_trigger ON bookings;
CREATE TRIGGER loyalty_points_trigger
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (OLD.status != 'completed' AND NEW.status = 'completed')
  EXECUTE FUNCTION award_loyalty_points();

-- Function to redeem loyalty points
CREATE OR REPLACE FUNCTION redeem_loyalty_points(
  p_user_id uuid,
  p_points_to_redeem integer,
  p_description text
) RETURNS json AS $$
DECLARE
  current_points integer;
  result json;
BEGIN
  -- Get current points
  SELECT points INTO current_points
  FROM loyalty_points
  WHERE user_id = p_user_id;
  
  -- Check if user has enough points
  IF current_points IS NULL OR current_points < p_points_to_redeem THEN
    result := json_build_object(
      'success', false,
      'message', 'Insufficient loyalty points',
      'current_points', COALESCE(current_points, 0),
      'requested_points', p_points_to_redeem
    );
    RETURN result;
  END IF;
  
  -- Deduct points
  UPDATE loyalty_points
  SET 
    points = points - p_points_to_redeem,
    total_redeemed = total_redeemed + p_points_to_redeem,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Record the transaction
  INSERT INTO loyalty_transactions (
    user_id,
    type,
    points,
    description
  ) VALUES (
    p_user_id,
    'redeemed',
    p_points_to_redeem,
    p_description
  );
  
  result := json_build_object(
    'success', true,
    'message', 'Points redeemed successfully',
    'points_redeemed', p_points_to_redeem,
    'remaining_points', current_points - p_points_to_redeem
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get loyalty summary
CREATE OR REPLACE FUNCTION get_loyalty_summary(p_user_id uuid)
RETURNS json AS $$
DECLARE
  loyalty_data record;
  recent_transactions json;
  result json;
BEGIN
  -- Get loyalty points data
  SELECT * INTO loyalty_data
  FROM loyalty_points
  WHERE user_id = p_user_id;
  
  -- Get recent transactions
  SELECT json_agg(
    json_build_object(
      'id', id,
      'type', type,
      'points', points,
      'description', description,
      'created_at', created_at
    ) ORDER BY created_at DESC
  ) INTO recent_transactions
  FROM (
    SELECT * FROM loyalty_transactions
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 10
  ) recent;
  
  -- Build result
  result := json_build_object(
    'current_points', COALESCE(loyalty_data.points, 0),
    'total_earned', COALESCE(loyalty_data.total_earned, 0),
    'total_redeemed', COALESCE(loyalty_data.total_redeemed, 0),
    'recent_transactions', COALESCE(recent_transactions, '[]'::json)
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create initial loyalty points records for existing users
INSERT INTO loyalty_points (user_id, points, total_earned, total_redeemed)
SELECT 
  id,
  0,
  0,
  0
FROM profiles
WHERE role = 'client'
ON CONFLICT (user_id) DO NOTHING;