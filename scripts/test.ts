/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-console
// tslint:disable:no-implicit-dependencies
import { logging } from '@angular-devkit/core';
import { execSync, spawnSync } from 'child_process';
import * as glob from 'glob';
import 'jasmine';
import { SpecReporter as JasmineSpecReporter } from 'jasmine-spec-reporter';
import { ParsedArgs } from 'minimist';
import { join, normalize, relative } from 'path';
import * as ts from 'typescript';
import { packages } from '../lib/packages';

const Jasmine = require('jasmine');

const knownFlakes = [
  // Rebuild tests in test-large are flakey if not run as the first suite.
  // https://github.com/angular/angular-cli/pull/15204
  'packages/angular_devkit/build_angular/test/browser/rebuild_spec_large.ts',
];

const projectBaseDir = join(__dirname, '..');
require('source-map-support').install({
  hookRequire: true,
});

function _exec(command: string, args: string[], opts: { cwd?: string }, logger: logging.Logger) {
  const { status, error, stdout } = spawnSync(command, args, {
    stdio: ['ignore', 'pipe', 'inherit'],
    ...opts,
  });

  if (status != 0) {
    logger.error(`Command failed: ${command} ${args.map(x => JSON.stringify(x)).join(', ')}`);
    throw error;
  }

  return stdout.toString('utf-8');
}

// Create a Jasmine runner and configure it.
const runner = new Jasmine({ projectBaseDir: projectBaseDir });

if (process.argv.indexOf('--spec-reporter') != -1) {
  runner.env.clearReporters();
  runner.env.addReporter(
    new JasmineSpecReporter({
      stacktrace: {
        // Filter all JavaScript files that appear after a TypeScript file (callers) from the stack
        // trace.
        filter: (x: string) => {
          return x.substr(0, x.indexOf('\n', x.indexOf('\n', x.lastIndexOf('.ts:')) + 1));
        },
      },
      spec: {
        displayDuration: true,
      },
      suite: {
        displayNumber: true,
      },
      summary: {
        displayStacktrace: true,
        displayErrorMessages: true,
        displayDuration: true,
      },
    }),
  );
}

// Manually set exit code (needed with custom reporters)
runner.onComplete((success: boolean) => {
  process.exitCode = success ? 0 : 1;
});

glob
  .sync('packages/**/*.spec.ts')
  .filter(p => !/\/schematics\/.*\/(other-)?files\//.test(p))
  .forEach(path => {
    console.error(`Invalid spec file name: ${path}. You're using the old convention.`);
  });

export default function(args: ParsedArgs, logger: logging.Logger) {
  const specGlob = args.large ? '*_spec_large.ts' : '*_spec.ts';
  const regex = args.glob ? args.glob : `packages/**/${specGlob}`;

  if (args['ve']) {
    // tslint:disable-next-line:no-console
    console.warn('********* VE Enabled ***********');
  } else if (args.shard !== undefined) {
    // CI is really flaky with NGCC
    // This is a working around test order and isolation issues.
    execSync('./node_modules/.bin/ivy-ngcc', { stdio: 'inherit' });
  }

  if (args.large) {
    // Default timeout for large specs is 2.5 minutes.
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 150000;
  }

  if (args.timeout && Number.parseInt(args.timeout) > 0) {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = Number.parseInt(args.timeout);
  }

  // Run the tests.
  const allTests = glob.sync(regex).map(p => relative(projectBaseDir, p));

  const tsConfigPath = join(__dirname, '../tsconfig.json');
  const tsConfig = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
  const pattern =
    '^(' +
    (tsConfig.config.exclude as string[])
      .map(
        ex =>
          '(' +
          ex
            .split(/[\/\\]/g)
            .map(f =>
              f
                .replace(/[\-\[\]{}()+?.^$|]/g, '\\$&')
                .replace(/^\*\*/g, '(.+?)?')
                .replace(/\*/g, '[^/\\\\]*'),
            )
            .join('[/\\\\]') +
          ')',
      )
      .join('|') +
    ')($|/|\\\\)';
  const excludeRe = new RegExp(pattern);
  let tests = allTests.filter(x => !excludeRe.test(x));

  if (!args.full) {
    // Find the point where this branch merged with master.
    const branch = _exec('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {}, logger).trim();
    const masterRevList = _exec('git', ['rev-list', 'master'], {}, logger)
      .trim()
      .split('\n');
    const branchRevList = _exec('git', ['rev-list', branch], {}, logger)
      .trim()
      .split('\n');
    const sha = branchRevList.find(s => masterRevList.includes(s));

    if (sha) {
      const diffFiles = [
        // Get diff between $SHA and HEAD.
        ..._exec('git', ['diff', sha, 'HEAD', '--name-only'], {}, logger)
          .trim()
          .split('\n'),
        // And add the current status to it (so it takes the non-committed changes).
        ..._exec('git', ['status', '--short', '--show-stash'], {}, logger)
          .split('\n')
          .map(x => x.slice(2).trim()),
      ]
        .map(x => normalize(x))
        .filter(x => x !== '.' && x !== ''); // Empty paths will be normalized to dot.

      const diffPackages = new Set();
      for (const pkgName of Object.keys(packages)) {
        const relativeRoot = relative(projectBaseDir, packages[pkgName].root);
        if (diffFiles.some(x => x.startsWith(relativeRoot))) {
          diffPackages.add(pkgName);
          // Add all reverse dependents too.
          packages[pkgName].reverseDependencies.forEach(d => diffPackages.add(d));
        }
      }

      // Show the packages that we will test.
      logger.info(`Found ${diffPackages.size} packages:`);
      logger.info(JSON.stringify([...diffPackages], null, 2));

      // Remove the tests from packages that haven't changed.
      tests = tests.filter(p =>
        Object.keys(packages).some(name => {
          const relativeRoot = relative(projectBaseDir, packages[name].root);

          return p.startsWith(relativeRoot) && diffPackages.has(name);
        }),
      );

      logger.info(`Found ${tests.length} spec files, out of ${allTests.length}.`);

      if (tests.length === 0) {
        logger.info('No test to run, exiting... You might want to rerun with "--full".');
        process.exit('CI' in process.env ? 1 : 0);
      }
    }
  }

  // Filter in/out flakes according to the --flakey flag.
  tests = tests.filter(test => !!args.flakey == knownFlakes.includes(test.replace(/[\/\\]/g, '/')));

  if (args.shard !== undefined) {
    // Remove tests that are not part of this shard.
    const shardId = args['shard'];
    const nbShards = args['nb-shards'] || 2;
    tests = tests.filter((name, i) => i % nbShards == shardId);
  }

  return new Promise(resolve => {
    runner.onComplete((passed: boolean) => resolve(passed ? 0 : 1));
    if (args.seed != undefined) {
      runner.seed(args.seed);
    }

    runner.execute(tests, args.filter);
  });
}
