import { NextRequest, NextResponse } from 'next/server';
import { geminiService } from '@/services/geminiService';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BASE64_LENGTH = Math.ceil((8 * 1024 * 1024 * 4) / 3) + 8;

export async function POST(request: NextRequest) {
  try {
    const { imageData, mimeType, subject, grade, defaultLevel } = await request.json();
    if (
      typeof imageData !== 'string' ||
      imageData.length === 0 ||
      imageData.length > MAX_BASE64_LENGTH ||
      !ALLOWED_TYPES.has(mimeType)
    ) {
      return NextResponse.json({ error: '올바른 사진을 선택해 주세요.' }, { status: 400 });
    }
    const result = await geminiService.analyzeText(
      '사진 속 중심 문제 또는 지문',
      subject,
      grade,
      defaultLevel,
      { data: imageData, mimeType },
    );
    if (!result.originalText?.trim()) {
      return NextResponse.json(
        { error: '사진 속 글자를 읽기 어려워요. 더 밝고 선명하게 찍어주세요.' },
        { status: 422 },
      );
    }
    return NextResponse.json(result);
  } catch {
    console.error('[API /api/analyze-image Error]');
    return NextResponse.json(
      { error: '사진 분석 중 문제가 생겼어요. 직접 입력을 이용해 주세요.' },
      { status: 500 },
    );
  }
}
