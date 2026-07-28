import { NextRequest, NextResponse } from 'next/server';
import { geminiService } from '@/services/geminiService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, subject, grade, defaultLevel } = body;

    if (!text || typeof text !== 'string' || text.trim() === '') {
      return NextResponse.json(
        { error: '분석할 원문(text)을 입력해 주세요.' },
        { status: 400 }
      );
    }

    const analysisResult = await geminiService.analyzeText(
      text.trim(),
      subject,
      grade,
      defaultLevel
    );

    return NextResponse.json(analysisResult, { status: 200 });
  } catch (error: any) {
    console.error('[API /api/analyze Error]:', error);
    return NextResponse.json(
      {
        error: error.message || 'Gemini API 분석 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
