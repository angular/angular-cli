import * as path from 'path';
import { existsSync } from 'fs';

export function findUp(names: string | string[], from: string, stopOnPackageJson = false) {
  if (!Array.isArray(names)) {
    names = [names];
  }
  const root = path.parse(from).root;

  let currentDir = from;
  while (currentDir && currentDir !== root) {
    for (const name of names) {
      const p = path.join(currentDir, name);
      if (existsSync(p)) {
        return p;
      }
    }

    if (stopOnPackageJson) {
      const packageJsonPth = path.join(currentDir, 'package.json');
      if (existsSync(packageJsonPth)) {
        return null;
      }
    }

    currentDir = path.dirname(currentDir);
  }

  return null;
}
