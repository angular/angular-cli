const localPackages = new Set([
  '@angular-devkit/build-angular',
  '@angular-devkit/build-webpack',
  '@ngtools/webpack',
]);

const peerDependenciesToTransform = ['webpack', 'webpack-dev-server', 'browser-sync'];

function readPackage(pkg, context) {
  // TODO(devversion): This allows us to make the peer dependencies of (e.g. webpack) a production dependency.
  // because `rules_js` doesn't otherwise include the dependency in the `npm_package_store`.
  // See: https://github.com/aspect-build/rules_js/issues/2226
  if (!pkg.peerDependencies || !localPackages.has(pkg.name)) {
    return pkg;
  }

  for (const key of peerDependenciesToTransform) {
    // Any package that has a peerDependency on these deps, should instead treat the peerDependency as a
    // regular dependency.
    if (!pkg.peerDependencies[key]) {
      continue;
    }

    if (!pkg.devDependencies?.[key]) {
      throw new Error(
        `${key} is listed as a peerDependency in ${pkg.name}, but it is not listed in devDependencies. This is required.`,
      );
    }

    pkg.dependencies ??= {};
    pkg.dependencies[key] = pkg.devDependencies[key];
    pkg.devDependencies[key] = undefined;
  }

  return pkg;
}

module.exports = {
  hooks: {
    readPackage,
  },
};
