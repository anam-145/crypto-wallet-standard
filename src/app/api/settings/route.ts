import { NextRequest, NextResponse } from 'next/server';
import { agent } from '@/lib/agent/singleton';
import { getAvailableProviders } from '@/lib/providers';

export async function GET() {
  return NextResponse.json({
    mode: agent.mode,
    chatUrl: agent.chatUrl,
    availableProviders: getAvailableProviders(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode } = body;

    if (mode === 'default') {
      agent.setChatUrl(null);
    } else if (mode === 'custom-url') {
      const { chatUrl } = body;
      if (!chatUrl) {
        return NextResponse.json(
          { error: 'chatUrl is required for custom-url mode' },
          { status: 400 },
        );
      }
      agent.setChatUrl(chatUrl);
    } else if (mode === 'custom-ai') {
      const { provider, apiKey, systemPrompt } = body;
      if (!provider || !apiKey) {
        return NextResponse.json(
          { error: 'provider and apiKey are required for custom-ai mode' },
          { status: 400 },
        );
      }
      agent.setCustomAI({
        provider,
        apiKey,
        systemPrompt: systemPrompt || 'You are a helpful crypto wallet assistant.',
      });
    } else {
      return NextResponse.json(
        { error: `Invalid mode: ${mode}. Use default, custom-url, or custom-ai` },
        { status: 400 },
      );
    }

    return NextResponse.json({
      mode: agent.mode,
      chatUrl: agent.chatUrl,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
