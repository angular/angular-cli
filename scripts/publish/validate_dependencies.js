#!/usr/bin/env node
'use strict';

/* eslint-disable no-console */
const chalk = require('chalk');
const fs = require('fs');
const glob = require('glob');
const packages = require('../../lib/packages');
const path = require('path');


const IMPORT_RE = /(^|\n)\s*import\b(?:.|\n)*?\'[^\']*\'/g;
const REQUIRE_RE = /\brequire\('[^)]+?'\)/g;
const NODE_PACKAGES = [
  'child_process',
  'fs',
  'https',
  'os',
  'path',
  'process',
  'url',
  'vm',
  'zlib'
];
const ANGULAR_PACKAGES = [
  '@angular/compiler',
  '@angular/compiler-cli',
  '@angular/core'
];


function listImportedModules(source) {
  const imports = source.match(IMPORT_RE);

  return (imports || [])
    .map(match => {
      const m = match.match(/'(.*)'/);
      return m && m[1];
    })
    .filter(x => !!x)
    .filter(modulePath => modulePath[0] != '.')
    .map(fullImportPath => {
      if (fullImportPath[0] == '@') {
        // Need to get the scope as well.
        return fullImportPath.split('/').slice(0, 2).join('/');
      } else {
        return fullImportPath.split('/')[0];
      }
    });
}

function listRequiredModules(source) {
  const requires = source.match(REQUIRE_RE);

  return (requires || [])
    .map(match => {
      const m = match.match(/'([^']*)'/);
      return m && m[1];
    })
    .filter(x => !!x)
    .filter(modulePath => modulePath[0] != '.')
    .map(fullImportPath => {
      if (fullImportPath[0] == '@') {
        // Need to get the scope as well.
        return fullImportPath.split('/').slice(0, 2).join('/');
      } else {
        return fullImportPath.split('/')[0];
      }
    });
}


let exitCode = 0;
for (const packageName of Object.keys(packages)) {
  console.log(chalk.green(`Reading dependencies of "${packageName}".`));

  const allSources = glob.sync(path.join(__dirname, '../../packages/', packageName, '**/*'))
    .filter(p => p.match(/\.(js|ts)$/))
    .filter(p => !p.match(/\.spec\./))
    .filter(p => !p.match(/\/blueprints\//));

  const importMap = {};
  allSources.forEach(function(filePath) {
    const source = fs.readFileSync(filePath, 'utf8');

    listImportedModules(source)
      .forEach(modulePath => importMap[modulePath] = true);
    listRequiredModules(source)
      .forEach(modulePath => importMap[modulePath] = true);
  });

  const dependencies = Object.keys(importMap)
    // Filter out the node packages that should not be depended on.
    .filter(x => NODE_PACKAGES.indexOf(x) == -1);

  console.log(chalk.green(`  found ${dependencies.length} dependencies...`));
  const packageJson = JSON.parse(fs.readFileSync(packages[packageName].packageJson, 'utf8'));
  const allDeps = []
    .concat(Object.keys(packageJson['dependencies'] || {}))
    .concat(Object.keys(packageJson['devDependencies'] || {}))
    .concat(Object.keys(packageJson['peerDependencies'] || {}));

  const missingDeps = dependencies.filter(d => allDeps.indexOf(d) == -1);
  if (missingDeps.length == 0) {
    console.log(chalk.green('  no dependency missing from package.json.'));
  } else {
    console.log(chalk.yellow(`  ${missingDeps.length} missing from package.json:`));
    missingDeps.forEach(md => console.log(`    ${md}`));
    exitCode = 1;
  }

  const overDeps = allDeps.filter(d => dependencies.indexOf(d) == -1)
    .filter(x => ANGULAR_PACKAGES.indexOf(x) == -1);
  if (overDeps.length == 0) {
    console.log(chalk.green('  no excessive dependencies in package.json.'));
  } else {
    console.log(chalk.yellow(`  ${overDeps.length} excessive dependencies in package.json:`));
    overDeps.forEach(md => console.log(`    ${md}`));
    exitCode = 1;
  }

  console.log('');
}

process.exit(exitCode);
