/**
 * Executor - Local tool execution
 *
 * Loads tool instances from the static registry and executes actions.
 */

import { parseFunctionName } from './converter';
import { discoverTools } from './discovery';
import { getToolInstance } from './tool-registry';

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  responseTime: number;
  tool: string;
  action: string;
}

/**
 * Execute a tool action
 */
export async function executeTool(functionName: string, args: Record<string, unknown>): Promise<ToolResult> {
  const startTime = Date.now();
  const { toolDir, action } = parseFunctionName(functionName);

  try {
    const tool = getToolInstance(toolDir);

    if (typeof tool[action] !== 'function') {
      throw new Error(`Action not found: ${action} in ${toolDir}`);
    }

    const argValues = getOrderedArgs(toolDir, action, args);
    const result = await tool[action](...argValues);
    const responseTime = Date.now() - startTime;

    return { success: true, data: result, responseTime, tool: toolDir, action };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`[Executor] FAIL ${toolDir}.${action}:`, (error as Error).message);
    return { success: false, error: (error as Error).message, responseTime, tool: toolDir, action };
  }
}

/**
 * Order args by manifest input.properties key order
 */
function getOrderedArgs(toolDir: string, actionName: string, args: Record<string, unknown>): unknown[] {
  if (!args || Object.keys(args).length === 0) return [];

  const manifests = discoverTools();
  const manifest = manifests.find(m => m._toolDir === toolDir);

  if (manifest) {
    const action = manifest.aiTools?.actions?.find(a => a.name === actionName);
    if (action?.input?.properties) {
      const paramOrder = Object.keys(action.input.properties);
      return paramOrder
        .filter(key => key in args)
        .map(key => args[key]);
    }
  }

  return Object.values(args);
}

/**
 * Check if a tool action is high risk
 */
export function isHighRisk(functionName: string): boolean {
  const { toolDir, action } = parseFunctionName(functionName);
  const manifests = discoverTools();
  const manifest = manifests.find(m => m._toolDir === toolDir);
  const actionDef = manifest?.aiTools?.actions?.find(a => a.name === action);
  return actionDef?.riskLevel === 'high';
}
