/**
 * Provider Registry
 */

import * as openai from './openai';
import * as claude from './claude';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const providers: Record<string, { chat: (options: any) => Promise<any> }> = {
  openai,
  claude,
};

export function getProvider(name: string) {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Unknown provider: ${name}. Available: ${Object.keys(providers).join(', ')}`);
  }
  return provider;
}

export function getAvailableProviders(): string[] {
  return Object.keys(providers);
}
