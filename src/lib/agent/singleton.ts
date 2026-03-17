/**
 * Singleton Agent instance for API routes
 */

import { Agent } from './index';

const globalForAgent = globalThis as unknown as { agent: Agent };

export const agent = globalForAgent.agent || new Agent({
  chatUrl: process.env.CHAT_URL || 'http://localhost:8080/api/v1/agent/chat',
});

globalForAgent.agent = agent;
