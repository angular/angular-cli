// tslint:disable
// TODO: cleanup this file, it's copied as is from Angular CLI.

const resolve = require('resolve');

// Resolve dependencies within the target project.
export function resolveProjectModule(root: string, moduleName: string) {
  return resolve.sync(moduleName, { basedir: root });
}

// Require dependencies within the target project.
export function requireProjectModule(root: string, moduleName: string) {
  return require(resolveProjectModule(root, moduleName));
}
