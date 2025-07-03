import { createClient } from 'npm:@supabase/supabase-js@2';

interface NotificationRequest {
  booking_id: string;
  notification_type: 'booking_created' | 'booking_accepted' | 'booking_rejected' | 'payment_reminder';
}

interface WhatsAppResponse {
  messaging_product: string;
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// WhatsApp Business API configuration
const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
const WHATSAPP_API_URL = `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

// Twilio WhatsApp configuration (alternative)
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_WHATSAPP_NUMBER = Deno.env.get('TWILIO_WHATSAPP_NUMBER');

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { booking_id, notification_type }: NotificationRequest = await req.json();

    if (!booking_id || !notification_type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch booking details with fundi and client information
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        client:profiles!bookings_client_id_fkey(full_name, phone),
        fundi:profiles!bookings_fundi_id_fkey(full_name, phone)
      `)
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get notification record
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .select('*')
      .eq('booking_id', booking_id)
      .eq('type', notification_type)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (notificationError) {
      console.error('Notification not found:', notificationError);
    }

    let result;
    
    // Try Meta WhatsApp Business API first, fallback to Twilio
    if (WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_NUMBER_ID) {
      result = await sendMetaWhatsAppMessage(booking, notification_type);
    } else if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
      result = await sendTwilioWhatsAppMessage(booking, notification_type);
    } else {
      throw new Error('No WhatsApp service configured');
    }

    // Update notification status
    if (notification) {
      await supabase
        .from('notifications')
        .update({
          status: 'sent',
          whatsapp_message_id: result.message_id,
          message_content: result.message_content,
          updated_at: new Date().toISOString()
        })
        .eq('id', notification.id);
    }

    return new Response(
      JSON.stringify({
        status: 'success',
        message: 'WhatsApp notification sent successfully',
        message_id: result.message_id,
        provider: result.provider
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error('WhatsApp notification error:', error);

    // Update notification status to failed
    try {
      const { booking_id } = await req.json();
      await supabase
        .from('notifications')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('booking_id', booking_id)
        .eq('type', 'booking_created');
    } catch (updateError) {
      console.error('Failed to update notification status:', updateError);
    }

    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'Failed to send WhatsApp notification',
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function sendMetaWhatsAppMessage(booking: any, notificationType: string) {
  const fundiPhone = formatPhoneNumber(booking.fundi.phone);
  
  if (!fundiPhone) {
    throw new Error('Fundi phone number not available');
  }

  const message = generateMessage(booking, notificationType);
  
  let messagePayload;

  if (notificationType === 'booking_created') {
    // Send interactive message with Accept/Reject buttons
    messagePayload = {
      messaging_product: "whatsapp",
      to: fundiPhone,
      type: "interactive",
      interactive: {
        type: "button",
        header: {
          type: "text",
          text: "🔧 New Booking Request"
        },
        body: {
          text: message
        },
        footer: {
          text: "FundiConnect - Respond within 1 hour"
        },
        action: {
          buttons: [
            {
              type: "reply",
              reply: {
                id: `accept_${booking.id}`,
                title: "✅ Accept"
              }
            },
            {
              type: "reply",
              reply: {
                id: `reject_${booking.id}`,
                title: "❌ Reject"
              }
            }
          ]
        }
      }
    };
  } else {
    // Send regular text message
    messagePayload = {
      messaging_product: "whatsapp",
      to: fundiPhone,
      type: "text",
      text: {
        body: message
      }
    };
  }

  const response = await fetch(WHATSAPP_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messagePayload),
  });

  const result: WhatsAppResponse = await response.json();

  if (!response.ok) {
    throw new Error(`Meta WhatsApp API error: ${JSON.stringify(result)}`);
  }

  return {
    message_id: result.messages[0]?.id,
    message_content: message,
    provider: 'meta'
  };
}

async function sendTwilioWhatsAppMessage(booking: any, notificationType: string) {
  const fundiPhone = formatPhoneNumber(booking.fundi.phone);
  
  if (!fundiPhone) {
    throw new Error('Fundi phone number not available');
  }

  const message = generateMessage(booking, notificationType);
  
  // Add interactive buttons for booking created (Twilio format)
  let fullMessage = message;
  if (notificationType === 'booking_created') {
    fullMessage += `\n\nReply with:\n✅ "ACCEPT ${booking.id.slice(-8)}" to accept\n❌ "REJECT ${booking.id.slice(-8)}" to reject\n\n⏰ You have 1 hour to respond`;
  }

  const twilioPayload = new URLSearchParams({
    From: `whatsapp:${TWILIO_WHATSAPP_NUMBER}`,
    To: `whatsapp:${fundiPhone}`,
    Body: fullMessage
  });

  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: twilioPayload,
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(`Twilio WhatsApp API error: ${result.message}`);
  }

  return {
    message_id: result.sid,
    message_content: fullMessage,
    provider: 'twilio'
  };
}

function generateMessage(booking: any, notificationType: string): string {
  const clientName = booking.client.full_name;
  const service = booking.service;
  const location = booking.location;
  const date = new Date(booking.scheduled_date).toLocaleDateString();
  const time = booking.scheduled_time;
  const amount = `KSH ${booking.total_amount.toLocaleString()}`;

  switch (notificationType) {
    case 'booking_created':
      return `🔧 *New Booking Request*

👤 *Client:* ${clientName}
🛠️ *Service:* ${service}
📍 *Location:* ${location}
📅 *Date:* ${date}
⏰ *Time:* ${time}
💰 *Amount:* ${amount}

${booking.description ? `📝 *Details:* ${booking.description}` : ''}

Please respond to accept or reject this booking.`;

    case 'booking_accepted':
      return `✅ *Booking Confirmed*

Your booking for ${service} has been accepted!
📅 ${date} at ${time}
📍 ${location}

The fundi will contact you soon with further details.`;

    case 'booking_rejected':
      return `❌ *Booking Declined*

Unfortunately, your booking for ${service} on ${date} has been declined.

Please search for another fundi or try a different time slot.`;

    case 'payment_reminder':
      return `💳 *Payment Reminder*

Your booking for ${service} is confirmed but payment is still pending.
💰 Amount: ${amount}

Please complete your payment to secure your booking.`;

    default:
      return `📱 FundiConnect Notification

You have an update regarding your booking for ${service}.`;
  }
}

function formatPhoneNumber(phone: string): string | null {
  if (!phone) return null;
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Handle Kenyan numbers
  if (cleaned.startsWith('254')) {
    return cleaned;
  } else if (cleaned.startsWith('0')) {
    return '254' + cleaned.slice(1);
  } else if (cleaned.length === 9) {
    return '254' + cleaned;
  }
  
  return cleaned;
}