/**
 * Static tool registry
 *
 * Imports tool modules at build time so the bundler resolves all dependencies.
 * Manifest-driven discovery still works — this only replaces the dynamic loading.
 */

import ethereumWallet from '@tools/ethereum-wallet/index';
import baseWallet from '@tools/base-wallet/index';
import swap from '@tools/swap/index';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const registry: Record<string, any> = {
  'ethereum-wallet': ethereumWallet,
  'base-wallet': baseWallet,
  'swap': swap,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getToolInstance(toolDir: string): any {
  const instance = registry[toolDir];
  if (!instance) {
    throw new Error(`Tool not found in registry: ${toolDir}`);
  }
  return instance;
}
