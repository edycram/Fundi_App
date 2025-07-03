/*
  # Add Payment Tracking to Bookings

  1. Schema Changes
    - Add payment_status column to bookings table
    - Add payment_reference column for tracking external payments
    - Add payment_method column to track payment type
    - Add payment_completed_at timestamp

  2. Security
    - Update existing RLS policies to handle payment fields
*/

-- Add payment tracking columns to bookings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE bookings ADD COLUMN payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'paid', 'failed', 'refunded'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'payment_reference'
  ) THEN
    ALTER TABLE bookings ADD COLUMN payment_reference text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE bookings ADD COLUMN payment_method text CHECK (payment_method IN ('paystack', 'mpesa', 'cash'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'payment_completed_at'
  ) THEN
    ALTER TABLE bookings ADD COLUMN payment_completed_at timestamptz;
  END IF;
END $$;

-- Create payment_attempts table for retry logic
CREATE TABLE IF NOT EXISTS payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  payment_method text NOT NULL,
  attempt_number integer NOT NULL DEFAULT 1,
  status text NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
  error_message text,
  payment_reference text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on payment_attempts
ALTER TABLE payment_attempts ENABLE ROW LEVEL SECURITY;

-- Add policy for payment attempts
CREATE POLICY "Users can read own payment attempts"
  ON payment_attempts
  FOR SELECT
  TO authenticated
  USING (
    booking_id IN (
      SELECT id FROM bookings 
      WHERE client_id = auth.uid() OR fundi_id = auth.uid()
    )
  );

-- Create index for payment tracking
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_booking_id ON payment_attempts(booking_id);