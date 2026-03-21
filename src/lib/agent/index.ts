/**
 * AI Agent - Main module
 *
 * Tool discovery → Backend API call → Local tool execution loop
 */

import fs from 'fs';
import path from 'path';
import { discoverTools } from './discovery';
import { convertToOpenAITools } from './converter';
import { executeTool, isHighRisk } from './executor';
import { getProvider } from '../providers';
import { DEFAULT_SYSTEM_PROMPT } from './system-prompt';

const LOGS_DIR = path.join(process.cwd(), 'logs');

class FileLogger {
  private lines: string[] = [];

  log(text: string) {
    this.lines.push(text);
  }

  json(label: string, obj: unknown) {
    this.lines.push(`\n${'='.repeat(60)}`);
    this.lines.push(label);
    this.lines.push('='.repeat(60));
    this.lines.push(JSON.stringify(obj, null, 2));
  }

  save() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
      const filePath = path.join(LOGS_DIR, `${timestamp}.log`);
      fs.writeFileSync(filePath, this.lines.join('\n'), 'utf-8');
      console.log(`[Agent] Log saved: logs/${path.basename(filePath)}`);
    } catch {
      // Read-only filesystem (e.g. Vercel) — skip file logging
      console.log(`[Agent] Log: ${this.lines.length} lines (file save skipped)`);
    }
  }
}

const MAX_ITERATIONS = 20;

// TODO: Replace with dynamic value when auth system is integrated
const USER_UNIQUE_VALUE = 'user_001';

interface ToolUsed {
  name: string;
  success: boolean;
  responseTime: number;
}

