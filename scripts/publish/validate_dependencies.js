#!/usr/bin/env node
'use strict';

/* eslint-disable no-console */
const chalk = require('chalk');
const fs = require('fs');
const glob = require('glob');
const packages = require('../../lib/packages');
const path = require('path');
const _ = require('lodash');


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

let exitCode = 0;

const depsInfo = validateDependenciesPerPackage(packages);

validateRootPackageJson(depsInfo.allSourceDeps);

checkDependenciesConflictAcrossPackages(depsInfo.allDeclaredDepsMap);

process.exit(exitCode);


// utils

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
      if (fullImportPath[0] === '@') {
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
      if (fullImportPath[0] === '@') {
        // Need to get the scope as well.
        return fullImportPath.split('/').slice(0, 2).join('/');
      } else {
        return fullImportPath.split('/')[0];
      }
    });
}

function reportMissingDependencies(missingDeps) {
  if (missingDeps.length === 0) {
    console.log(chalk.green('  no dependency missing from package.json.'));
  } else {
    console.log(chalk.yellow(`  ${missingDeps.length} missing from package.json:`));
    missingDeps.forEach(md => console.log(`    ${md}`));
    exitCode = 1;
  }
}

function reportExcessiveDependencies(overDeps) {
  if (overDeps.length === 0) {
    console.log(chalk.green('  no excessive dependencies in package.json.'));
  } else {
    console.log(chalk.yellow(`  ${overDeps.length} excessive dependencies in package.json:`));
    overDeps.forEach(md => console.log(`    ${md}`));
    exitCode = 1;
  }
}

function reportInconsistentDepsDependencies(inconsistentDeps) {
  if (inconsistentDeps.length === 0) {
    console.log(chalk.green('  no inconsistentDeps dependencies across packages.'));
  } else {
    console.log(chalk.yellow(`  ${inconsistentDeps.length} inconsistent dependencies found:`));
    inconsistentDeps.forEach(arr => console.log(`    ${arr.join(' vs ')}`));
    exitCode = 0;
  }
}

function retrieveDependencyMapFromPackageSource(packageName) {
  const allSources = glob.sync(path.join(__dirname, '../../packages/', packageName, '**/*'))
    .filter(p => p.match(/\.(js|ts)$/))
    .filter(p => !p.match(/\.spec\./))
    .filter(p => !p.match(/\/blueprints\//));

  return allSources.reduce(function (importMap, filePath) {
    const source = fs.readFileSync(filePath, 'utf8');

    listImportedModules(source)
      .forEach(modulePath => importMap[modulePath] = true);
    listRequiredModules(source)
      .forEach(modulePath => importMap[modulePath] = true);

    return importMap;
  }, {});
}

function validateDependenciesPerPackage(packages) {
  const allSourceDeps = [];
  const allDeclaredDepsMap = {};

  for (const packageName of Object.keys(packages)) {
    console.log(chalk.blue(`Reading dependencies of "${packageName}".`));

    const importMap = retrieveDependencyMapFromPackageSource(packageName)

    const dependencies = Object.keys(importMap)
      // Filter out the node packages that should not be depended on.
      .filter(x => NODE_PACKAGES.indexOf(x) == -1);
    allSourceDeps.push(...dependencies);

    console.log(chalk.green(`  found ${dependencies.length} dependencies...`));

    const packageJson = JSON.parse(fs.readFileSync(packages[packageName].packageJson, 'utf8'));

    const DeclaredDepsMap = Object.assign(
      {},
      packageJson['dependencies'] || {},
      packageJson['devDependencies'] || {},
      packageJson['peerDependencies'] || {}
    );
    allDeclaredDepsMap[packageName] = DeclaredDepsMap;
    const declaredDeps = Object.keys(DeclaredDepsMap);

    const missingDeps = dependencies.filter(d => declaredDeps.indexOf(d) === -1);
    reportMissingDependencies(missingDeps);

    const excessiveDeps = declaredDeps.filter(d => dependencies.indexOf(d) === -1)
      .filter(x => ANGULAR_PACKAGES.indexOf(x) === -1);
    reportExcessiveDependencies(excessiveDeps);
  }

  return {
    allDeclaredDepsMap,
    allSourceDeps
  };
}

function validateRootPackageJson(overallDeps) {
  console.log(chalk.blue('Validating root package. [devDependencies ignored]'));

  const rootPackagePath = path.join(__dirname, '../../package.json');
  const rootPackageJson = JSON.parse(fs.readFileSync(rootPackagePath, 'utf8'));

  // devDependencies are ignored
  const allRootDeps = []
    .concat(Object.keys(rootPackageJson['dependencies'] || {}))
    .concat(Object.keys(rootPackageJson['peerDependencies'] || {}));

  const internalPackages = Object.keys(packages);
  const missingRootDeps = overallDeps.filter(d => allRootDeps.indexOf(d) === -1)
    .filter(d => internalPackages.indexOf(d) === -1);
  reportMissingDependencies(missingRootDeps);

  const overRootDeps = allRootDeps.filter(d => overallDeps.indexOf(d) === -1)
    .filter(x => ANGULAR_PACKAGES.indexOf(x) === -1);
  reportExcessiveDependencies(overRootDeps);
}

function checkDependenciesConflictAcrossPackages(allDeclaredDepsMap) {
  console.log(chalk.blue('Validating packages\' dependencies conflict.'));

  const allDeclaredDeps = Object.keys(allDeclaredDepsMap)
    .reduce((collect, packageName) => collect.concat(Object.keys(allDeclaredDepsMap[packageName])), []);

  const inconsistentDeps = _.uniq(allDeclaredDeps).reduce(function (collect, dep) {
    const test = _(allDeclaredDepsMap)
      .map((map, name) => map[dep] ? [name, `${dep}@${map[dep]}`] : null)
      .compact()
      .uniqBy(1)
      .value();
    if (test.length > 1) {
      collect.push(test.map(pair =>`[${pair[0]}]: ${pair[1]}`));
    }

    return collect;
  }, []);

  reportInconsistentDepsDependencies(inconsistentDeps);
}
