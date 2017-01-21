const ContextElementDependency = require('webpack/lib/dependencies/ContextElementDependency');

export function createResolveDependenciesFromContextMap(
  contextMap: { [route: string]: string },
  originalResolveDependencies: any
) {
  return (fs: any, resource: any, recursive: any, regExp: RegExp, callback: any) => {
    const newCallback = (err: any, deps: any) => {
      if (err) {
        return callback(err);
      }

      const dependencies = Object.keys(contextMap)
        .map((key) => new ContextElementDependency(contextMap[key], key));

      callback(null, deps.concat(dependencies));
    };

    // Use original resolver and add in context map to result
    originalResolveDependencies(fs, resource, recursive, regExp, newCallback);
  };
}
