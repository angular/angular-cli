import * as fs from 'fs';
import * as path from 'path';
const SilentError = require('silent-error');

/**
 * Find the path to the first module, moving up through the directory tree from
 * currentDir.
 *
 * @export
 * @param {*} project - the project definition.
 * @param {string} currentDir - a relative path from the project root.
 * @returns {string} the relative path to the first module above currentDir from the project root.
 */
export default function findParentModule(project: any, currentDir: string): string {

  // trim currentDir
  currentDir = currentDir.replace(project.root, '');

  // normalize to project.root
  let pathToCheck = path.join(project.root, currentDir);

  function isModule(fileName: string) {
    // TODO: refactor to not be based upon file name
      return !fileName.endsWith('routing.module.ts') &&
          fileName.endsWith('.module.ts') &&
          fs.statSync(path.join(pathToCheck, fileName)).isFile();
  }

  while (pathToCheck.length >= project.root.length) {
    const files = fs.readdirSync(pathToCheck).filter(isModule);

    if (files.length === 1) {
      return path.join(pathToCheck, files[0]);
    } else if (files.length > 1) {
      throw new SilentError(`Multiple module files found:
        ${pathToCheck.replace(project.root, '')}`);
    }

    // move to parent directory
    pathToCheck = path.dirname(pathToCheck);
  }

  throw new SilentError('No module files found');
};
