/**
 * Singleton Agent instance for API routes
 */

import { Agent } from './index';

const globalForAgent = globalThis as unknown as { agent: Agent };

export const agent = globalForAgent.agent || new Agent({
  chatUrl: process.env.CHAT_URL || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
});

globalForAgent.agent = agent;
