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
      return new Response("Method not allowed", { status: 405 });
    }

    const webhookData = await req.json();
    console.log('Webhook received:', webhookData);

    // Handle Paystack webhook
    if (webhookData.event === 'charge.success') {
      await handlePaystackSuccess(webhookData.data);
    }

    return new Response(
      JSON.stringify({ status: 'success' }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed' }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function handlePaystackSuccess(data: any) {
  const { reference, metadata } = data;
  
  if (!metadata?.booking_id) {
    console.error('No booking ID in webhook metadata');
    return;
  }

  try {
    // Update booking payment status
    const { error } = await supabase
      .from('bookings')
      .update({
        payment_status: 'paid',
        payment_completed_at: new Date().toISOString()
      })
      .eq('id', metadata.booking_id)
      .eq('payment_reference', reference);

    if (error) {
      console.error('Error updating booking payment status:', error);
      return;
    }

    console.log(`Payment confirmed for booking ${metadata.booking_id}`);

  } catch (error) {
    console.error('Error processing payment webhook:', error);
  }
}