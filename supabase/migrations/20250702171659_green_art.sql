/*
  # Disputes Management System

  1. New Tables
    - `disputes`
      - `id` (uuid, primary key)
      - `booking_id` (uuid, references bookings)
      - `complainant_id` (uuid, references profiles - who filed the dispute)
      - `respondent_id` (uuid, references profiles - who the dispute is against)
      - `type` (text, dispute category)
      - `subject` (text, brief description)
      - `description` (text, detailed description)
      - `status` (text, current status)
      - `priority` (text, urgency level)
      - `evidence_urls` (text array, supporting documents/images)
      - `admin_notes` (text, internal admin comments)
      - `resolution` (text, final resolution description)
      - `resolved_by` (uuid, references profiles - admin who resolved)
      - `resolved_at` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `dispute_messages`
      - `id` (uuid, primary key)
      - `dispute_id` (uuid, references disputes)
      - `sender_id` (uuid, references profiles)
      - `message` (text)
      - `is_admin_message` (boolean)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for users and admins
*/

-- Create disputes table
CREATE TABLE IF NOT EXISTS disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  complainant_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  respondent_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('payment_issue', 'service_quality', 'no_show', 'cancellation', 'communication', 'safety_concern', 'other')),
  subject text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed', 'escalated')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  evidence_urls text[] DEFAULT '{}',
  admin_notes text,
  resolution text,
  resolved_by uuid REFERENCES profiles(id),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create dispute_messages table for communication thread
CREATE TABLE IF NOT EXISTS dispute_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  is_admin_message boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_messages ENABLE ROW LEVEL SECURITY;

-- Disputes policies
CREATE POLICY "Users can read disputes they are involved in"
  ON disputes
  FOR SELECT
  TO authenticated
  USING (complainant_id = auth.uid() OR respondent_id = auth.uid());

CREATE POLICY "Users can create disputes for their bookings"
  ON disputes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    complainant_id = auth.uid() AND
    booking_id IN (
      SELECT id FROM bookings 
      WHERE client_id = auth.uid() OR fundi_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own disputes"
  ON disputes
  FOR UPDATE
  TO authenticated
  USING (complainant_id = auth.uid())
  WITH CHECK (complainant_id = auth.uid());

CREATE POLICY "Admins can manage all disputes"
  ON disputes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Dispute messages policies
CREATE POLICY "Users can read messages for their disputes"
  ON dispute_messages
  FOR SELECT
  TO authenticated
  USING (
    dispute_id IN (
      SELECT id FROM disputes 
      WHERE complainant_id = auth.uid() OR respondent_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to their disputes"
  ON dispute_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    dispute_id IN (
      SELECT id FROM disputes 
      WHERE complainant_id = auth.uid() OR respondent_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all dispute messages"
  ON dispute_messages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_disputes_booking_id ON disputes(booking_id);
CREATE INDEX IF NOT EXISTS idx_disputes_complainant_id ON disputes(complainant_id);
CREATE INDEX IF NOT EXISTS idx_disputes_respondent_id ON disputes(respondent_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_priority ON disputes(priority);
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON disputes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute_id ON dispute_messages(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_created_at ON dispute_messages(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_disputes_updated_at BEFORE UPDATE ON disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically set respondent based on complainant
CREATE OR REPLACE FUNCTION set_dispute_respondent()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the booking details to determine who the respondent should be
  SELECT 
    CASE 
      WHEN NEW.complainant_id = b.client_id THEN b.fundi_id
      WHEN NEW.complainant_id = b.fundi_id THEN b.client_id
      ELSE NULL
    END INTO NEW.respondent_id
  FROM bookings b
  WHERE b.id = NEW.booking_id;
  
  -- Set priority based on dispute type
  IF NEW.type IN ('safety_concern', 'no_show') THEN
    NEW.priority := 'high';
  ELSIF NEW.type IN ('payment_issue') THEN
    NEW.priority := 'medium';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-set respondent
CREATE TRIGGER set_dispute_respondent_trigger
  BEFORE INSERT ON disputes
  FOR EACH ROW
  EXECUTE FUNCTION set_dispute_respondent();

-- Function to get dispute statistics
CREATE OR REPLACE FUNCTION get_dispute_stats()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_disputes', COUNT(*),
    'open_disputes', COUNT(*) FILTER (WHERE status = 'open'),
    'resolved_disputes', COUNT(*) FILTER (WHERE status = 'resolved'),
    'high_priority', COUNT(*) FILTER (WHERE priority = 'high'),
    'by_type', json_object_agg(type, type_count)
  ) INTO result
  FROM (
    SELECT 
      type,
      COUNT(*) as type_count
    FROM disputes
    GROUP BY type
  ) type_stats,
  disputes;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;