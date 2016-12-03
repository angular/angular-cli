import * as fs from 'fs';
import * as path from 'path';
const SilentError = require('silent-error');

export default function findParentModule(project: any, currentDir: string): string[] {
  const root = 'app';
  const sourceRoot = path.join(project.root, project.ngConfig.apps[0].root, root);

  // trim currentDir
  currentDir = currentDir.replace(path.join(project.ngConfig.apps[0].root, root), '');

  let pathToCheck = path.join(sourceRoot, currentDir);

  while (pathToCheck.length >= sourceRoot.length) {
    // TODO: refactor to not be based upon file name
    const files = fs.readdirSync(pathToCheck)
      .filter(fileName => !fileName.endsWith('routing.module.ts'))
      .filter(fileName => fileName.endsWith('.module.ts'))
      .filter(fileName => fs.statSync(path.join(pathToCheck, fileName)).isFile());

    if (files.length > 0) {
      return files.map(file => path.join(pathToCheck, file));
    }

    // move to parent directory
    pathToCheck = path.dirname(pathToCheck);
  }

  throw new SilentError('No module files found');
};
