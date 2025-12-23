import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Normalize text for comparison - handles special math symbols and Korean text
function normalizeText(text: string): string {
  return text
    // Normalize math symbols to standard forms
    .replace(/[×✕✖⨉]/g, 'x')      // Multiplication signs to 'x'
    .replace(/[÷➗]/g, '/')          // Division signs to '/'
    .replace(/[−–—]/g, '-')          // Various dashes to hyphen
    // Remove all whitespace and newlines
    .replace(/[\s\n\r\t]+/g, '')
    // Remove punctuation (but keep math operators)
    .replace(/[.,!?;:'"()[\]{}~·…""''_]/g, '')
    .toLowerCase()
    .trim();
}

// Calculate Levenshtein distance between two strings
function levenshteinDistance(s1: string, s2: string): number {
  const len1 = s1.length;
  const len2 = s2.length;
  
  // Create a 2D array to store distances
  const dp: number[][] = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));
  
  // Initialize base cases
  for (let i = 0; i <= len1; i++) dp[i][0] = i;
  for (let j = 0; j <= len2; j++) dp[0][j] = j;
  
  // Fill in the rest of the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  return dp[len1][len2];
}

// Calculate similarity percentage between two strings using Levenshtein distance
function calculateSimilarity(original: string, transcribed: string): number {
  const normalizedOriginal = normalizeText(original);
  const normalizedTranscribed = normalizeText(transcribed);
  
  console.log('Normalized original length:', normalizedOriginal.length);
  console.log('Normalized transcribed length:', normalizedTranscribed.length);
  console.log('Normalized original (first 100):', normalizedOriginal.substring(0, 100));
  console.log('Normalized transcribed (first 100):', normalizedTranscribed.substring(0, 100));
  
  if (normalizedOriginal.length === 0) return 0;
  if (normalizedTranscribed.length === 0) return 0;
  
  const distance = levenshteinDistance(normalizedOriginal, normalizedTranscribed);
  const maxLen = Math.max(normalizedOriginal.length, normalizedTranscribed.length);
  
  // Calculate similarity as percentage
  const similarity = ((maxLen - distance) / maxLen) * 100;
  
  console.log('Levenshtein distance:', distance, 'Max length:', maxLen, 'Similarity:', similarity);
  
  return Math.max(0, Math.min(Math.round(similarity * 100) / 100, 100));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, poemContent, poemId, collectionId, studentId, studentName } = await req.json();

    if (!imageBase64 || !poemContent || !poemId || !collectionId || !studentId) {
      return new Response(
        JSON.stringify({ error: '필수 파라미터가 누락되었습니다' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'API 키가 설정되지 않았습니다' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Lovable AI Gateway for OCR - extract text AND verify student info
    console.log('Calling Lovable AI Gateway for OCR...');
    console.log('Student ID:', studentId, 'Student Name:', studentName);
    
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageDataUrl = `data:image/jpeg;base64,${base64Data}`;
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: `이 이미지는 학생이 손으로 필사한 시입니다. 다음 정보를 JSON 형식으로 추출해주세요:

**중요: 첫 줄 학번/이름 인식 규칙**
- 이미지의 첫 줄(맨 위쪽)에서 학번과 이름을 찾아주세요
- 학번: 1~4자리 숫자 (예: 111, 1234, 2301 등)
- 이름: 학번 오른쪽에 있는 한글 또는 영어 문자 (예: 홍길동, John)
- 첫 줄 형식 예시: "111 홍길동", "2301 김영희", "1234 Lee"

**추출 항목:**
1. 첫 줄에서 학번 찾기 (1~4자리 숫자)
2. 첫 줄에서 이름 찾기 (학번 오른쪽의 한글 또는 영어)
3. 필사된 시 내용 전체 추출 (학번/이름 제외)

다음 JSON 형식으로만 응답해주세요 (다른 설명 없이):
{
  "foundName": "첫 줄에서 찾은 이름 또는 null",
  "foundStudentId": "첫 줄에서 찾은 학번(숫자만) 또는 null",
  "transcribedText": "필사된 시 내용 (학번/이름 제외)"
}

규칙:
- 학번은 반드시 숫자만 추출 (1~4자리)
- 이름은 한글 또는 영어 문자만 추출
- 손글씨로 쓴 텍스트 추출
- 줄바꿈은 그대로 유지
- 특수문자나 이모티콘은 무시
- 읽을 수 없는 부분은 건너뛰기`
            },
            {
              type: 'image_url',
              image_url: {
                url: imageDataUrl
              }
            }
          ]
        }]
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'AI 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI 크레딧이 부족합니다.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'OCR 처리 중 오류가 발생했습니다' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || '';
    
    console.log('AI Response:', rawContent);

    // Parse the JSON response
    let ocrResult: { foundName: string | null; foundStudentId: string | null; transcribedText: string };
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        ocrResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      // Fallback: treat entire response as transcribed text
      ocrResult = {
        foundName: null,
        foundStudentId: null,
        transcribedText: rawContent
      };
    }

    const { foundName, foundStudentId, transcribedText } = ocrResult;
    const extractedText = transcribedText || '';
    
    console.log('Found name:', foundName);
    console.log('Found student ID:', foundStudentId);
    console.log('Extracted text:', extractedText.substring(0, 100) + '...');
    console.log('Original poem:', poemContent.substring(0, 100) + '...');

    // Check if student name and ID match
    const nameMatches = foundName && studentName && 
      (foundName.includes(studentName) || studentName.includes(foundName));
    const idMatches = foundStudentId && studentId && 
      (foundStudentId.includes(studentId) || studentId.includes(foundStudentId));
    
    const studentInfoVerified = nameMatches || idMatches;
    
    console.log(`Name matches: ${nameMatches}, ID matches: ${idMatches}, Student info verified: ${studentInfoVerified}`);

    // Calculate text similarity
    const matchPercentage = calculateSimilarity(poemContent, extractedText);
    
    // Verification requires: 60% text match AND student info (name or ID)
    const isVerified = matchPercentage >= 70 && studentInfoVerified;

    console.log(`Match percentage: ${matchPercentage}%, Student verified: ${studentInfoVerified}, Final verified: ${isVerified}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let savedId = null;
    let imageUrl = null;
    let pointsAwarded = 0;
    
    if (isVerified) {
      const fileName = `${studentId}/${poemId}_${Date.now()}.jpg`;
      const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      
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

      const { data: urlData } = supabase.storage
        .from('poetry-transcriptions')
        .getPublicUrl(fileName);
      
      imageUrl = urlData.publicUrl;

      // Award 10 points for verified transcription
      pointsAwarded = 10;

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

      // Update points_awarded in the saved record
      const { error: updateError } = await supabase
        .from('poetry_transcriptions')
        .update({ points_awarded: pointsAwarded })
        .eq('id', savedId);

      if (updateError) {
        console.error('Points update error:', updateError);
      }
    }

    // Build response message
    let message = '';
    if (isVerified) {
      message = `필사 인증 성공! (${matchPercentage.toFixed(0)}% 일치) 10점이 부여되었습니다.`;
    } else if (!studentInfoVerified) {
      message = `필사 이미지에서 학생 이름(${studentName})이나 학번(${studentId})을 확인할 수 없습니다. 이름과 학번을 함께 적어주세요.`;
    } else {
      message = `필사 내용이 원본과 ${matchPercentage.toFixed(0)}%만 일치합니다. 70% 이상 일치해야 인증됩니다.`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        matchPercentage,
        isVerified,
        studentInfoVerified,
        foundName,
        foundStudentId,
        extractedText: extractedText.substring(0, 200),
        savedId,
        imageUrl,
        pointsAwarded,
        message
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
