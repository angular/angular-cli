/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
'use strict';

const fs = require('fs');
const glob = require('glob');
const path = require('path');

const packageRoot = path.join(__dirname, '../packages');
const toolsRoot = path.join(__dirname, '../tools');
const distRoot = path.join(__dirname, '../dist');


// All the supported packages. Go through the packages directory and create a _map of
// name => fullPath.
const packages =
  [].concat(
      glob.sync(path.join(packageRoot, '*/package.json')),
      glob.sync(path.join(packageRoot, '*/*/package.json')))
    .filter(p => !p.match(/blueprints/))
    .map(pkgPath => path.relative(packageRoot, path.dirname(pkgPath)))
    .map(pkgName => {
      return { name: pkgName, root: path.join(packageRoot, pkgName) };
    })
    .reduce((packages, pkg) => {
      let pkgJson = JSON.parse(fs.readFileSync(path.join(pkg.root, 'package.json'), 'utf8'));
      let name = pkgJson['name'];
      let bin = {};
      Object.keys(pkgJson['bin'] || {}).forEach(binName => {
        bin[binName] = path.resolve(pkg.root, pkgJson['bin'][binName]);
      });

      packages[name] = {
        dist: path.join(distRoot, pkg.name),
        packageJson: path.join(pkg.root, 'package.json'),
        root: pkg.root,
        relative: path.relative(path.dirname(__dirname), pkg.root),
        main: path.resolve(pkg.root, 'src/index.ts'),
        bin: bin
      };
      return packages;
    }, {});

const tools = glob.sync(path.join(toolsRoot, '**/package.json'))
    .map(toolPath => path.relative(toolsRoot, path.dirname(toolPath)))
    .map(toolName => {
      const root = path.join(toolsRoot, toolName);
      const pkgJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
      const name = pkgJson['name'];
      const dist = path.join(distRoot, toolName);

      return {
        name,
        main: path.join(dist, pkgJson['main']),
        mainTs: path.join(toolsRoot, toolName, pkgJson['main'].replace(/\.js$/, '.ts')),
        root,
        packageJson: path.join(toolsRoot, toolName, 'package.json'),
        dist
      };
    })
    .reduce((tools, tool) => {
      tools[tool.name] = tool;
      return tools;
    }, {});


module.exports = { packages, tools };
