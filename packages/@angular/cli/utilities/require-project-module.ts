const resolve = require('resolve');

// resolve dependencies within the target project
export function resolveProjectModule(root: string, moduleName: string) {
  return resolve.sync(moduleName, { basedir: root });
}

// require dependencies within the target project
export function requireProjectModule(root: string, moduleName: string) {
  return require(resolveProjectModule(root, moduleName));
}
