export interface Profile {
  id: string;
  role: 'client' | 'fundi' | 'admin';
  full_name: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface FundiProfile {
  id: string;
  user_id: string;
  bio?: string;
  services: string[];
  location: string;
  hourly_rate: number;
  availability: Record<string, any>;
  profile_image_url?: string;
  is_verified: boolean;
  rating: number;
  total_jobs: number;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface Booking {
  id: string;
  client_id: string;
  fundi_id: string;
  service: string;
  description?: string;
  scheduled_date: string;
  scheduled_time: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled' | 'expired';
  total_amount: number;
  location: string;
  payment_status: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded';
  payment_reference?: string;
  payment_method?: 'paystack' | 'mpesa' | 'cash';
  payment_completed_at?: string;
  created_at: string;
  updated_at: string;
  client?: Profile;
  fundi?: Profile;
}

export interface Review {
  id: string;
  booking_id: string;
  client_id: string;
  fundi_id: string;
  rating: number;
  comment?: string;
  created_at: string;
  client?: Profile;
}

export interface AuthUser {
  id: string;
  email: string;
  profile?: Profile;
}

export interface PaymentAttempt {
  id: string;
  booking_id: string;
  payment_method: string;
  attempt_number: number;
  status: 'pending' | 'success' | 'failed';
  error_message?: string;
  payment_reference?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  booking_id: string;
  recipient_id: string;
  type: 'booking_created' | 'booking_accepted' | 'booking_rejected' | 'booking_expired' | 'payment_reminder';
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'expired';
  whatsapp_message_id?: string;
  message_content?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyPoints {
  id: string;
  user_id: string;
  points: number;
  total_earned: number;
  total_redeemed: number;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyTransaction {
  id: string;
  user_id: string;
  booking_id?: string;
  type: 'earned' | 'redeemed';
  points: number;
  description: string;
  created_at: string;
}

export interface LoyaltySummary {
  current_points: number;
  total_earned: number;
  total_redeemed: number;
  recent_transactions: LoyaltyTransaction[];
}

export interface Dispute {
  id: string;
  booking_id: string;
  complainant_id: string;
  respondent_id: string;
  type: 'payment_issue' | 'service_quality' | 'no_show' | 'cancellation' | 'communication' | 'safety_concern' | 'other';
  subject: string;
  description: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed' | 'escalated';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  evidence_urls: string[];
  admin_notes?: string;
  resolution?: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  booking?: Booking;
  complainant?: Profile;
  respondent?: Profile;
  resolved_by_profile?: Profile;
}

export interface DisputeMessage {
  id: string;
  dispute_id: string;
  sender_id: string;
  message: string;
  is_admin_message: boolean;
  created_at: string;
  sender?: Profile;
}