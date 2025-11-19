import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Parse webhook payload
    const payload = await req.json();
    console.log("Received Resend webhook:", JSON.stringify(payload, null, 2));

    const { type, data } = payload;

    // Handle email.opened event
    if (type === "email.opened" && data?.email_id) {
      const emailId = data.email_id;
      
      // Update email_history table
      const { data: updateData, error: updateError } = await supabase
        .from("email_history")
        .update({
          opened: true,
          opened_at: new Date().toISOString(),
        })
        .eq("resend_email_id", emailId)
        .is("opened", false); // Only update if not already marked as opened

      if (updateError) {
        console.error("Error updating email history:", updateError);
        throw updateError;
      }

      console.log(`Email ${emailId} marked as opened`);
    }

    return new Response(
      JSON.stringify({ success: true, event: type }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in resend-webhook function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
