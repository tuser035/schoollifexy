import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Normalize text for comparison (remove whitespace, punctuation, convert to lowercase)
function normalizeText(text: string): string {
  return text
    .replace(/[\s\n\r\t]+/g, '') // Remove all whitespace
    .replace(/[.,!?;:'"()[\]{}~·…""''—–\-_]/g, '') // Remove punctuation
    .toLowerCase()
    .trim();
}

// Calculate similarity percentage between two strings
function calculateSimilarity(original: string, transcribed: string): number {
  const normalizedOriginal = normalizeText(original);
  const normalizedTranscribed = normalizeText(transcribed);
  
  if (normalizedOriginal.length === 0) return 0;
  if (normalizedTranscribed.length === 0) return 0;
  
  // Calculate Levenshtein distance
  const len1 = normalizedOriginal.length;
  const len2 = normalizedTranscribed.length;
  
  // Use a simpler approach: count matching characters in sequence
  let matches = 0;
  let i = 0;
  let j = 0;
  
  while (i < len1 && j < len2) {
    if (normalizedOriginal[i] === normalizedTranscribed[j]) {
      matches++;
      i++;
      j++;
    } else {
      // Try to find the character nearby
      let foundInOriginal = false;
      let foundInTranscribed = false;
      
      // Look ahead in transcribed
      for (let k = j + 1; k < Math.min(j + 3, len2); k++) {
        if (normalizedOriginal[i] === normalizedTranscribed[k]) {
          j = k;
          foundInTranscribed = true;
          break;
        }
      }
      
      // Look ahead in original
      if (!foundInTranscribed) {
        for (let k = i + 1; k < Math.min(i + 3, len1); k++) {
          if (normalizedOriginal[k] === normalizedTranscribed[j]) {
            i = k;
            foundInOriginal = true;
            break;
          }
        }
      }
      
      if (!foundInOriginal && !foundInTranscribed) {
        i++;
        j++;
      }
    }
  }
  
  // Calculate percentage based on matches vs original length
  const similarity = (matches / len1) * 100;
  return Math.min(Math.round(similarity * 100) / 100, 100);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, poemContent, poemId, collectionId, studentId } = await req.json();

    if (!imageBase64 || !poemContent || !poemId || !collectionId || !studentId) {
      return new Response(
        JSON.stringify({ error: '필수 파라미터가 누락되었습니다' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
    if (!GOOGLE_API_KEY) {
      console.error('GOOGLE_AI_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'API 키가 설정되지 않았습니다' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Gemini Vision API for OCR
    console.log('Calling Gemini Vision API for OCR...');
    
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: `이 이미지는 학생이 손으로 필사한 시입니다. 이미지에서 한글 텍스트를 정확하게 추출해주세요.
                
다음 규칙을 따라주세요:
1. 손글씨로 쓴 한글 텍스트만 추출
2. 줄바꿈은 그대로 유지
3. 특수문자나 이모티콘은 무시
4. 읽을 수 없는 부분은 건너뛰기
5. 추출된 텍스트만 반환하고, 다른 설명은 하지 않기

텍스트:`
              },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: imageBase64.replace(/^data:image\/\w+;base64,/, '')
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'OCR 처리 중 오류가 발생했습니다' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiData = await geminiResponse.json();
    const extractedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    console.log('Extracted text:', extractedText.substring(0, 100) + '...');
    console.log('Original poem:', poemContent.substring(0, 100) + '...');

    // Calculate similarity
    const matchPercentage = calculateSimilarity(poemContent, extractedText);
    const isVerified = matchPercentage >= 50;

    console.log(`Match percentage: ${matchPercentage}%, Verified: ${isVerified}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Only save if verified (50% or more match)
    let savedId = null;
    let imageUrl = null;
    
    if (isVerified) {
      // Upload image to storage
      const fileName = `${studentId}/${poemId}_${Date.now()}.jpg`;
      const imageBuffer = Uint8Array.from(atob(imageBase64.replace(/^data:image\/\w+;base64,/, '')), c => c.charCodeAt(0));
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('poetry-transcriptions')
        .upload(fileName, imageBuffer, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return new Response(
          JSON.stringify({ error: '이미지 업로드 중 오류가 발생했습니다' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('poetry-transcriptions')
        .getPublicUrl(fileName);
      
      imageUrl = urlData.publicUrl;

      // Save transcription record
      const { data: savedData, error: saveError } = await supabase.rpc('student_save_poetry_transcription', {
        student_id_input: studentId,
        poem_id_input: poemId,
        collection_id_input: collectionId,
        image_url_input: imageUrl,
        match_percentage_input: matchPercentage,
        is_verified_input: isVerified
      });

      if (saveError) {
        console.error('Save error:', saveError);
        return new Response(
          JSON.stringify({ error: '기록 저장 중 오류가 발생했습니다' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      savedId = savedData;
    }

    return new Response(
      JSON.stringify({
        success: true,
        matchPercentage,
        isVerified,
        extractedText: extractedText.substring(0, 200),
        savedId,
        imageUrl,
        message: isVerified 
          ? `필사 인증 성공! (${matchPercentage.toFixed(0)}% 일치)` 
          : `필사 내용이 원본과 ${matchPercentage.toFixed(0)}%만 일치합니다. 50% 이상 일치해야 인증됩니다.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-poetry-transcription:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
