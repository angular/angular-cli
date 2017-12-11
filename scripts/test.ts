/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { logging } from '@angular-devkit/core';
import * as glob from 'glob';
import * as Istanbul from 'istanbul';
import 'jasmine';
import { SpecReporter as JasmineSpecReporter } from 'jasmine-spec-reporter';
import { ParsedArgs } from 'minimist';
import { join, relative } from 'path';
import { Position, SourceMapConsumer } from 'source-map';
import * as ts from 'typescript';
import { packages } from '../lib/packages';

const codeMap = require('../lib/istanbul-local').codeMap;
const Jasmine = require('jasmine');

const projectBaseDir = join(__dirname, '..');
require('source-map-support').install({
  hookRequire: true,
});


interface CoverageLocation {
  start: Position;
  end: Position;
}

type CoverageType = any;  // tslint:disable-line:no-any
declare const global: {
  __coverage__: CoverageType;
};


// Add the Istanbul (not Constantinople) reporter.
const istanbulCollector = new Istanbul.Collector({});
const istanbulReporter = new Istanbul.Reporter(undefined, 'coverage/');
istanbulReporter.addAll(['json', 'lcov']);


class IstanbulReporter implements jasmine.CustomReporter {
  // Update a location object from a SourceMap. Will ignore the location if the sourcemap does
  // not have a valid mapping.
  private _updateLocation(consumer: SourceMapConsumer, location: CoverageLocation) {
    const start = consumer.originalPositionFor(location.start);
    const end = consumer.originalPositionFor(location.end);

    // Filter invalid original positions.
    if (start.line !== null && start.column !== null) {
      // Filter unwanted properties.
      location.start = { line: start.line, column: start.column };
    }
    if (end.line !== null && end.column !== null) {
      location.end = { line: end.line, column: end.column };
    }
  }

  private _updateCoverageJsonSourceMap(coverageJson: CoverageType) {
    // Update the coverageJson with the SourceMap.
    for (const path of Object.keys(coverageJson)) {
      const entry = codeMap.get(path);
      if (!entry) {
        continue;
      }

      const consumer = entry.map;
      const coverage = coverageJson[path];

      // Update statement maps.
      for (const branchId of Object.keys(coverage.branchMap)) {
        const branch = coverage.branchMap[branchId];
        let line: number | null = null;
        let column = 0;
        do {
          line = consumer.originalPositionFor({ line: branch.line, column: column++ }).line;
        } while (line === null && column < 100);

        branch.line = line;

        for (const location of branch.locations) {
          this._updateLocation(consumer, location);
        }
      }

      for (const id of Object.keys(coverage.statementMap)) {
        const location = coverage.statementMap[id];
        this._updateLocation(consumer, location);
      }

      for (const id of Object.keys(coverage.fnMap)) {
        const fn = coverage.fnMap[id];
        fn.line = consumer.originalPositionFor({ line: fn.line, column: 0 }).line;
        this._updateLocation(consumer, fn.loc);
      }
    }
  }

  jasmineDone(_runDetails: jasmine.RunDetails): void {
    if (global.__coverage__) {
      this._updateCoverageJsonSourceMap(global.__coverage__);
      istanbulCollector.add(global.__coverage__);

      istanbulReporter.write(istanbulCollector, true, () => {});
    }
  }
}


// Create a Jasmine runner and configure it.
const runner = new Jasmine({ projectBaseDir: projectBaseDir });

if (process.argv.indexOf('--spec-reporter') != -1) {
  runner.env.clearReporters();
  runner.env.addReporter(new JasmineSpecReporter({
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
  }));
}


// Manually set exit code (needed with custom reporters)
runner.onComplete((success: boolean) => {
  process.exitCode = success ? 0 : 1;
});


glob.sync('packages/**/*.spec.ts')
  .filter(p => !/\/schematics\/.*\/(other-)?files\//.test(p))
  .forEach(path => {
    console.error(`Invalid spec file name: ${path}. You're using the old convention.`);
  });

export default function (args: ParsedArgs, logger: logging.Logger) {
  let regex = 'packages/**/*_spec.ts';
  if (args.glob) {
    regex = `packages/**/${args.glob}/**/*_spec.ts`;
  }

  if (args['code-coverage']) {
    runner.env.addReporter(new IstanbulReporter());
  }

  // Run the tests.
  const allTests =
    glob.sync(regex)
      .map(p => relative(projectBaseDir, p));

  const tsConfigPath = join(__dirname, '../tsconfig.json');
  const tsConfig = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
  const pattern = '^('
                  + (tsConfig.config.exclude as string[])
                    .map(ex => '('
                      + ex.split(/[\/\\]/g).map(f => f
                          .replace(/[\-\[\]{}()+?.^$|]/g, '\\$&')
                          .replace(/^\*\*/g, '(.+?)?')
                          .replace(/\*/g, '[^/\\\\]*'))
                        .join('[\/\\\\]')
                      + ')')
                    .join('|')
                  + ')($|/|\\\\)';
  const excludeRe = new RegExp(pattern);
  let tests = allTests.filter(x => !excludeRe.test(x));

  if (!args.full) {
    // Remove the tests from packages that haven't changed.
    tests = tests
      .filter(p => Object.keys(packages).some(name => {
        const relativeRoot = relative(projectBaseDir, packages[name].root);

        return p.startsWith(relativeRoot) && packages[name].dirty;
      }));

    logger.info(`Found ${tests.length} spec files, out of ${allTests.length}.`);
  }

  runner.execute(tests);
}
