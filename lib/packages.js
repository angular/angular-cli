'use strict';

const fs = require('fs');
const path = require('path');

const packageRoot = path.join(__dirname, '../packages');

// All the supported packages. Go through the packages directory and create a map of
// name => fullPath.
const packages = fs.readdirSync(packageRoot)
  .map(pkgName => ({ name: pkgName, root: path.join(packageRoot, pkgName) }))
  .filter(pkg => fs.statSync(pkg.root).isDirectory())
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