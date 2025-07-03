/*
  # WhatsApp Notification System

  1. New Tables
    - `notifications`
      - `id` (uuid, primary key)
      - `booking_id` (uuid, references bookings)
      - `recipient_id` (uuid, references profiles)
      - `type` (text, notification type)
      - `status` (text, delivery status)
      - `whatsapp_message_id` (text, external message ID)
      - `expires_at` (timestamp, for auto-expiration)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Database Functions
    - Trigger function for new bookings
    - Function to handle booking expiration

  3. Security
    - Enable RLS on notifications table
    - Add appropriate policies
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('booking_created', 'booking_accepted', 'booking_rejected', 'booking_expired', 'payment_reminder')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'expired')),
  whatsapp_message_id text,
  message_content text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Add policies for notifications
CREATE POLICY "Users can read own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY "System can manage all notifications"
  ON notifications
  FOR ALL
  TO service_role
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_booking_id ON notifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at);

-- Add trigger for updated_at
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to send WhatsApp notification
CREATE OR REPLACE FUNCTION send_whatsapp_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for new bookings
  IF TG_OP = 'INSERT' THEN
    -- Insert notification record
    INSERT INTO notifications (
      booking_id,
      recipient_id,
      type,
      expires_at
    ) VALUES (
      NEW.id,
      NEW.fundi_id,
      'booking_created',
      NOW() + INTERVAL '1 hour'
    );

    -- Call edge function to send WhatsApp message
    PERFORM
      net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/send-whatsapp-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := jsonb_build_object(
          'booking_id', NEW.id,
          'notification_type', 'booking_created'
        )
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new bookings
DROP TRIGGER IF EXISTS trigger_send_whatsapp_notification ON bookings;
CREATE TRIGGER trigger_send_whatsapp_notification
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION send_whatsapp_notification();

-- Function to handle booking expiration
CREATE OR REPLACE FUNCTION handle_booking_expiration()
RETURNS void AS $$
BEGIN
  -- Update expired bookings
  UPDATE bookings 
  SET status = 'expired', updated_at = NOW()
  WHERE id IN (
    SELECT DISTINCT n.booking_id
    FROM notifications n
    JOIN bookings b ON b.id = n.booking_id
    WHERE n.type = 'booking_created'
      AND n.expires_at < NOW()
      AND b.status = 'pending'
      AND n.status != 'expired'
  );

  -- Update notification status
  UPDATE notifications
  SET status = 'expired', updated_at = NOW()
  WHERE type = 'booking_created'
    AND expires_at < NOW()
    AND status != 'expired';

  -- Log expired bookings count
  RAISE NOTICE 'Processed expired bookings at %', NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled function call (this would typically be handled by pg_cron or external scheduler)
-- For now, we'll create the function and it can be called via edge function or external cron