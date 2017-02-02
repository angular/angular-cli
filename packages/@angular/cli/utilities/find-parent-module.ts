import * as fs from 'fs';
import * as path from 'path';
const SilentError = require('silent-error');

export default function findParentModule(project: any, currentDir: string): string {
  const sourceRoot = path.join(project.root, project.ngConfig.apps[0].root, 'app');

  // trim currentDir
  currentDir = currentDir.replace(path.join(project.ngConfig.apps[0].root, 'app'), '');

  let pathToCheck = path.join(sourceRoot, currentDir);

  while (pathToCheck.length >= sourceRoot.length) {
    // TODO: refactor to not be based upon file name
    const files = fs.readdirSync(pathToCheck)
      .filter(fileName => !fileName.endsWith('routing.module.ts'))
      .filter(fileName => fileName.endsWith('.module.ts'))
      .filter(fileName => fs.statSync(path.join(pathToCheck, fileName)).isFile());

    if (files.length === 1) {
      return path.join(pathToCheck, files[0]);
    } else if (files.length > 1) {
      throw new SilentError(`Multiple module files found: ${pathToCheck.replace(sourceRoot, '')}`);
    }

    // move to parent directory
    pathToCheck = path.dirname(pathToCheck);
  }

  throw new SilentError('No module files found');
};
