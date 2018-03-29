/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// @ignoreDep v8-profiler
const isWarningEnabled = require('../utilities/config').isWarningEnabled;
const Version = require('../upgrade/version').Version;

const fs = require('fs');
const findUp = require('../utilities/find-up').findUp;
const packageJson = require('../package.json');
const path = require('path');
const resolve = require('resolve');
const stripIndents = require('common-tags').stripIndents;
const yellow = require('chalk').yellow;
const SemVer = require('semver').SemVer;
const semver = require('semver');
const events = require('events');


function _fromPackageJson(cwd?: string) {
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
if (process.env['NG_CLI_PROFILING']) {
  const profiler = require('v8-profiler');
  profiler.startProfiling();
  function exitHandler(options: any, _err: Error) {
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

resolve('@angular/cli', { basedir: process.cwd() },
  function (error: Error, projectLocalCli: string) {
    let cli;
    if (error) {
      // If there is an error, resolve could not find the ng-cli
      // library from a package.json. Instead, include it from a relative
      // path to this script file (which is likely a globally installed
      // npm package). Most common cause for hitting this is `ng new`
      cli = require('./cli');
    } else {
      // This was run from a global, check local version.
      const globalVersion = new SemVer(packageJson['version']);
      let localVersion;
      let shouldWarn = false;

      try {
        localVersion = _fromPackageJson();
        shouldWarn = localVersion && globalVersion.compare(localVersion) > 0;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        shouldWarn = true;
      }

      if (shouldWarn && isWarningEnabled('versionMismatch')) {
        let warning = yellow(stripIndents`
        Your global Angular CLI version (${globalVersion}) is greater than your local
        version (${localVersion}). The local Angular CLI version is used.

        To disable this warning use "ng set --global warnings.versionMismatch=false".
        `);
        // Don't show warning colorised on `ng completion`
        if (process.argv[2] !== 'completion') {
           // eslint-disable-next-line no-console
          console.log(warning);
        } else {
           // eslint-disable-next-line no-console
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
    }).then(function (exitCode: number) {
      process.exit(exitCode);
    }).catch(function(err: Error) {
      console.log('Unknown error: ' + err.toString());
      process.exit(127);
    });
  }
);
