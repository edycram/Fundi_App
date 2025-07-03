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

interface LoyaltyWebhookPayload {
  booking_id: string;
  client_id: string;
  action: 'booking_completed' | 'manual_award' | 'bonus_points';
  points?: number;
  description?: string;
}

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

    const payload: LoyaltyWebhookPayload = await req.json();
    console.log('Loyalty webhook received:', payload);

    const { booking_id, client_id, action, points, description } = payload;

    if (!booking_id || !client_id || !action) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let result;

    switch (action) {
      case 'booking_completed':
        result = await handleBookingCompleted(booking_id, client_id);
        break;
      
      case 'manual_award':
        if (!points || !description) {
          return new Response(
            JSON.stringify({ error: "Points and description required for manual award" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        result = await awardManualPoints(client_id, points, description);
        break;
      
      case 'bonus_points':
        result = await awardBonusPoints(client_id, booking_id, points || 50, description || 'Bonus points awarded');
        break;
      
      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }

    return new Response(
      JSON.stringify({
        status: 'success',
        message: 'Loyalty points processed successfully',
        result: result
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error('Loyalty webhook error:', error);
    
    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'Failed to process loyalty points',
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function handleBookingCompleted(bookingId: string, clientId: string) {
  // Verify booking exists and is completed
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .eq('client_id', clientId)
    .eq('status', 'completed')
    .single();

  if (bookingError || !booking) {
    throw new Error('Booking not found or not completed');
  }

  // Check if points already awarded for this booking
  const { data: existingTransaction } = await supabase
    .from('loyalty_transactions')
    .select('id')
    .eq('booking_id', bookingId)
    .eq('type', 'earned')
    .single();

  if (existingTransaction) {
    return { message: 'Points already awarded for this booking', points_awarded: 0 };
  }

  // Award base points (this will be handled by the database trigger)
  // But we can also award additional points here if needed
  return { message: 'Points will be awarded by database trigger', booking_id: bookingId };
}

async function awardManualPoints(clientId: string, points: number, description: string) {
  // Insert or update loyalty points
  const { error: upsertError } = await supabase
    .from('loyalty_points')
    .upsert({
      user_id: clientId,
      points: points,
      total_earned: points
    }, {
      onConflict: 'user_id',
      ignoreDuplicates: false
    });

  if (upsertError) {
    // If upsert failed, try to update existing record
    const { error: updateError } = await supabase
      .from('loyalty_points')
      .update({
        points: supabase.raw('points + ?', [points]),
        total_earned: supabase.raw('total_earned + ?', [points]),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', clientId);

    if (updateError) throw updateError;
  }

  // Record the transaction
  const { error: transactionError } = await supabase
    .from('loyalty_transactions')
    .insert({
      user_id: clientId,
      type: 'earned',
      points: points,
      description: description
    });

  if (transactionError) throw transactionError;

  return { message: 'Manual points awarded successfully', points_awarded: points };
}

async function awardBonusPoints(clientId: string, bookingId: string, points: number, description: string) {
  // Update loyalty points
  const { error: updateError } = await supabase
    .from('loyalty_points')
    .update({
      points: supabase.raw('points + ?', [points]),
      total_earned: supabase.raw('total_earned + ?', [points]),
      updated_at: new Date().toISOString()
    })
    .eq('user_id', clientId);

  if (updateError) throw updateError;

  // Record the transaction
  const { error: transactionError } = await supabase
    .from('loyalty_transactions')
    .insert({
      user_id: clientId,
      booking_id: bookingId,
      type: 'earned',
      points: points,
      description: description
    });

  if (transactionError) throw transactionError;

  return { message: 'Bonus points awarded successfully', points_awarded: points };
}