/**
 * Claude Provider - Direct API Call
 *
 * TODO: Anthropic Messages API 연동
 * https://docs.anthropic.com/en/docs/build-with-claude/tool-use
 */

interface ChatOptions {
  messages: unknown[];
  tools: unknown[];
  apiKey: string;
  systemPrompt?: string;
  model?: string;
}

export async function chat(_options: ChatOptions): Promise<never> {
  throw new Error('Claude provider is not yet implemented');
}
