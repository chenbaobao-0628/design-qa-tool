import { NextResponse } from 'next/server';
import { runDesignQA } from '@/services/design-qa';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { figmaJson, domSnapshot } = body;
    
    if (!figmaJson || !domSnapshot) {
      return NextResponse.json(
        { error: '缺少必要参数: figmaJson 和 domSnapshot' },
        { status: 400 }
      );
    }
    
    const result = runDesignQA({ figmaJson, domSnapshot });
    
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '处理失败' },
      { status: 500 }
    );
  }
}
