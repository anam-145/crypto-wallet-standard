/**
 * Executor - 도구 로컬 실행
 *
 * tools/{name}/index.js를 동적 import하여 실행합니다.
 */

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
 * 도구 동적 로드
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadTool(toolDir: string): Promise<any> {
  if (!toolInstances[toolDir]) {
    try {
      const module = await import(`../../../../tools/${toolDir}/index.js`);
      toolInstances[toolDir] = module.default;
    } catch (error) {
      throw new Error(`Failed to load tool: ${toolDir} - ${(error as Error).message}`);
    }
  }
  return toolInstances[toolDir];
}

/**
 * 도구 실행
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
 * manifest의 input.properties 키 순서 기준으로 args를 정렬
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
