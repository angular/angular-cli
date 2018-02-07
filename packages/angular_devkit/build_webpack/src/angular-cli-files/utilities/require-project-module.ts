// tslint:disable
// TODO: cleanup this file, it's copied as is from Angular CLI.

const resolve = require('resolve');

// require dependencies within the target project
export function requireProjectModule(root: string, moduleName: string) {
  return require(resolve.sync(moduleName, { basedir: root }));
}
