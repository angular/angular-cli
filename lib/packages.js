'use strict';

const fs = require('fs');
const glob = require('glob');
const path = require('path');

const packageRoot = path.join(__dirname, '../packages');

// All the supported packages. Go through the packages directory and create a map of
// name => fullPath.
const packages =
  glob.sync(path.join(packageRoot, '**/package.json'))
    .filter(p => !p.match(/blueprints/))
    .map(pkgPath => path.relative(packageRoot, path.dirname(pkgPath)))
    .map(pkgName => {
      return { name: pkgName, root: path.join(packageRoot, pkgName) };
    })
    .reduce((packages, pkg) => {
      let pkgJson = JSON.parse(fs.readFileSync(path.join(pkg.root, 'package.json'), 'utf8'));
      let name = pkgJson['name'];

      packages[name] = {
        dist: path.join(__dirname, '../dist', pkg.name),
        packageJson: path.join(pkg.root, 'package.json'),
        root: pkg.root,
        relative: path.relative(path.dirname(__dirname), pkg.root),
        main: path.resolve(pkg.root, 'src/index.ts')
      };
      return packages;
    }, {});


module.exports = packages;


// If we run this from the command line, just output the list of modules neatly formatted.
if (require.main === module) {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(packages, null, 2));
}
