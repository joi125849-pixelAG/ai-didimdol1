import { GoogleGenAI } from '@google/genai';
import { scaffoldSchema } from '@/schemas/scaffoldSchema';
import { ScaffoldAnalysisResponse } from '@/types/scaffold';

export const geminiService = {
  async analyzeText(
    text: string,
    subjectHint?: string,
    grade?: number,
    defaultLevel?: number
  ): Promise<ScaffoldAnalysisResponse> {
    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const isDemoMode = process.env.DEMO_MODE === 'true';

    if (!apiKey && !isDemoMode) {
      throw new Error(
        'GEMINI_API_KEY가 설정되지 않았습니다. .env.local 환경변수를 확인하세요.'
      );
    }

    const systemInstruction = `
당신은 초등학생(국어, 수학, 사회, 과학)을 위한 AI 교과 디딤돌(Scaffolding) 학습 지원 전문가입니다.

[핵심 교육 원칙]
1. 최종 정답, 완성된 수학식, 완성된 글을 직접 제공하지 않습니다.
2. 학생이 현재 읽고 있는 원문이나 문제를 스스로 이해하도록 돕는 디딤돌(Scaffolding) 정보만 제공합니다.
3. 단어(word), 구절(phrase), 문장(sentence), 문단(paragraph), 전체(whole) 수준의 다양한 어려운 대상(helpTargets)을 발견하고 쉬운 설명(simpleMeaning)을 작성합니다.
4. 디딤돌 단계 데이터 구성:
   - subject: korean, math, social, science 중 가장 적절한 과목
   - level1Preview: 원문의 핵심 상황 설명(description)과 추천 시각 자료 유형(visualType, 예: '상황 그림', '개념도', '수직선', '그래프/아이콘')
   - level2Preview: 읽기 쉽게 다시 쓴 핵심 문장들(easyRewrite) 및 주요 구절 끊어 읽기(chunks)
   - level3Preview: 생각의 물꼬를 트는 확인 질문(question), 질문 유형(questionType: 'multiple_choice' | 'short_answer'), 객관식 선택지(options)
   - wholeTextHelp: 주제(topic), 맥락/상황(situation), 핵심 정보 목록(importantInformation), 대상(target)

반드시 지정된 JSON 형식에 맞춰 응답해야 합니다.
`;

    const userPrompt = `
[분석할 원문]
"${text}"

${grade ? `[학생 학년]: ${grade}학년` : ''}
${subjectHint && subjectHint !== 'auto' ? `[선택한 과목 힌트]: ${subjectHint}` : ''}
${defaultLevel ? `[기본 디딤돌 레벨]: Level ${defaultLevel}` : ''}

이 원문을 초등학생 눈높이의 디딤돌 구조 JSON으로 분석해 주세요.
`;

    const ai = new GoogleGenAI({ apiKey: apiKey || '' });

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Gemini API 응답 데이터가 비어 있습니다.');
      }

      const cleanedJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
      const rawJson = JSON.parse(cleanedJson);

      // Validate with Zod schema
      const validatedData = scaffoldSchema.parse(rawJson);
      return validatedData;
    } catch (error: any) {
      console.error('[Gemini API Service Error]:', error);
      throw new Error(`Gemini API 분석 처리 실패: ${error.message || error}`);
    }
  },
};
