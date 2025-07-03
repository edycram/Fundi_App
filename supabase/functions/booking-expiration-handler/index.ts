import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    console.log('Processing booking expirations...');

    // Find expired notifications
    const { data: expiredNotifications, error: notificationError } = await supabase
      .from('notifications')
      .select(`
        id,
        booking_id,
        bookings!inner(
          id,
          status,
          client_id,
          fundi_id,
          service,
          scheduled_date,
          scheduled_time,
          client:profiles!bookings_client_id_fkey(full_name, phone)
        )
      `)
      .eq('type', 'booking_created')
      .eq('status', 'sent')
      .lt('expires_at', new Date().toISOString())
      .eq('bookings.status', 'pending');

    if (notificationError) {
      throw notificationError;
    }

    if (!expiredNotifications || expiredNotifications.length === 0) {
      return new Response(
        JSON.stringify({
          status: 'success',
          message: 'No expired bookings found',
          processed: 0
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let processedCount = 0;
    const results = [];

    for (const notification of expiredNotifications) {
      try {
        const bookingId = notification.booking_id;
        
        // Update booking status to expired
        const { error: bookingUpdateError } = await supabase
          .from('bookings')
          .update({
            status: 'expired',
            updated_at: new Date().toISOString()
          })
          .eq('id', bookingId)
          .eq('status', 'pending'); // Only update if still pending

        if (bookingUpdateError) {
          console.error(`Error updating booking ${bookingId}:`, bookingUpdateError);
          results.push({
            booking_id: bookingId,
            status: 'error',
            error: bookingUpdateError.message
          });
          continue;
        }

        // Update notification status
        const { error: notificationUpdateError } = await supabase
          .from('notifications')
          .update({
            status: 'expired',
            updated_at: new Date().toISOString()
          })
          .eq('id', notification.id);

        if (notificationUpdateError) {
          console.error(`Error updating notification ${notification.id}:`, notificationUpdateError);
        }

        // Create expiration notification for client
        await supabase
          .from('notifications')
          .insert({
            booking_id: bookingId,
            recipient_id: notification.bookings.client_id,
            type: 'booking_expired'
          });

        // Send WhatsApp notification to client about expiration
        const clientPhone = notification.bookings.client?.phone;
        if (clientPhone) {
          try {
            await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`
              },
              body: JSON.stringify({
                booking_id: bookingId,
                notification_type: 'booking_expired'
              })
            });
          } catch (whatsappError) {
            console.error(`Error sending WhatsApp notification for booking ${bookingId}:`, whatsappError);
          }
        }

        processedCount++;
        results.push({
          booking_id: bookingId,
          status: 'expired',
          service: notification.bookings.service,
          scheduled_date: notification.bookings.scheduled_date,
          scheduled_time: notification.bookings.scheduled_time
        });

        console.log(`Booking ${bookingId} marked as expired`);

      } catch (error) {
        console.error(`Error processing booking ${notification.booking_id}:`, error);
        results.push({
          booking_id: notification.booking_id,
          status: 'error',
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        status: 'success',
        message: `Processed ${processedCount} expired bookings`,
        processed: processedCount,
        total_found: expiredNotifications.length,
        results: results
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error('Booking expiration handler error:', error);
    
    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'Failed to process booking expirations',
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Helper function to generate expiration message
function generateExpirationMessage(booking: any): string {
  const service = booking.service;
  const date = new Date(booking.scheduled_date).toLocaleDateString();
  const time = booking.scheduled_time;

  return `⏰ *Booking Expired*

Your booking request for ${service} on ${date} at ${time} has expired as the fundi did not respond within 1 hour.

Please search for another fundi or try booking again.

We apologize for the inconvenience.`;
}