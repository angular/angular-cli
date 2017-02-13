const resolve = require('resolve');

// require dependencies within the target project
export function requireProjectModule(root: string, moduleName: string) {
  return require(resolve.sync(moduleName, { basedir: root }));
}
