import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookTitle, bookAuthor, content, studentName } = await req.json();

    if (!bookTitle || !content) {
      return new Response(
        JSON.stringify({ error: '책 제목과 독후감 내용이 필요합니다.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      // API 키가 없으면 검증 통과 처리 (포인트 지급)
      return new Response(
        JSON.stringify({ 
          isValid: true, 
          score: 100,
          reason: 'AI 검증 서비스가 비활성화되어 있습니다.',
          shouldAwardPoints: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `당신은 학생들의 독후감을 검증하는 전문 교사입니다. 
학생이 제출한 독후감이 해당 책과 관련된 진정성 있는 내용인지 분석해야 합니다.

검증 기준:
1. 책 제목/저자와의 관련성 (책의 내용, 주제, 등장인물 등이 언급되는지)
2. 의미 있는 독후 소감 (느낀점, 배운점, 인상깊은 장면 등)
3. 무의미한 텍스트 감지 (반복 문자, 의미없는 나열, 무관한 내용)

반드시 다음 JSON 형식으로만 응답하세요:
{
  "score": 0-100 사이의 정수 (책 관련성 점수),
  "isValid": true 또는 false (70점 이상이면 true),
  "reason": "판단 이유를 한국어로 간략하게 설명"
}`;

    const userPrompt = `다음 독후감을 검증해주세요:

📚 책 제목: ${bookTitle}
${bookAuthor ? `✍️ 저자: ${bookAuthor}` : ''}
👤 학생: ${studentName || '익명'}

📝 독후감 내용:
${content}

위 독후감이 해당 책과 관련된 진정성 있는 내용인지 분석하고, JSON 형식으로 응답해주세요.`;

    console.log(`Verifying book report for "${bookTitle}" by ${studentName}`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'AI 검증 서비스가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI 서비스 크레딧이 부족합니다.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // 기타 오류시 검증 통과 처리
      return new Response(
        JSON.stringify({ 
          isValid: true, 
          score: 100,
          reason: 'AI 검증 중 오류가 발생하여 검증을 건너뛰었습니다.',
          shouldAwardPoints: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || '';
    
    console.log('AI Response:', aiResponse);

    // JSON 파싱 시도
    let result;
    try {
      // JSON 블록 추출 (```json ... ``` 형태도 처리)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('JSON not found in response');
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Response:', aiResponse);
      // 파싱 실패시 검증 통과 처리
      result = {
        score: 100,
        isValid: true,
        reason: 'AI 응답 파싱 중 오류가 발생하여 검증을 건너뛰었습니다.'
      };
    }

    const score = Number(result.score) || 0;
    const isValid = score >= 70;
    const shouldAwardPoints = isValid;

    console.log(`Verification result: score=${score}, isValid=${isValid}, shouldAwardPoints=${shouldAwardPoints}`);

    return new Response(
      JSON.stringify({
        score,
        isValid,
        reason: result.reason || (isValid ? '독후감이 책 내용과 관련성이 있습니다.' : '독후감이 책 내용과 관련성이 부족합니다.'),
        shouldAwardPoints
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-book-report function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        // 오류 시에도 검증 통과 처리 (학생 편의)
        isValid: true,
        score: 100,
        reason: '검증 중 오류가 발생하여 검증을 건너뛰었습니다.',
        shouldAwardPoints: true
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
