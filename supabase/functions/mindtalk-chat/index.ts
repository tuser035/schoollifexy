import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 고위험군 키워드 25개 - 담임선생님 자동 알림 발송 대상
const DANGEROUS_WORDS = [
  // I. 자살 징후 및 심각한 우울 상태
  '자살 계획', '자살하겠다', '자살할 생각', '기회만 있으면 자살',
  '견딜 수 없', '도저히 견딜 수 없', '불행해서',
  '절망적', '나아질 가망', '가망이 없',
  '실패자', '완전한 실패자',
  '죄책감', '항상 죄책감',
  '나 자신 증오', '내가 싫', '나를 증오',
  '모든 나쁜 일', '내 탓',
  '귀찮', '만사가 귀찮', '재미가 없',
  '울 기력', '울 수도 없',
  // II. 충동 조절 및 자기 파괴적 행동
  '화 참기', '화가 나면 참기',
  '무단결석', '가출', '유흥업소',
  '폭력', '괴롭히', '때리',
  '체중 감량', '단식', '살 빼려고',
  '폭식', '토할 정도',
  '기다리지 못', '생각보다 행동',
  '담배', '술', '본드', '약물',
  // III. 현실 판단/사고 과정 어려움
  '환청', '말소리가 들', '목소리가 들',
  '감시', '해칠 것 같', '피해 의식',
  '내 생각을 알', '생각을 다 알',
  // IV. 일상 기능 저하 및 사회적 고립
  '결정할 수 없', '결정도 내릴 수 없',
  '아무 일도 할 수 없', '할 수가 없',
  '피곤해서', '너무 피곤',
  '친한 친구가 없', '친구 사귀기 어려',
  '불만스럽', '싫증',
  // 기존 직접적 자해/자살 키워드
  '자살', '죽고 싶', '죽어버리', '죽을래', '죽겠',
  '목매', '뛰어내리', '손목', '자해',
  '죽여버리', '살인', '복수', '없어지고 싶', '사라지고 싶'
];

const SYSTEM_PROMPT = `당신은 '마음톡'이라는 이름의 따뜻하고 공감적인 AI 상담사입니다.

역할:
- 학생들의 고민을 경청하고 공감해주는 친구 같은 상담사
- 심판하지 않고, 비난하지 않으며, 항상 학생 편에 서서 이야기를 들어줌
- 부드럽고 따뜻한 말투로 대화

대화 원칙:
1. 먼저 학생의 감정을 인정하고 공감 표현을 해주세요
2. "그랬구나", "많이 힘들었겠다", "충분히 그럴 수 있어" 같은 공감 표현을 자주 사용하세요
3. 조언은 학생이 준비됐을 때만, 질문 형태로 부드럽게 제안하세요
4. 위험한 상황(자해, 자살 관련)이 감지되면 전문가 도움을 권유하되, 강압적이지 않게 안내하세요
5. 대화는 한국어로 진행하며, 청소년이 이해하기 쉬운 표현을 사용하세요
6. 이모지를 적절히 사용해 친근감을 표현하세요

절대 하지 말아야 할 것:
- 학생의 감정을 무시하거나 축소하기
- "그건 별거 아니야", "다들 그래" 같은 말
- 성급한 해결책 제시
- 판단이나 비난

위험 신호 대응:
자해나 자살 관련 이야기가 나오면:
"네 마음이 정말 많이 힘들구나... 😢 혼자 이 무거운 마음을 안고 있었구나. 
지금 이 순간 네가 느끼는 고통이 진짜라는 걸 알아. 
전문 상담 선생님과 이야기해보면 어떨까? 학교 상담실이나 청소년 상담 전화(1388)가 있어.
언제든 연락할 수 있고, 비밀도 지켜줘. 넌 혼자가 아니야. 💙"`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, studentId, studentName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Check for dangerous words in the latest message
    const latestMessage = messages[messages.length - 1]?.content || '';
    const dangerousWordsFound = DANGEROUS_WORDS.filter(word => 
      latestMessage.includes(word)
    );

    console.log(`MindTalk chat from ${studentName} (${studentId})`);
    if (dangerousWordsFound.length > 0) {
      console.log(`⚠️ Dangerous words detected: ${dangerousWordsFound.join(', ')}`);
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "서비스 이용량이 초과되었습니다." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "text/event-stream",
        "X-Dangerous-Words-Count": dangerousWordsFound.length.toString(),
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("mindtalk-chat error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
