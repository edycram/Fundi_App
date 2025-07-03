import { createClient } from 'npm:@supabase/supabase-js@2';

interface PaymentRequest {
  booking_id: string;
  client_id: string;
  payment_method: 'paystack' | 'mpesa';
  callback_url?: string;
}

interface PaystackResponse {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface MpesaResponse {
  ResponseCode: string;
  ResponseDescription: string;
  MerchantRequestID?: string;
  CheckoutRequestID?: string;
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

// Payment provider configurations
const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');
const MPESA_CONSUMER_KEY = Deno.env.get('MPESA_CONSUMER_KEY');
const MPESA_CONSUMER_SECRET = Deno.env.get('MPESA_CONSUMER_SECRET');
const MPESA_SHORTCODE = Deno.env.get('MPESA_SHORTCODE');
const MPESA_PASSKEY = Deno.env.get('MPESA_PASSKEY');

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

    const { booking_id, client_id, payment_method, callback_url }: PaymentRequest = await req.json();

    // Validate required fields
    if (!booking_id || !client_id || !payment_method) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields: booking_id, client_id, payment_method" 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        client:profiles!bookings_client_id_fkey(full_name, phone),
        fundi:profiles!bookings_fundi_id_fkey(full_name)
      `)
      .eq('id', booking_id)
      .eq('client_id', client_id)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found or unauthorized" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if payment is already processed
    if (booking.payment_status === 'paid') {
      return new Response(
        JSON.stringify({ 
          status: 'success',
          message: 'Payment already completed',
          payment_status: 'paid'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get retry count for this booking
    const { data: attempts } = await supabase
      .from('payment_attempts')
      .select('attempt_number')
      .eq('booking_id', booking_id)
      .order('attempt_number', { ascending: false })
      .limit(1);

    const attemptNumber = attempts && attempts.length > 0 ? attempts[0].attempt_number + 1 : 1;
    const maxRetries = 3;

    if (attemptNumber > maxRetries) {
      return new Response(
        JSON.stringify({ 
          error: "Maximum payment attempts exceeded",
          max_retries: maxRetries,
          next_steps: "Please contact support or try a different payment method"
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update booking status to processing
    await supabase
      .from('bookings')
      .update({ 
        payment_status: 'processing',
        payment_method: payment_method
      })
      .eq('id', booking_id);

    let paymentResult;

    try {
      if (payment_method === 'paystack') {
        paymentResult = await processPaystackPayment(booking, callback_url);
      } else if (payment_method === 'mpesa') {
        paymentResult = await processMpesaPayment(booking);
      } else {
        throw new Error('Unsupported payment method');
      }

      // Log successful attempt
      await supabase
        .from('payment_attempts')
        .insert({
          booking_id: booking_id,
          payment_method: payment_method,
          attempt_number: attemptNumber,
          status: 'success',
          payment_reference: paymentResult.reference
        });

      // Update booking with payment reference
      await supabase
        .from('bookings')
        .update({ 
          payment_reference: paymentResult.reference,
          payment_status: 'pending' // Will be updated to 'paid' via webhook
        })
        .eq('id', booking_id);

      return new Response(
        JSON.stringify({
          status: 'success',
          message: 'Payment link generated successfully',
          payment_url: paymentResult.payment_url,
          reference: paymentResult.reference,
          payment_method: payment_method,
          next_steps: 'Complete payment using the provided link'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );

    } catch (paymentError) {
      console.error('Payment processing error:', paymentError);

      // Log failed attempt
      await supabase
        .from('payment_attempts')
        .insert({
          booking_id: booking_id,
          payment_method: payment_method,
          attempt_number: attemptNumber,
          status: 'failed',
          error_message: paymentError.message
        });

      // Update booking status back to pending
      await supabase
        .from('bookings')
        .update({ payment_status: 'pending' })
        .eq('id', booking_id);

      const canRetry = attemptNumber < maxRetries;

      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Payment processing failed',
          error: paymentError.message,
          attempt_number: attemptNumber,
          max_retries: maxRetries,
          can_retry: canRetry,
          next_steps: canRetry 
            ? 'You can retry the payment or try a different payment method'
            : 'Maximum retries exceeded. Please contact support or try a different payment method'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    
    return new Response(
      JSON.stringify({ 
        status: 'error',
        message: 'Internal server error',
        next_steps: 'Please try again later or contact support'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function processPaystackPayment(booking: any, callback_url?: string) {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('Paystack configuration missing');
  }

  const reference = `fundi_${booking.id}_${Date.now()}`;
  
  const paymentData = {
    email: booking.client.email || `client_${booking.client_id}@fundiconnect.com`,
    amount: booking.total_amount * 100, // Paystack expects amount in kobo
    reference: reference,
    callback_url: callback_url || `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-webhook`,
    metadata: {
      booking_id: booking.id,
      client_id: booking.client_id,
      fundi_id: booking.fundi_id,
      service: booking.service
    }
  };

  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(paymentData),
  });

  const result: PaystackResponse = await response.json();

  if (!result.status || !result.data) {
    throw new Error(result.message || 'Paystack payment initialization failed');
  }

  return {
    payment_url: result.data.authorization_url,
    reference: result.data.reference
  };
}

async function processMpesaPayment(booking: any) {
  if (!MPESA_CONSUMER_KEY || !MPESA_CONSUMER_SECRET || !MPESA_SHORTCODE || !MPESA_PASSKEY) {
    throw new Error('M-Pesa configuration missing');
  }

  // Get M-Pesa access token
  const auth = btoa(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`);
  
  const tokenResponse = await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
    },
  });

  const tokenData = await tokenResponse.json();
  
  if (!tokenData.access_token) {
    throw new Error('Failed to get M-Pesa access token');
  }

  // Generate timestamp and password
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
  const password = btoa(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`);
  
  const reference = `FUNDI${booking.id.slice(-8).toUpperCase()}${Date.now().toString().slice(-4)}`;
  
  const stkPushData = {
    BusinessShortCode: MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: booking.total_amount,
    PartyA: booking.client.phone || '254700000000', // Client phone number
    PartyB: MPESA_SHORTCODE,
    PhoneNumber: booking.client.phone || '254700000000',
    CallBackURL: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mpesa-webhook`,
    AccountReference: reference,
    TransactionDesc: `Payment for ${booking.service} - FundiConnect`
  };

  const stkResponse = await fetch('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokenData.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(stkPushData),
  });

  const stkResult: MpesaResponse = await stkResponse.json();

  if (stkResult.ResponseCode !== '0') {
    throw new Error(stkResult.ResponseDescription || 'M-Pesa STK push failed');
  }

  return {
    payment_url: `mpesa://pay?phone=${booking.client.phone}&amount=${booking.total_amount}&reference=${reference}`,
    reference: stkResult.CheckoutRequestID || reference
  };
}