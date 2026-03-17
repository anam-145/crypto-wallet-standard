/**
 * Converter - Transform Manifest to OpenAI Tools format
 */

import type { Manifest } from './discovery';

export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/**
 * Convert Manifest array to OpenAI tools format
 */
export function convertToOpenAITools(manifests: Manifest[]): OpenAITool[] {
  const tools: OpenAITool[] = [];

  for (const manifest of manifests) {
    const toolDir = manifest._toolDir;
    const actions = manifest.aiTools?.actions || [];

    for (const action of actions) {
      tools.push({
        type: 'function',
        function: {
          name: `${toolDir}_${action.name}`,
          description: action.description,
          parameters: action.input || { type: 'object', properties: {} },
        },
      });
    }
  }

  return tools;
}

/**
 * Extract toolDir and action from function name
 */
export function parseFunctionName(functionName: string): { toolDir: string; action: string } {
  const lastUnderscoreIndex = functionName.lastIndexOf('_');

  if (lastUnderscoreIndex === -1) {
    throw new Error(`Invalid function name format: ${functionName}`);
  }

  return {
    toolDir: functionName.substring(0, lastUnderscoreIndex),
    action: functionName.substring(lastUnderscoreIndex + 1),
  };
}
