var ContextElementDependency = require('../test/node_modules/webpack/lib/dependencies/ContextElementDependency');

export function createResolveDependenciesFromContextMap(createContextMap) {
	return function resolveDependenciesFromContextMap(fs, resource, recursive, regExp, callback) {
		createContextMap(fs, function(err, map) {
			if(err) return callback(err);
			var dependencies = Object.keys(map).map(function(key) {
        let dep = new ContextElementDependency(map[key], key);
        return dep;
			});
			callback(null, dependencies);
		});
	}
};
