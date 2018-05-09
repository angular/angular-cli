
// resolve dependencies within the target project
export function resolveProjectModule(root: string, moduleName: string) {
  return require.resolve(moduleName, { paths: [root] });
}

// require dependencies within the target project
export function requireProjectModule(root: string, moduleName: string) {
  return require(resolveProjectModule(root, moduleName));
}
