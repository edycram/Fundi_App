import { createClient } from 'npm:@supabase/supabase-js@2';

interface WhatsAppWebhookMessage {
  messaging_product: string;
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts: Array<{
    profile: {
      name: string;
    };
    wa_id: string;
  }>;
  messages: Array<{
    from: string;
    id: string;
    timestamp: string;
    text?: {
      body: string;
    };
    interactive?: {
      type: string;
      button_reply?: {
        id: string;
        title: string;
      };
    };
    type: string;
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

const WEBHOOK_VERIFY_TOKEN = Deno.env.get('WHATSAPP_WEBHOOK_VERIFY_TOKEN') || 'fundiconnect_webhook_token';

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Handle webhook verification (GET request)
    if (req.method === "GET") {
      const url = new URL(req.url);
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
        console.log('Webhook verified successfully');
        return new Response(challenge, { status: 200 });
      } else {
        console.log('Webhook verification failed');
        return new Response('Forbidden', { status: 403 });
      }
    }

    // Handle webhook messages (POST request)
    if (req.method === "POST") {
      const body = await req.json();
      console.log('WhatsApp webhook received:', JSON.stringify(body, null, 2));

      // Process webhook entry
      if (body.entry && body.entry.length > 0) {
        for (const entry of body.entry) {
          if (entry.changes && entry.changes.length > 0) {
            for (const change of entry.changes) {
              if (change.field === 'messages' && change.value.messages) {
                await processWhatsAppMessage(change.value);
              }
            }
          }
        }
      }

      return new Response(
        JSON.stringify({ status: 'success' }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response("Method not allowed", { status: 405 });

  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed' }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function processWhatsAppMessage(messageData: WhatsAppWebhookMessage) {
  const messages = messageData.messages;
  
  for (const message of messages) {
    const fromPhone = formatPhoneNumber(message.from);
    let responseText = '';
    let bookingId = '';

    // Handle interactive button responses
    if (message.interactive?.button_reply) {
      const buttonId = message.interactive.button_reply.id;
      
      if (buttonId.startsWith('accept_')) {
        bookingId = buttonId.replace('accept_', '');
        await handleBookingResponse(bookingId, fromPhone, 'accepted');
        responseText = '✅ Booking accepted! The client will be notified.';
      } else if (buttonId.startsWith('reject_')) {
        bookingId = buttonId.replace('reject_', '');
        await handleBookingResponse(bookingId, fromPhone, 'rejected');
        responseText = '❌ Booking rejected. The client will be notified.';
      }
    }
    
    // Handle text message responses (for Twilio format)
    else if (message.text?.body) {
      const text = message.text.body.toUpperCase().trim();
      
      // Match ACCEPT/REJECT patterns
      const acceptMatch = text.match(/ACCEPT\s+([A-Z0-9]{8})/);
      const rejectMatch = text.match(/REJECT\s+([A-Z0-9]{8})/);
      
      if (acceptMatch) {
        const bookingRef = acceptMatch[1];
        bookingId = await findBookingByReference(bookingRef, fromPhone);
        if (bookingId) {
          await handleBookingResponse(bookingId, fromPhone, 'accepted');
          responseText = '✅ Booking accepted! The client will be notified.';
        }
      } else if (rejectMatch) {
        const bookingRef = rejectMatch[1];
        bookingId = await findBookingByReference(bookingRef, fromPhone);
        if (bookingId) {
          await handleBookingResponse(bookingId, fromPhone, 'rejected');
          responseText = '❌ Booking rejected. The client will be notified.';
        }
      }
    }

    // Send confirmation response if we processed a booking action
    if (responseText && bookingId) {
      await sendConfirmationMessage(fromPhone, responseText);
      
      // Update notification status
      await supabase
        .from('notifications')
        .update({
          status: 'delivered',
          updated_at: new Date().toISOString()
        })
        .eq('booking_id', bookingId)
        .eq('type', 'booking_created');
    }
  }
}

async function handleBookingResponse(bookingId: string, fundiPhone: string, status: 'accepted' | 'rejected') {
  try {
    // Verify the fundi is authorized for this booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        fundi:profiles!bookings_fundi_id_fkey(phone),
        client:profiles!bookings_client_id_fkey(full_name, phone)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('Booking not found:', bookingId);
      return;
    }

    const fundiPhoneFormatted = formatPhoneNumber(booking.fundi.phone);
    if (fundiPhoneFormatted !== fundiPhone) {
      console.error('Unauthorized fundi response:', { expected: fundiPhoneFormatted, received: fundiPhone });
      return;
    }

    // Update booking status
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Error updating booking status:', updateError);
      return;
    }

    // Send notification to client
    const clientPhone = formatPhoneNumber(booking.client.phone);
    if (clientPhone) {
      const notificationType = status === 'accepted' ? 'booking_accepted' : 'booking_rejected';
      
      // Create notification record for client
      await supabase
        .from('notifications')
        .insert({
          booking_id: bookingId,
          recipient_id: booking.client_id,
          type: notificationType
        });

      // Send WhatsApp message to client
      await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({
          booking_id: bookingId,
          notification_type: notificationType
        })
      });
    }

    console.log(`Booking ${bookingId} ${status} by fundi`);

  } catch (error) {
    console.error('Error handling booking response:', error);
  }
}

async function findBookingByReference(bookingRef: string, fundiPhone: string): Promise<string | null> {
  try {
    // Find booking by last 8 characters of ID and fundi phone
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        fundi:profiles!bookings_fundi_id_fkey(phone)
      `)
      .eq('status', 'pending')
      .ilike('id', `%${bookingRef.toLowerCase()}`);

    if (error || !bookings) {
      return null;
    }

    // Find matching booking for this fundi
    for (const booking of bookings) {
      const fundiPhoneFormatted = formatPhoneNumber(booking.fundi.phone);
      if (fundiPhoneFormatted === fundiPhone) {
        return booking.id;
      }
    }

    return null;
  } catch (error) {
    console.error('Error finding booking by reference:', error);
    return null;
  }
}

async function sendConfirmationMessage(toPhone: string, message: string) {
  try {
    // This would use the same WhatsApp sending logic as the notification function
    // For now, we'll just log it
    console.log(`Sending confirmation to ${toPhone}: ${message}`);
  } catch (error) {
    console.error('Error sending confirmation message:', error);
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