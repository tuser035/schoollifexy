import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 국적 코드에 따른 언어 매핑
const nationalityToLanguage: Record<string, { name: string; nativeName: string }> = {
  'ru': { name: 'Russian', nativeName: '러시아어' },
  'vi': { name: 'Vietnamese', nativeName: '베트남어' },
  'zh': { name: 'Chinese', nativeName: '중국어' },
  'ja': { name: 'Japanese', nativeName: '일본어' },
  'en': { name: 'English', nativeName: '영어' },
  'th': { name: 'Thai', nativeName: '태국어' },
  'mn': { name: 'Mongolian', nativeName: '몽골어' },
  'uz': { name: 'Uzbek', nativeName: '우즈베크어' },
  'ph': { name: 'Filipino', nativeName: '필리핀어' },
  'id': { name: 'Indonesian', nativeName: '인도네시아어' },
  'np': { name: 'Nepali', nativeName: '네팔어' },
  'bd': { name: 'Bengali', nativeName: '벵골어' },
  'pk': { name: 'Urdu', nativeName: '우르두어' },
};

interface TranslateRequest {
  content: string;
  targetLanguage: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, targetLanguage }: TranslateRequest = await req.json();

    if (!content || !targetLanguage) {
      throw new Error("content와 targetLanguage가 필요합니다");
    }

    const langInfo = nationalityToLanguage[targetLanguage];
    if (!langInfo) {
      throw new Error(`지원하지 않는 언어 코드: ${targetLanguage}`);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Translating content to ${langInfo.name} (${langInfo.nativeName})`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a professional translator specializing in school communications and parent-teacher notices.
Translate the following Korean text to ${langInfo.name}.
Keep the formatting (line breaks, paragraphs, bullet points) intact.
Only provide the translation, no explanations, notes, or additional text.
Make it natural and easy to understand for native ${langInfo.name} speakers.
Maintain a formal but friendly tone appropriate for school communications.`
          },
          {
            role: "user",
            content: content
          }
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI gateway error:`, response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add funds to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const translatedText = data.choices?.[0]?.message?.content?.trim();

    if (!translatedText) {
      throw new Error("번역 결과가 비어있습니다");
    }

    console.log(`Successfully translated to ${langInfo.name}`);

    return new Response(
      JSON.stringify({
        success: true,
        translatedText,
        targetLanguage,
        languageName: langInfo.name,
        nativeName: langInfo.nativeName,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in translate-content function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
