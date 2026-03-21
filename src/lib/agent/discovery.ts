/**
 * Discovery - Auto-discover tool modules
 *
 * Scans the tools/ directory and loads manifest.json files.
 */

import fs from 'fs';
import path from 'path';

const TOOLS_DIR = path.join(process.cwd(), 'tools');

export interface ManifestAction {
  name: string;
  description: string;
  riskLevel?: 'low' | 'high';
  input?: {
    type: string;
    required?: string[];
    properties: Record<string, unknown>;
  };
  output?: Record<string, unknown>;
}

export interface Manifest {
  name: string;
  _toolDir: string;
  aiTools?: {
    enabled: boolean;
    description?: string;
    actions?: ManifestAction[];
  };
}

let cachedManifests: Manifest[] | null = null;

/**
 * Scan all manifest.json files in tools/ directory (cached)
 */
export function discoverTools(): Manifest[] {
  if (cachedManifests) return cachedManifests;

  const manifests: Manifest[] = [];

  if (!fs.existsSync(TOOLS_DIR)) {
    console.warn(`[Discovery] tools directory not found: ${TOOLS_DIR}`);
    return manifests;
  }

  const dirs = fs.readdirSync(TOOLS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const dir of dirs) {
    const manifestPath = path.join(TOOLS_DIR, dir, 'manifest.json');

    if (fs.existsSync(manifestPath)) {
      try {
        const content = fs.readFileSync(manifestPath, 'utf-8');
        const manifest = JSON.parse(content) as Manifest;

        if (manifest.aiTools?.enabled) {
          manifest._toolDir = dir;
          manifests.push(manifest);
        }
      } catch (error) {
        console.error(`[Discovery] Failed to parse manifest: ${manifestPath}`, (error as Error).message);
      }
    }
  }

  cachedManifests = manifests;
  return manifests;
}