interface ChatResult {
  message: string;
  toolsUsed: ToolUsed[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  history: any[];
  needsConfirmation?: boolean;
  pendingToolCall?: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

interface AgentOptions {
  chatUrl?: string;
  openaiApiKey?: string;
}

interface CustomAIConfig {
  provider: string;
  apiKey: string;
  systemPrompt: string;
}

export class Agent {
  private defaultChatUrl: string;
  private defaultApiKey: string;
  chatUrl: string;
  mode: 'default' | 'custom-url' | 'custom-ai';
  private customAI: CustomAIConfig | null;

  constructor(options: AgentOptions = {}) {
    this.defaultChatUrl = options.chatUrl || '';
    this.defaultApiKey = options.openaiApiKey || '';
    this.chatUrl = this.defaultChatUrl;
    this.mode = 'default';
    this.customAI = null;
  }

  setChatUrl(url: string | null) {
    this.mode = url ? 'custom-url' : 'default';
    this.customAI = null;
    this.chatUrl = url || this.defaultChatUrl;
  }

  setCustomAI({ provider, apiKey, systemPrompt }: CustomAIConfig) {
    this.mode = 'custom-ai';
    this.customAI = { provider, apiKey, systemPrompt };
  }

  getModules() {
    const manifests = discoverTools();
    return manifests.map(m => ({
      id: m._toolDir,
      name: m.name,
      description: m.aiTools?.description,
      actionCount: m.aiTools?.actions?.length || 0,
    }));
  }

  loadTools(selectedModules: string[] = []) {
    const allManifests = discoverTools();
    if (selectedModules.length === 0) return [];
    const filtered = allManifests.filter(m => selectedModules.includes(m._toolDir));
    return convertToOpenAITools(filtered);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async chat(userMessage: string, selectedModules: string[] = [], history: any[] = []): Promise<ChatResult> {
    const tools = this.loadTools(selectedModules);
    const toolsUsed: ToolUsed[] = [];
    const flog = new FileLogger();

    console.log(`[Agent] modules: [${selectedModules}] → tools: [${tools.map(t => t.function.name)}] (history: ${history.length})`);
    flog.log(`[Agent] modules: [${selectedModules}]`);
    flog.log(`[Agent] tools: [${tools.map(t => t.function.name)}]`);
    flog.log(`[Agent] history messages: ${history.length}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = [
      ...history,
      { role: 'user', content: userMessage },
    ];

    try {
      for (let i = 0; i < MAX_ITERATIONS; i++) {
        let result;

        if (this.mode === 'default' || (this.mode === 'custom-ai' && this.customAI)) {
          const apiKey = this.mode === 'default' ? this.defaultApiKey : this.customAI!.apiKey;
          const systemPrompt = this.mode === 'default' ? DEFAULT_SYSTEM_PROMPT : this.customAI!.systemPrompt;
          const providerName = this.mode === 'default' ? 'openai' : this.customAI!.provider;

          if (!apiKey) {
            throw new Error('OPENAI_API_KEY is not configured');
          }

          const provider = getProvider(providerName);
          const providerReq = {
            messages,
            tools: tools.length > 0 ? tools : [],
            apiKey,
            systemPrompt,
          };

          console.log(`[Agent] Loop ${i + 1} → ${providerName} Direct (messages: ${messages.length})`);
          flog.json(`[Agent] Loop ${i + 1} → ${providerName} REQUEST`, { ...providerReq, apiKey: '***' });

          result = await provider.chat(providerReq);

          flog.json(`[Agent] Loop ${i + 1} ← ${providerName} RESPONSE`, result);
        } else {
          // custom-url mode: proxy to external backend
          const requestBody = {
            userUniqueValue: USER_UNIQUE_VALUE,
            messages,
            tools: tools.length > 0 ? tools : [],
          };

          console.log(`[Agent] Loop ${i + 1} → Backend ${this.chatUrl} (messages: ${messages.length})`);
          flog.json(`[Agent] Loop ${i + 1} → Backend REQUEST`, requestBody);

          const res = await fetch(this.chatUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          });

          if (!res.ok) {
            throw new Error(`Backend HTTP ${res.status}: ${res.statusText}`);
          }

          const apiResponse = await res.json();

          flog.json(`[Agent] Loop ${i + 1} ← Backend RESPONSE`, apiResponse);

          if (!apiResponse.isSuccess) {
            throw new Error(`${apiResponse.code}: ${apiResponse.message}`);
          }

          result = apiResponse.result;
        }

        console.log(`[Agent] ← finishReason: ${result.finishReason}`);

        if (result.finishReason === 'stop' || result.finishReason === 'length') {
          console.log(`[Agent] Done. toolsUsed: ${toolsUsed.length}`);
          flog.log(`\n[Agent] Done. toolsUsed: ${toolsUsed.length}`);
          flog.save();

          // Include full conversation for multi-turn
          messages.push({ role: 'assistant', content: result.message });
          return { message: result.message, toolsUsed, history: messages };
        }

        if (result.finishReason === 'tool_calls' && result.toolCalls) {
          messages.push({
            role: 'assistant',
            content: null,
            tool_calls: result.toolCalls.map((tc: { id: string; name: string; arguments: string }) => ({
              id: tc.id,
              type: 'function',
              function: { name: tc.name, arguments: tc.arguments },
            })),
          });

          for (const toolCall of result.toolCalls) {
            let args: Record<string, unknown>;
            try {
              args = JSON.parse(toolCall.arguments);
            } catch {
              args = {};
              console.warn(`[Agent] Failed to parse tool arguments for ${toolCall.name}, using empty args`);
            }

            // High risk check — pause and ask user for confirmation
            if (isHighRisk(toolCall.name)) {
              console.log(`[Agent] HIGH RISK: ${toolCall.name} — awaiting confirmation`);
              flog.log(`\n[Agent] HIGH RISK: ${toolCall.name} — paused for confirmation`);
              flog.save();
              return {
                message: '',
                toolsUsed,
                history: messages,
                needsConfirmation: true,
                pendingToolCall: { name: toolCall.name, arguments: args },
              };
            }

            console.log(`[Agent] Tool Call: ${toolCall.name}(${JSON.stringify(args)})`);
            flog.log(`\n[Agent] Tool Exec: ${toolCall.name}`);
            flog.log(`  args: ${JSON.stringify(args)}`);

            const execResult = await executeTool(toolCall.name, args);

            console.log(`[Agent] Tool Result: ${execResult.success ? 'OK' : 'FAIL'} (${execResult.responseTime}ms)`);
            flog.log(`  result: ${execResult.success ? 'OK' : 'FAIL'} (${execResult.responseTime}ms)`);
            flog.log(`  data: ${JSON.stringify(execResult.success ? execResult.data : { error: execResult.error })}`);

            toolsUsed.push({
              name: toolCall.name,
              success: execResult.success,
              responseTime: execResult.responseTime,
            });

            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(
                execResult.success ? execResult.data : { error: execResult.error }
              ),
            });
          }
        }
      }

      throw new Error('Agent loop exceeded max iterations');
    } catch (error) {
      flog.log(`\n[Agent] ERROR: ${(error as Error).message}`);
      flog.save();
      throw error;
    }
  }

  /**
   * Execute a confirmed high-risk tool call and continue the agent loop
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async executeConfirmed(selectedModules: string[], history: any[], pendingToolCall: { name: string; arguments: Record<string, unknown> }): Promise<ChatResult> {
    const tools = this.loadTools(selectedModules);
    const toolsUsed: ToolUsed[] = [];
    const flog = new FileLogger();

    console.log(`[Agent] Confirmed: ${pendingToolCall.name}`);
    flog.log(`[Agent] Confirmed execution: ${pendingToolCall.name}`);

    // Execute the pending tool
    const execResult = await executeTool(pendingToolCall.name, pendingToolCall.arguments);

    console.log(`[Agent] Tool Result: ${execResult.success ? 'OK' : 'FAIL'} (${execResult.responseTime}ms)`);
    flog.log(`  result: ${execResult.success ? 'OK' : 'FAIL'} (${execResult.responseTime}ms)`);

    toolsUsed.push({
      name: pendingToolCall.name,
      success: execResult.success,
      responseTime: execResult.responseTime,
    });

    // Find the matching tool_call_id from last assistant message
    const lastAssistant = [...history].reverse().find(m => m.tool_calls);
    const toolCallId = lastAssistant?.tool_calls?.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (tc: any) => tc.function.name === pendingToolCall.name
    )?.id || 'confirmed';

    const messages = [
      ...history,
      {
        role: 'tool',
        tool_call_id: toolCallId,
        content: JSON.stringify(
          execResult.success ? execResult.data : { error: execResult.error }
        ),
      },
    ];

    // Continue the agent loop
    try {
      for (let i = 0; i < MAX_ITERATIONS; i++) {
        let result;

        if (this.mode === 'default' || (this.mode === 'custom-ai' && this.customAI)) {
          const apiKey = this.mode === 'default' ? this.defaultApiKey : this.customAI!.apiKey;
          const systemPrompt = this.mode === 'default' ? DEFAULT_SYSTEM_PROMPT : this.customAI!.systemPrompt;
          const providerName = this.mode === 'default' ? 'openai' : this.customAI!.provider;

          if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');

          const provider = getProvider(providerName);
          result = await provider.chat({
            messages,
            tools: tools.length > 0 ? tools : [],
            apiKey,
            systemPrompt,
          });
        } else {
          const res = await fetch(this.chatUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userUniqueValue: USER_UNIQUE_VALUE, messages, tools: tools.length > 0 ? tools : [] }),
          });
          if (!res.ok) throw new Error(`Backend HTTP ${res.status}: ${res.statusText}`);
          const apiResponse = await res.json();
          if (!apiResponse.isSuccess) throw new Error(`${apiResponse.code}: ${apiResponse.message}`);
          result = apiResponse.result;
        }

        if (result.finishReason === 'stop' || result.finishReason === 'length') {
          flog.save();
          messages.push({ role: 'assistant', content: result.message });
          return { message: result.message, toolsUsed, history: messages };
        }

        if (result.finishReason === 'tool_calls' && result.toolCalls) {
          messages.push({
            role: 'assistant',
            content: null,
            tool_calls: result.toolCalls.map((tc: { id: string; name: string; arguments: string }) => ({
              id: tc.id,
              type: 'function',
              function: { name: tc.name, arguments: tc.arguments },
            })),
          });

          for (const toolCall of result.toolCalls) {
            let args: Record<string, unknown>;
            try { args = JSON.parse(toolCall.arguments); } catch { args = {}; }

            if (isHighRisk(toolCall.name)) {
              flog.save();
              return {
                message: '',
                toolsUsed,
                history: messages,
                needsConfirmation: true,
                pendingToolCall: { name: toolCall.name, arguments: args },
              };
            }

            const loopResult = await executeTool(toolCall.name, args);
            toolsUsed.push({ name: toolCall.name, success: loopResult.success, responseTime: loopResult.responseTime });
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(loopResult.success ? loopResult.data : { error: loopResult.error }),
            });
          }
        }
      }
      throw new Error('Agent loop exceeded max iterations');
    } catch (error) {
      flog.save();
      throw error;
    }
  }
}
