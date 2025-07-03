import { createClient } from 'npm:@supabase/supabase-js@2';

interface DisputeSubmission {
  booking_id: string;
  type: string;
  subject: string;
  description: string;
  evidence_urls?: string[];
}

interface DisputeResolution {
  dispute_id: string;
  resolution: string;
  status: 'resolved' | 'closed';
  admin_notes?: string;
  action?: 'refund' | 'warning' | 'ban' | 'none';
}

interface DisputeMessage {
  dispute_id: string;
  message: string;
  is_admin_message?: boolean;
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

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Route handling
    switch (path) {
      case 'submit':
        if (req.method === 'POST') {
          return await handleSubmitDispute(req, user.id);
        }
        break;
      
      case 'resolve':
        if (req.method === 'POST') {
          return await handleResolveDispute(req, user.id);
        }
        break;
      
      case 'message':
        if (req.method === 'POST') {
          return await handleAddMessage(req, user.id);
        }
        break;
      
      case 'list':
        if (req.method === 'GET') {
          return await handleListDisputes(req, user.id);
        }
        break;
      
      case 'details':
        if (req.method === 'GET') {
          return await handleGetDisputeDetails(req, user.id);
        }
        break;
      
      default:
        return new Response(
          JSON.stringify({ error: "Invalid endpoint" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error('Dispute management error:', error);
    
    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'Failed to process dispute request',
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function handleSubmitDispute(req: Request, userId: string) {
  const { booking_id, type, subject, description, evidence_urls }: DisputeSubmission = await req.json();

  // Validate required fields
  if (!booking_id || !type || !subject || !description) {
    return new Response(
      JSON.stringify({ error: "Missing required fields" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Verify user is involved in the booking
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', booking_id)
    .or(`client_id.eq.${userId},fundi_id.eq.${userId}`)
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

  // Check if dispute already exists for this booking
  const { data: existingDispute } = await supabase
    .from('disputes')
    .select('id')
    .eq('booking_id', booking_id)
    .eq('complainant_id', userId)
    .single();

  if (existingDispute) {
    return new Response(
      JSON.stringify({ error: "Dispute already exists for this booking" }),
      {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Create the dispute
  const { data: dispute, error: disputeError } = await supabase
    .from('disputes')
    .insert({
      booking_id,
      complainant_id: userId,
      type,
      subject,
      description,
      evidence_urls: evidence_urls || []
    })
    .select(`
      *,
      booking:bookings(*),
      complainant:profiles!disputes_complainant_id_fkey(*),
      respondent:profiles!disputes_respondent_id_fkey(*)
    `)
    .single();

  if (disputeError) {
    return new Response(
      JSON.stringify({ error: "Failed to create dispute", details: disputeError.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Send notification to respondent and admin
  await notifyDisputeCreated(dispute);

  return new Response(
    JSON.stringify({
      status: 'success',
      message: 'Dispute submitted successfully',
      dispute: dispute
    }),
    {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

async function handleResolveDispute(req: Request, userId: string) {
  const { dispute_id, resolution, status, admin_notes, action }: DisputeResolution = await req.json();

  // Check if user is admin
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (!userProfile || userProfile.role !== 'admin') {
    return new Response(
      JSON.stringify({ error: "Admin access required" }),
      {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Update dispute
  const { data: dispute, error: updateError } = await supabase
    .from('disputes')
    .update({
      resolution,
      status,
      admin_notes,
      resolved_by: userId,
      resolved_at: new Date().toISOString()
    })
    .eq('id', dispute_id)
    .select(`
      *,
      booking:bookings(*),
      complainant:profiles!disputes_complainant_id_fkey(*),
      respondent:profiles!disputes_respondent_id_fkey(*)
    `)
    .single();

  if (updateError) {
    return new Response(
      JSON.stringify({ error: "Failed to resolve dispute", details: updateError.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Execute admin action if specified
  if (action && dispute) {
    await executeAdminAction(dispute, action);
  }

  // Notify involved parties
  await notifyDisputeResolved(dispute);

  return new Response(
    JSON.stringify({
      status: 'success',
      message: 'Dispute resolved successfully',
      dispute: dispute
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

async function handleAddMessage(req: Request, userId: string) {
  const { dispute_id, message, is_admin_message }: DisputeMessage = await req.json();

  // Verify user can access this dispute
  const { data: dispute } = await supabase
    .from('disputes')
    .select('complainant_id, respondent_id')
    .eq('id', dispute_id)
    .single();

  if (!dispute) {
    return new Response(
      JSON.stringify({ error: "Dispute not found" }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Check if user is admin for admin messages
  if (is_admin_message) {
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (!userProfile || userProfile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: "Admin access required for admin messages" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } else {
    // Check if user is involved in dispute
    if (dispute.complainant_id !== userId && dispute.respondent_id !== userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized to message this dispute" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  }

  // Add message
  const { data: disputeMessage, error: messageError } = await supabase
    .from('dispute_messages')
    .insert({
      dispute_id,
      sender_id: userId,
      message,
      is_admin_message: is_admin_message || false
    })
    .select(`
      *,
      sender:profiles(*)
    `)
    .single();

  if (messageError) {
    return new Response(
      JSON.stringify({ error: "Failed to add message", details: messageError.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  return new Response(
    JSON.stringify({
      status: 'success',
      message: 'Message added successfully',
      dispute_message: disputeMessage
    }),
    {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

async function handleListDisputes(req: Request, userId: string) {
  const url = new URL(req.url);
  const isAdmin = url.searchParams.get('admin') === 'true';
  const status = url.searchParams.get('status');
  const priority = url.searchParams.get('priority');

  let query = supabase
    .from('disputes')
    .select(`
      *,
      booking:bookings(*),
      complainant:profiles!disputes_complainant_id_fkey(*),
      respondent:profiles!disputes_respondent_id_fkey(*),
      resolved_by_profile:profiles!disputes_resolved_by_fkey(*)
    `)
    .order('created_at', { ascending: false });

  if (isAdmin) {
    // Check if user is admin
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (!userProfile || userProfile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } else {
    // Filter to user's disputes only
    query = query.or(`complainant_id.eq.${userId},respondent_id.eq.${userId}`);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (priority) {
    query = query.eq('priority', priority);
  }

  const { data: disputes, error } = await query;

  if (error) {
    return new Response(
      JSON.stringify({ error: "Failed to fetch disputes", details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  return new Response(
    JSON.stringify({
      status: 'success',
      disputes: disputes || []
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

async function handleGetDisputeDetails(req: Request, userId: string) {
  const url = new URL(req.url);
  const disputeId = url.searchParams.get('id');

  if (!disputeId) {
    return new Response(
      JSON.stringify({ error: "Dispute ID required" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Get dispute with messages
  const { data: dispute, error: disputeError } = await supabase
    .from('disputes')
    .select(`
      *,
      booking:bookings(*),
      complainant:profiles!disputes_complainant_id_fkey(*),
      respondent:profiles!disputes_respondent_id_fkey(*),
      resolved_by_profile:profiles!disputes_resolved_by_fkey(*)
    `)
    .eq('id', disputeId)
    .single();

  if (disputeError || !dispute) {
    return new Response(
      JSON.stringify({ error: "Dispute not found" }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Check access permissions
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  const isAdmin = userProfile?.role === 'admin';
  const isInvolved = dispute.complainant_id === userId || dispute.respondent_id === userId;

  if (!isAdmin && !isInvolved) {
    return new Response(
      JSON.stringify({ error: "Unauthorized to view this dispute" }),
      {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Get messages
  const { data: messages, error: messagesError } = await supabase
    .from('dispute_messages')
    .select(`
      *,
      sender:profiles(*)
    `)
    .eq('dispute_id', disputeId)
    .order('created_at', { ascending: true });

  if (messagesError) {
    return new Response(
      JSON.stringify({ error: "Failed to fetch messages", details: messagesError.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  return new Response(
    JSON.stringify({
      status: 'success',
      dispute: dispute,
      messages: messages || []
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

async function executeAdminAction(dispute: any, action: string) {
  try {
    switch (action) {
      case 'refund':
        // Update booking payment status to refunded
        await supabase
          .from('bookings')
          .update({ payment_status: 'refunded' })
          .eq('id', dispute.booking_id);
        break;
      
      case 'warning':
        // Could implement a warnings system here
        console.log(`Warning issued for dispute ${dispute.id}`);
        break;
      
      case 'ban':
        // Could implement user suspension/banning here
        console.log(`Ban action for dispute ${dispute.id}`);
        break;
      
      default:
        break;
    }
  } catch (error) {
    console.error('Error executing admin action:', error);
  }
}

async function notifyDisputeCreated(dispute: any) {
  // Implementation for notifying parties about new dispute
  console.log(`Dispute created: ${dispute.id}`);
}

async function notifyDisputeResolved(dispute: any) {
  // Implementation for notifying parties about dispute resolution
  console.log(`Dispute resolved: ${dispute.id}`);
}