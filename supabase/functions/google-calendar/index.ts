import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface GoogleCalendarEvent {
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone: string;
  };
  colorId?: string;
}

async function getAccessToken() {
  try {
    const raw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not set");

    // Ensure the secret is a full JSON object
    let serviceAccount: any;
    try {
      serviceAccount = JSON.parse(raw);
    } catch (e) {
      console.error("Service account JSON parse failure. Starts with:", raw.slice(0, 32));
      throw new Error(
        "GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON. Please paste the entire JSON object from your service account key."
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const expiry = now + 3600;

    const header = { alg: "RS256", typ: "JWT" };
    const claimSet = {
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/calendar",
      aud: "https://oauth2.googleapis.com/token",
      exp: expiry,
      iat: now,
    };

    // base64url helper
    const b64url = (str: string) =>
      btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+/g, "");

    const encodedHeader = b64url(JSON.stringify(header));
    const encodedClaimSet = b64url(JSON.stringify(claimSet));
    const signatureInput = `${encodedHeader}.${encodedClaimSet}`;

    // Import private key
    const pemKey: string = serviceAccount.private_key;
    if (!pemKey || !pemKey.includes("BEGIN PRIVATE KEY")) {
      throw new Error("private_key missing or invalid in service account JSON");
    }

    const pemContents = pemKey
      .replace("-----BEGIN PRIVATE KEY-----", "")
      .replace("-----END PRIVATE KEY-----", "")
      .replace(/\s/g, "");

    const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryKey,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      new TextEncoder().encode(signatureInput)
    );

    const encodedSignature = b64url(String.fromCharCode(...new Uint8Array(signature)));
    const jwt = `${encodedHeader}.${encodedClaimSet}.${encodedSignature}`;

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error("Token endpoint error:", errText);
      throw new Error(`Failed to obtain access token: ${errText}`);
    }

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      console.error("Token response without access_token:", tokenData);
      throw new Error("Token response missing access_token");
    }
    return tokenData.access_token as string;
  } catch (error) {
    console.error("Error getting access token:", error);
    throw error;
  }
}

async function createCalendarEvent(accessToken: string, calendarId: string, event: GoogleCalendarEvent) {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    console.error("Calendar API error:", error);
    throw new Error(`Failed to create event: ${error}`);
  }
  
  return await response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, calendarId, event } = await req.json();
    
    console.log("Request:", { action, calendarId });
    
    const accessToken = await getAccessToken();
    
    if (action === "create") {
      const result = await createCalendarEvent(accessToken, calendarId, event);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
