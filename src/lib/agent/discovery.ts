/**
 * Discovery - 도구 자동 발견
 *
 * tools/ 폴더를 스캔하여 manifest.json 파일들을 로드합니다.
 */

import fs from 'fs';
import path from 'path';

const TOOLS_DIR = path.join(process.cwd(), 'tools');

export interface ManifestAction {
  name: string;
  description: string;
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

/**
 * tools 폴더의 모든 manifest.json을 스캔
 */
export function discoverTools(): Manifest[] {
  const manifests: Manifest[] = [];

  if (!fs.existsSync(TOOLS_DIR)) {
    console.warn(`[Discovery] tools 폴더가 없습니다: ${TOOLS_DIR}`);
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
        console.error(`[Discovery] manifest 파싱 실패: ${manifestPath}`, (error as Error).message);
      }
    }
  }

  return manifests;
}
