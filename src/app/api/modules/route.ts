import { NextResponse } from 'next/server';
import { agent } from '@/lib/agent/singleton';

export async function GET() {
  try {
    const modules = agent.getModules();
    return NextResponse.json({ modules });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
