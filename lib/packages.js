const fs = require('fs');
const path = require('path');

const packageRoot = path.join(__dirname, '../packages');

// All the supported packages. Go through the packages directory and create a map of
// name => fullPath.
const packages = fs.readdirSync(packageRoot)
  .map(pkgName => ({ name: pkgName, root: path.join(packageRoot, pkgName) }))
  .filter(pkg => fs.statSync(pkg.root).isDirectory())
  .reduce((packages, pkg) => {
    packages[`@angular-cli/${pkg.name}`] = {
      root: pkg.root,
      main: path.resolve(pkg.root, 'src/index.ts')
    };
    return packages;
  }, {});

module.exports = packages;