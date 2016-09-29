const ContextElementDependency = require('webpack/lib/dependencies/ContextElementDependency');

export function createResolveDependenciesFromContextMap(createContextMap: Function) {
  return (fs: any, resource: any, recursive: any, regExp: RegExp, callback: any) => {
    createContextMap(fs, function(err: Error, map: any) {
      if (err) {
        return callback(err);
      }

      const dependencies = Object.keys(map)
        .map((key) => new ContextElementDependency(map[key], key));

      callback(null, dependencies);
    });
  };
}
