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
    console.log('M-Pesa webhook received:', webhookData);

    // Handle M-Pesa callback
    if (webhookData.Body?.stkCallback) {
      await handleMpesaCallback(webhookData.Body.stkCallback);
    }

    return new Response(
      JSON.stringify({ 
        ResultCode: 0,
        ResultDesc: "Success"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error('M-Pesa webhook error:', error);
    
    return new Response(
      JSON.stringify({ 
        ResultCode: 1,
        ResultDesc: "Failed"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function handleMpesaCallback(callback: any) {
  const { ResultCode, CheckoutRequestID, CallbackMetadata } = callback;
  
  if (ResultCode === 0) {
    // Payment successful
    const metadata = CallbackMetadata?.Item || [];
    const receiptNumber = metadata.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value;
    
    try {
      // Find booking by payment reference (CheckoutRequestID)
      const { data: booking, error: findError } = await supabase
        .from('bookings')
        .select('id')
        .eq('payment_reference', CheckoutRequestID)
        .single();

      if (findError || !booking) {
        console.error('Booking not found for CheckoutRequestID:', CheckoutRequestID);
        return;
      }

      // Update booking payment status
      const { error } = await supabase
        .from('bookings')
        .update({
          payment_status: 'paid',
          payment_completed_at: new Date().toISOString()
        })
        .eq('id', booking.id);

      if (error) {
        console.error('Error updating booking payment status:', error);
        return;
      }

      console.log(`M-Pesa payment confirmed for booking ${booking.id}, receipt: ${receiptNumber}`);

    } catch (error) {
      console.error('Error processing M-Pesa callback:', error);
    }
  } else {
    // Payment failed
    console.log('M-Pesa payment failed:', callback.ResultDesc);
    
    // Update payment status to failed for the booking
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ payment_status: 'failed' })
        .eq('payment_reference', CheckoutRequestID);

      if (error) {
        console.error('Error updating failed payment status:', error);
      }
    } catch (error) {
      console.error('Error handling failed M-Pesa payment:', error);
    }
  }
}