import * as fs from 'fs';
import * as path from 'path';
const SilentError = require('silent-error');

export default function findParentModule(
  projectRoot: string, appRoot: string, currentDir: string): string {

  const sourceRoot = path.join(projectRoot, appRoot, 'app');

  // trim currentDir
  currentDir = currentDir.replace(path.join(appRoot, 'app'), '');

  let pathToCheck = path.join(sourceRoot, currentDir);

  while (pathToCheck.length >= sourceRoot.length) {
    if (!fs.existsSync(pathToCheck)) {
      pathToCheck = path.dirname(pathToCheck);
      continue;
    }
    // TODO: refactor to not be based upon file name
    const files = fs.readdirSync(pathToCheck)
      .filter(fileName => !fileName.endsWith('routing.module.ts'))
      .filter(fileName => fileName.endsWith('.module.ts'))
      .filter(fileName => fs.statSync(path.join(pathToCheck, fileName)).isFile());

    if (files.length === 1) {
      return path.join(pathToCheck, files[0]);
    } else if (files.length > 1) {
      throw new SilentError(`Multiple module files found: ${JSON.stringify(files)}`);
    }

    // move to parent directory
    pathToCheck = path.dirname(pathToCheck);
  }

  throw new SilentError('No module files found');
}
