import * as path from 'path';
import { existsSync } from 'fs';

export function findUp(name: string, from: string, stopOnNodeModules = false) {
  const root = path.parse(from).root;

  let currentDir = from;
  while (currentDir && currentDir !== root) {
    const p = path.join(currentDir, name);
    if (existsSync(p)) {
      return p;
    }

    if (stopOnNodeModules) {
      const nodeModuleP = path.join(currentDir, 'node_modules');
      if (existsSync(nodeModuleP)) {
        return null;
      }
    }

    currentDir = path.dirname(currentDir);
  }

  return null;
}
