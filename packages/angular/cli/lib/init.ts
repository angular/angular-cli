/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import 'symbol-observable';
// symbol polyfill must go first
// tslint:disable: no-console
// tslint:disable-next-line:ordered-imports import-groups
import { tags } from '@angular-devkit/core';
import * as fs from 'fs';
import * as path from 'path';
import { SemVer } from 'semver';
import { Duplex } from 'stream';
import { colors } from '../utilities/color';
import { isWarningEnabled } from '../utilities/config';

const packageJson = require('../package.json');

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
  let profiler: {
    startProfiling: (name?: string, recsamples?: boolean) => void;
    stopProfiling: (name?: string) => any; // tslint:disable-line:no-any
  };
  try {
    profiler = require('v8-profiler-node8'); // tslint:disable-line:no-implicit-dependencies
  } catch (err) {
    throw new Error(
      `Could not require 'v8-profiler-node8'. You must install it separetely with ` +
        `'npm install v8-profiler-node8 --no-save'.\n\nOriginal error:\n\n${err}`,
    );
  }

  profiler.startProfiling();

  const exitHandler = (options: { cleanup?: boolean; exit?: boolean }) => {
    if (options.cleanup) {
      const cpuProfile = profiler.stopProfiling();
      fs.writeFileSync(
        path.resolve(process.cwd(), process.env.NG_CLI_PROFILING || '') + '.cpuprofile',
        JSON.stringify(cpuProfile),
      );
    }

    if (options.exit) {
      process.exit();
    }
  };

  process.on('exit', () => exitHandler({ cleanup: true }));
  process.on('SIGINT', () => exitHandler({ exit: true }));
  process.on('uncaughtException', () => exitHandler({ exit: true }));
}

(async () => {
  let cli;
  try {
    const projectLocalCli = require.resolve('@angular/cli', { paths: [process.cwd()] });

    // This was run from a global, check local version.
    const globalVersion = new SemVer(packageJson['version']);
    let localVersion;
    let shouldWarn = false;

    try {
      localVersion = _fromPackageJson();
      shouldWarn = localVersion != null && globalVersion.compare(localVersion) > 0;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      shouldWarn = true;
    }

    if (shouldWarn && await isWarningEnabled('versionMismatch')) {
      const warning = colors.yellow(tags.stripIndents`
      Your global Angular CLI version (${globalVersion}) is greater than your local
      version (${localVersion}). The local Angular CLI version is used.

      To disable this warning use "ng config -g cli.warnings.versionMismatch false".
      `);
      // Don't show warning colorised on `ng completion`
      if (process.argv[2] !== 'completion') {
        // eslint-disable-next-line no-console
        console.error(warning);
      } else {
        // eslint-disable-next-line no-console
        console.error(warning);
        process.exit(1);
      }
    }

    // No error implies a projectLocalCli, which will load whatever
    // version of ng-cli you have installed in a local package.json
    cli = require(projectLocalCli);
  } catch {
    // If there is an error, resolve could not find the ng-cli
    // library from a package.json. Instead, include it from a relative
    // path to this script file (which is likely a globally installed
    // npm package). Most common cause for hitting this is `ng new`
    cli = require('./cli');
  }

  if ('default' in cli) {
    cli = cli['default'];
  }

  return cli;
})().then(cli => {
  // This is required to support 1.x local versions with a 6+ global
  let standardInput;
  try {
    standardInput = process.stdin;
  } catch (e) {
    delete process.stdin;
    process.stdin = new Duplex();
    standardInput = process.stdin;
  }

  return cli({
    cliArgs: process.argv.slice(2),
    inputStream: standardInput,
    outputStream: process.stdout,
  });
}).then((exitCode: number) => {
  process.exit(exitCode);
})
.catch((err: Error) => {
  console.error('Unknown error: ' + err.toString());
  process.exit(127);
});
