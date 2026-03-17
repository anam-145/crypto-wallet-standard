import { NextRequest, NextResponse } from 'next/server';
import { agent } from '@/lib/agent/singleton';

export async function POST(req: NextRequest) {
  try {
    const { message, modules } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 },
      );
    }

    const result = await agent.chat(message, modules || []);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
