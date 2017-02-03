import * as path from 'path';

// require dependencies within the target project
export function requireDependency(root: string, moduleName: string) {
  const packageJson = require(path.join(root, 'node_modules', moduleName, 'package.json'));
  const main = path.normalize(packageJson.main);
  return require(path.join(root, 'node_modules', moduleName, main));
}
