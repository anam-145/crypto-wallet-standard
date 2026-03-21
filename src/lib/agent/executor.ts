/**
 * Executor - Local tool execution
 *
 * Dynamically imports and executes tools/{name}/index.js.
 */

import path from 'path';
import { parseFunctionName } from './converter';
import { discoverTools } from './discovery';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toolInstances: Record<string, any> = {};

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  responseTime: number;
  tool: string;
  action: string;
}

/**
 * Dynamically load a tool module
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadTool(toolDir: string): Promise<any> {
  if (!toolInstances[toolDir]) {
    try {
      const toolPath = path.join(process.cwd(), 'tools', toolDir, 'index.js');
      const module = await import(/* webpackIgnore: true */ toolPath);
      toolInstances[toolDir] = module.default;
    } catch (error) {
      throw new Error(`Failed to load tool: ${toolDir} - ${(error as Error).message}`);
    }
  }
  return toolInstances[toolDir];
}

/**
 * Execute a tool action
 */
export async function executeTool(functionName: string, args: Record<string, unknown>): Promise<ToolResult> {
  const startTime = Date.now();
  const { toolDir, action } = parseFunctionName(functionName);

  try {
    const tool = await loadTool(toolDir);

    if (typeof tool[action] !== 'function') {
      throw new Error(`Action not found: ${action} in ${toolDir}`);
    }

    const argValues = getOrderedArgs(toolDir, action, args);
    const result = await tool[action](...argValues);
    const responseTime = Date.now() - startTime;

    return { success: true, data: result, responseTime, tool: toolDir, action };
  } catch (error) {
    const responseTime = Date.now() - startTime;
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
