/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Logger } from '@angular-devkit/core';
import * as glob from 'glob';
import * as Istanbul from 'istanbul';
import 'jasmine';
import { SpecReporter as JasmineSpecReporter } from 'jasmine-spec-reporter';
import { ParsedArgs } from 'minimist';
import { join, relative } from 'path';
import { Position, SourceMapConsumer, SourceMapGenerator } from 'source-map';
import { packages } from '../lib/packages';


const Jasmine = require('jasmine');
const { versions } = require('../versions.json');

const projectBaseDir = join(__dirname, '../packages');
require('source-map-support').install({
  hookRequire: true,
});


declare const global: {
  _DevKitRequireHook: Function,
  __coverage__: CoverageType;
};


interface Instrumenter extends Istanbul.Instrumenter {
  sourceMap: SourceMapGenerator;
}


interface CoverageLocation {
  start: Position;
  end: Position;
}
type CoverageType = any;  // tslint:disable-line:no-any


const inlineSourceMapRe = /\/\/# sourceMappingURL=data:application\/json;base64,(\S+)$/;


// Use the internal DevKit Hook of the require extension installed by our bootstrapping code to add
// Istanbul (not Constantinople) collection to the code.
const codeMap = new Map<string, { code: string, map: SourceMapConsumer }>();

function istanbulDevKitRequireHook(code: string, filename: string) {
  // Skip spec files.
  if (filename.match(/_spec\.ts$/)) {
    return code;
  }
  const codeFile = codeMap.get(filename);
  if (codeFile) {
    return codeFile.code;
  }

  const instrumenter = new Istanbul.Instrumenter({
    esModules: true,
    codeGenerationOptions: {
      sourceMap: filename,
      sourceMapWithCode: true,
    },
  }) as Instrumenter;
  let instrumentedCode = instrumenter.instrumentSync(code, filename);
  const match = code.match(inlineSourceMapRe);

  if (match) {
    const sourceMapGenerator: SourceMapGenerator = instrumenter.sourceMap;
    // Fix source maps for exception reporting (since the exceptions happen in the instrumented
    // code.
    const sourceMapJson = JSON.parse(Buffer.from(match[1], 'base64').toString());
    const consumer = new SourceMapConsumer(sourceMapJson);
    sourceMapGenerator.applySourceMap(consumer, filename);

    instrumentedCode = instrumentedCode.replace(inlineSourceMapRe, '')
                     + '//# sourceMappingURL=data:application/json;base64,'
                     + new Buffer(sourceMapGenerator.toString()).toString('base64');

    // Keep the consumer from the original source map, because the reports from Istanbul (not
    // Constantinople) are already mapped against the code.
    codeMap.set(filename, { code: instrumentedCode, map: consumer });
  }

  return instrumentedCode;
}


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
    }

    istanbulReporter.write(istanbulCollector, true, () => {});
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

export default function (args: ParsedArgs, logger: Logger) {
  let regex = 'packages/**/*_spec.ts';
  if (args.glob) {
    regex = `packages/**/${args.glob}/**/*_spec.ts`;
  }

  if (args['code-coverage']) {
    global._DevKitRequireHook = istanbulDevKitRequireHook;
    runner.env.addReporter(new IstanbulReporter());
  }

  // Run the tests.
  const allTests =
    glob.sync(regex)
      .map(p => relative(projectBaseDir, p));

  let tests = allTests;
  if (!args.full) {
    // Remove the tests from packages that haven't changed.
    tests = tests
      .filter(p => Object.keys(packages).some(name => {
        return p.startsWith(packages[name].root) && packages[name].hash !== versions[name];
      }));

    logger.info(`Found ${tests.length} spec files, out of ${allTests.length}.`);
  }

  runner.execute(tests);
}
