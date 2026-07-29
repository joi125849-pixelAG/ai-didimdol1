import { GoogleGenAI } from '@google/genai';
import { scaffoldSchema } from '@/schemas/scaffoldSchema';
import { ScaffoldAnalysisResponse } from '@/types/scaffold';

const responseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'subject',
    'originalText',
    'summary',
    'helpTargets',
    'level1Preview',
    'level2Preview',
    'level3Preview',
    'wholeTextHelp',
  ],
  properties: {
    subject: { type: 'string', enum: ['korean', 'math', 'social', 'science'] },
    originalText: { type: 'string' },
    summary: { type: 'string' },
    helpTargets: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'scope', 'text', 'simpleMeaning'],
        properties: {
          id: { type: 'string' },
          scope: { type: 'string', enum: ['word', 'phrase', 'sentence', 'paragraph', 'whole'] },
          text: { type: 'string' },
          simpleMeaning: { type: 'string' },
        },
      },
    },
    level1Preview: {
      type: 'object',
      additionalProperties: false,
      required: [
        'description',
        'visualType',
        'entities',
        'connections',
        'keyFacts',
        'checkQuestion',
      ],
      properties: {
        description: { type: 'string' },
        visualType: {
          type: 'string',
          enum: [
            'quantity',
            'sequence',
            'causeEffect',
            'inputProcessOutput',
            'comparison',
            'spatial',
            'conceptMap',
          ],
        },
        entities: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['label', 'role', 'iconHint'],
            properties: {
              label: { type: 'string' },
              role: { type: 'string' },
              iconHint: { type: 'string' },
              quantity: { type: 'number' },
            },
          },
        },
        connections: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['from', 'to', 'label', 'direction'],
            properties: {
              from: { type: 'string' },
              to: { type: 'string' },
              label: { type: 'string' },
              direction: { type: 'string' },
            },
          },
        },
        keyFacts: { type: 'array', items: { type: 'string' } },
        checkQuestion: { type: 'string' },
      },
    },
    level2Preview: {
      type: 'object',
      additionalProperties: false,
      required: ['easyRewrite', 'chunks'],
      properties: {
        easyRewrite: { type: 'array', items: { type: 'string' } },
        chunks: { type: 'array', items: { type: 'string' } },
      },
    },
    level3Preview: {
      type: 'object',
      additionalProperties: false,
      required: ['question', 'questionType'],
      properties: {
        question: { type: 'string' },
        questionType: { type: 'string', enum: ['multiple_choice', 'short_answer'] },
        options: { type: 'array', items: { type: 'string' } },
      },
    },
    wholeTextHelp: {
      type: 'object',
      additionalProperties: false,
      required: ['topic', 'situation', 'importantInformation', 'target'],
      properties: {
        topic: { type: 'string' },
        situation: { type: 'string' },
        importantInformation: { type: 'array', items: { type: 'string' } },
        target: { type: 'string' },
      },
    },
  },
} as const;

export const geminiService = {
  async analyzeText(
    text: string,
    subjectHint?: string,
    grade?: number,
    defaultLevel?: number,
    image?: { data: string; mimeType: string }
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
   - 원문에 초등학생이 어려워할 낱말이 있으면 scope가 word인 helpTargets를 1~3개만 만들고 쉬운 말로 설명합니다.
   - 어려운 낱말이 없으면 scope가 word인 항목을 억지로 만들지 않습니다.
4. 디딤돌 단계 데이터 구성:
   - subject: korean, math, social, science 중 가장 적절한 과목
   - level1Preview: 원문을 실제 관계로 이해하도록 돕는 구조화된 시각 자료
     · description: 원문의 핵심 상황 설명
     · visualType: quantity, sequence, causeEffect, inputProcessOutput, comparison, spatial, conceptMap 중 하나
     · entities: 원문에 실제로 등장하는 대상, 개념, 물질, 장소, 사건만 포함
     · 각 entity의 role에는 입력, 과정, 결과, 원인, 변화, 위치, 비교 대상 등 시각적 역할을 구체적으로 쓰고, iconHint에는 대상에 맞는 간단한 이모지 1개를 사용
     · entities의 label에는 학년 표현(예: 초등학교 5학년, 5학년), 과목명(국어, 수학, 사회, 과학), 시각화 형식 이름(개념도, 다이어그램, 시각화, 그림, 이미지)을 절대 넣지 않음
     · connections: entities 사이에 원문이 말하는 실제 관계를 from, to, label, direction으로 표현
     · connection의 from과 to는 entities에 있는 label을 글자까지 정확히 그대로 사용
     · 관계 label은 '흡수한다', '필요하다', '만든다', '배출한다', '나누어 준다', '이동한다', '원인이 된다', '비교한다', '포함한다'처럼 구체적인 동작이나 관계로 작성
     · keyFacts: 원문 이해에 꼭 필요한 정보만 간결하게 작성
     · checkQuestion: 원문 내용을 직접 확인하는 질문 1개. '가장 먼저 눈에 들어오는 정보는 무엇인가요?' 같은 범용 질문은 금지
     · entities, connections, keyFacts에 넣을 데이터가 없으면 반드시 빈 배열 []을 반환하고 null은 사용하지 않음
   - level2Preview: 읽기 쉽게 다시 쓴 핵심 문장들(easyRewrite) 및 주요 구절 끊어 읽기(chunks)
   - level3Preview: 생각의 물꼬를 트는 확인 질문(question), 질문 유형(questionType: 'multiple_choice' | 'short_answer'), 객관식 선택지(options)
   - wholeTextHelp: 주제(topic), 맥락/상황(situation), 핵심 정보 목록(importantInformation), 대상(target)

5. 어떤 단계에서도 최종 정답, 완성된 계산식, 완성된 글을 생성하지 않습니다.
6. JSON의 배열 필드는 데이터가 없으면 []을 반환하며 null은 사용하지 않습니다.

반드시 지정된 JSON 형식에 맞춰 응답해야 합니다.
`;

    const userPrompt = `
[분석할 원문]
"${text}"

${grade ? `[학생 학년]: ${grade}학년` : ''}
${subjectHint && subjectHint !== 'auto' ? `[선택한 과목 힌트]: ${subjectHint}` : ''}
${defaultLevel ? `[기본 디딤돌 레벨]: Level ${defaultLevel}` : ''}

이 원문을 초등학생 눈높이의 디딤돌 구조 JSON으로 분석해 주세요.
상태나 결과를 나타내는 표현은 원문 의미를 유지하면서 자연스러운 명사형으로 정리하세요
(예: '경사가 급함', '발달함'). 원문에 없는 사실은 만들지 마세요.
${image ? `
[사진 분석 규칙]
- 사진에서 가장 중심적인 한 문제 또는 지문만 읽어 분석합니다.
- 글자가 불명확하면 내용을 지어내지 않습니다.
- 사진 속 원문을 originalText에 정확히 옮기고, 읽기 어려우면 빈 문자열로 반환합니다.
- 최종 정답이나 완성된 계산식을 직접 제공하지 않습니다.
` : ''}
`;

    const ai = new GoogleGenAI({ apiKey: apiKey || '' });

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: image
          ? [{
              role: 'user',
              parts: [
                { inlineData: { mimeType: image.mimeType, data: image.data } },
                { text: userPrompt },
              ],
            }]
          : userPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseJsonSchema,
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
