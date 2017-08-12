#!/usr/bin/env node
'use strict';

// Provide a title to the process in `ps`
process.title = '@angular/cli';

const CliConfig = require('../models/config').CliConfig;
const Version = require('../upgrade/version').Version;

const fs = require('fs');
const findUp = require('../utilities/find-up').findUp;
const packageJson = require('../package.json');
const path = require('path');
const resolve = require('resolve');
const stripIndents = require('common-tags').stripIndents;
const yellow = require('chalk').yellow;
const SemVer = require('semver').SemVer;
const events = require('events');


function _fromPackageJson(cwd) {
  cwd = cwd || process.cwd();

  do {
    const packageJsonPath = path.join(cwd, 'node_modules/@angular/cli/package.json');
    if (fs.existsSync(packageJsonPath)) {
      const content = fs.readFileSync(packageJsonPath, 'utf-8');
      if (content) {
        const json = JSON.parse(content);
        if (json['version']) {
          return new SemVer(json['version']);
        }
      }
    }

    // Check the parent.
    cwd = path.dirname(cwd);
  } while (cwd != path.dirname(cwd));

  return null;
}


// Check if we need to profile this CLI run.
let profiler = null;
if (process.env['NG_CLI_PROFILING']) {
  profiler = require('v8-profiler');
  profiler.startProfiling();
  function exitHandler(options, err) {
    if (options.cleanup) {
      const cpuProfile = profiler.stopProfiling();
      fs.writeFileSync(path.resolve(process.cwd(), process.env.NG_CLI_PROFILING) + '.cpuprofile',
        JSON.stringify(cpuProfile));
    }

    if (options.exit) {
      process.exit();
    }
  }

  process.on('exit', exitHandler.bind(null, { cleanup: true }));
  process.on('SIGINT', exitHandler.bind(null, { exit: true }));
  process.on('uncaughtException', exitHandler.bind(null, { exit: true }));
}


// Show the warnings due to package and version deprecation.
const version = new SemVer(process.version);
if (version.compare(new SemVer('6.9.0')) < 0
    && CliConfig.fromGlobal().get('warnings.nodeDeprecation')) {
  process.stderr.write(yellow(stripIndents`
    You are running version ${version.version} of Node, which will not be supported in future
    versions of the CLI. The official Node version that will be supported is 6.9 and greater.

    To disable this warning use "ng set --global warnings.nodeDeprecation=false".
  `));
}


if (require('../package.json')['name'] == 'angular-cli'
  && CliConfig.fromGlobal().get('warnings.packageDeprecation')) {
  process.stderr.write(yellow(stripIndents`
    As a forewarning, we are moving the CLI npm package to "@angular/cli" with the next release,
    which will only support Node 6.9 and greater. This package will be officially deprecated
    shortly after.

    To disable this warning use "ng set --global warnings.packageDeprecation=false".
  `));
}

const packageJsonProjectPath = findUp('package.json', process.cwd(), true);
if (packageJsonProjectPath && fs.existsSync(packageJsonProjectPath)) {
  const packageJsonProject = require(packageJsonProjectPath);
  const deps = packageJsonProject['dependencies'] || {};
  const devDeps = packageJsonProject['devDependencies'] || {};
  const hasOldDep = !!deps['angular-cli'];
  const hasDep = !!deps['@angular/cli'];
  const hasOldDevDep = !!devDeps['angular-cli'];
  const hasDevDep = !!devDeps['@angular/cli'];

  if (hasOldDep || hasOldDevDep || !(hasDevDep || hasDep)) {
    const warnings = [
      'Unable to find "@angular/cli" in devDependencies.',
      ''
    ];

    if (hasOldDep || hasOldDevDep) {
      warnings.push(
        'The package "angular-cli" has been deprecated and renamed to "@angular/cli".',
        '');
    }

    warnings.push('Please take the following steps to avoid issues:');

    if (hasOldDep) {
      warnings.push('"npm uninstall --save angular-cli"');
    }
    if (hasOldDevDep) {
      warnings.push('"npm uninstall --save-dev angular-cli"');
    }
    if (hasDep) {
      warnings.push('"npm uninstall --save @angular/cli"')
    }
    if (!hasDevDep) {
      warnings.push('"npm install --save-dev @angular/cli@latest"');
    }
    process.stderr.write(yellow(warnings.join('\n'), '\n\n'));
  }
}

resolve('@angular/cli', { basedir: process.cwd() },
  function (error, projectLocalCli) {
    var cli;
    if (error) {
      // If there is an error, resolve could not find the ng-cli
      // library from a package.json. Instead, include it from a relative
      // path to this script file (which is likely a globally installed
      // npm package). Most common cause for hitting this is `ng new`
      cli = require('../lib/cli');
    } else {
      // Verify that package's version.
      Version.assertPostWebpackVersion();

      // This was run from a global, check local version.
      const globalVersion = new SemVer(packageJson['version']);
      let localVersion;
      let shouldWarn = false;

      try {
        localVersion = _fromPackageJson();
        shouldWarn = localVersion && globalVersion.compare(localVersion) > 0;
      } catch (e) {
        console.error(e);
        shouldWarn = true;
      }

      if (shouldWarn && CliConfig.fromGlobal().get('warnings.versionMismatch')) {
        let warning = yellow(stripIndents`
        Your global Angular CLI version (${globalVersion}) is greater than your local
        version (${localVersion}). The local Angular CLI version is used.

        To disable this warning use "ng set --global warnings.versionMismatch=false".
        `);
        // Don't show warning colorised on `ng completion`
         if (process.argv[2] !== 'completion') {
           // eslint-disable no-console
           console.log(warning);
         } else {
           // eslint-disable no-console
           console.error(warning);
           process.exit(1);
         }
      }

      // No error implies a projectLocalCli, which will load whatever
      // version of ng-cli you have installed in a local package.json
      cli = require(projectLocalCli);
    }

    if ('default' in cli) {
      cli = cli['default'];
    }

    let standardInput;
    try {
      standardInput = process.stdin;
    } catch (e) {
      delete process.stdin;
      process.stdin = new events.EventEmitter();
      standardInput = process.stdin;
    }

    cli({
      cliArgs: process.argv.slice(2),
      inputStream: standardInput,
      outputStream: process.stdout
    }).then(function (result) {
      process.exit(typeof result === 'object' ? result.exitCode : result);
    });
  });
