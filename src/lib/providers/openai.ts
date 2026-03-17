/**
 * OpenAI Provider - Direct API Call
 */

const DEFAULT_MODEL = 'gpt-4o';
const DEFAULT_TEMPERATURE = 0.1;
const DEFAULT_MAX_TOKENS = 4096;
const API_URL = 'https://api.openai.com/v1/chat/completions';

interface ChatOptions {
  messages: unknown[];
  tools: unknown[];
  apiKey: string;
  systemPrompt?: string;
  model?: string;
}

interface ChatResult {
  finishReason: 'stop' | 'tool_calls' | 'length';
  message: string | null;
  toolCalls: { id: string; name: string; arguments: string }[] | null;
}

export async function chat({ messages, tools, apiKey, systemPrompt, model }: ChatOptions): Promise<ChatResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fullMessages: any[] = [];

  if (systemPrompt) {
    fullMessages.push({ role: 'system', content: systemPrompt });
  }

  fullMessages.push(...messages);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any = {
    model: model || DEFAULT_MODEL,
    temperature: DEFAULT_TEMPERATURE,
    max_tokens: DEFAULT_MAX_TOKENS,
    messages: fullMessages,
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(`OpenAI API ${res.status}: ${error.error?.message || res.statusText}`);
  }

  const data = await res.json();
  const choice = data.choices?.[0];

  if (!choice) {
    throw new Error('OpenAI API: No choices returned');
  }

  const msg = choice.message;

  if (msg.tool_calls && msg.tool_calls.length > 0) {
    return {
      finishReason: 'tool_calls',
      message: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toolCalls: msg.tool_calls.map((tc: any) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: tc.function.arguments,
      })),
    };
  }

  if (choice.finish_reason === 'length') {
    return {
      finishReason: 'length',
      message: (msg.content || '') + '\n\n[Response truncated due to token limit]',
      toolCalls: null,
    };
  }

  return {
    finishReason: 'stop',
    message: msg.content || '',
    toolCalls: null,
  };
}
