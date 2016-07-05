#!/usr/bin/env node
'use strict';

const fs = require('fs');
const npm = require('npm');
const path = require('path');

const packageJson = require(path.join(__dirname, '../../package.json'));

npm.load(packageJson, function(err) {
  if (err) {
    throw err;
  }

  npm.shrinkwrap(function(err) {
    if (err) {
      throw err;
    }

    const shrinkwrapPath = path.join(__dirname, '../../npm-shrinkwrap.json');
    const shrinkwrapJson = require(shrinkwrapPath);

    /**
     * Recursively remove the `resolved` and `_resolved` fields of packages.
     */
    function cleanDependency(dep) {
      if (dep.resolved) {
        delete dep.resolved;
      }
      if (dep._resolved) {
        delete dep._resolved;
      }

      if (dep.dependencies) {
        Object.keys(dep.dependencies).forEach(function (key) {
          cleanDependency(dep.dependencies[key])
        });
      }
    }
    cleanDependency(shrinkwrapJson);


    fs.writeFileSync(shrinkwrapPath, JSON.stringify(shrinkwrapJson, null, 2), 'utf-8');
  });
});
