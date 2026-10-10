/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import fs from 'node:fs';
import path from 'node:path';
import { type BenchmarkCliOptions, runI18nBenchmarks } from './benchmarks/i18n/index.mts';
import {
  type LibraryBuilderBenchmarkOptions,
  runLibraryBuilderBenchmarks,
} from './benchmarks/library-builder/index.mts';

function checkBuildStatus(logger: Console): boolean {
  const distFile = 'dist/@angular/build/src/tools/i18n/i18n-inliner.js';
  const srcFile = 'packages/angular/build/src/tools/i18n/i18n-inliner.ts';

  if (!fs.existsSync(distFile)) {
    logger.error(
      'Error: @angular/build has not been built yet.\nPlease run "pnpm build" before benchmarking.',
    );

    return false;
  }

  if (fs.existsSync(srcFile)) {
    const srcMtime = fs.statSync(srcFile).mtimeMs;
    const distMtime = fs.statSync(distFile).mtimeMs;
    if (srcMtime > distMtime) {
      logger.warn(
        'Warning: Source files in packages/angular/build are newer than dist/.\n' +
        'Run "pnpm build" to ensure your benchmark reflects your latest local edits.\n',
      );
    }
  }

  return true;
}

function parseIntList(raw: string | undefined): number[] | undefined {
  return raw?.split(',').map((s) => Number(s.trim()));
}

async function runLibraryBuilderSubsystem(options: {
  layout?: string;
  style?: string;
  sizes?: string;
  depths?: string;
  iterations?: string | number;
  json?: boolean;
}): Promise<number> {
  if (options.layout !== undefined && options.layout !== 'flat' && options.layout !== 'deep') {
    // eslint-disable-next-line no-console
    console.error("Error: --layout must be \"flat\" or \"deep\", got \"" + options.layout + "\".");

    return 1;
  }
  if (
    options.style !== undefined &&
    !['inline', 'inline-scss', 'external'].includes(options.style)
  ) {
    // eslint-disable-next-line no-console
    console.error(
      "Error: --style must be one of \"inline\", \"inline-scss\", \"external\", got \"" + options.style + "\"."
    );

    return 1;
  }

  const sizes = parseIntList(options.sizes);
  if (sizes !== undefined && sizes.some((n) => !Number.isInteger(n) || n < 1)) {
    // eslint-disable-next-line no-console
    console.error("Error: --sizes must be a comma-separated list of positive integers, got \"" + options.sizes + "\".");

    return 1;
  }

  const depths = parseIntList(options.depths);
  if (depths !== undefined && depths.some((n) => !Number.isInteger(n) || n < 1)) {
    // eslint-disable-next-line no-console
    console.error("Error: --depths must be a comma-separated list of positive integers, got \"" + options.depths + "\".");

    return 1;
  }

  const iterations = options.iterations !== undefined ? Number(options.iterations) : undefined;
  if (iterations !== undefined && (!Number.isInteger(iterations) || iterations < 1)) {
    // eslint-disable-next-line no-console
    console.error("Error: --iterations must be a positive integer, got \"" + options.iterations + "\".");

    return 1;
  }

  const cliOptions: LibraryBuilderBenchmarkOptions = {
    layout: options.layout as LibraryBuilderBenchmarkOptions['layout'],
    style: options.style as LibraryBuilderBenchmarkOptions['style'],
    sizes,
    depths,
    iterations,
    json: Boolean(options.json),
  };

  const { exitCode } = await runLibraryBuilderBenchmarks(cliOptions);

  return exitCode;
}

export default async function (
  options: {
    _?: string[];
    scenario?: string;
    iterations?: string | number;
    warmup?: string | number;
    concurrency?: string | number;
    build?: boolean;
    json?: boolean;
    inProcess?: boolean;
    'in-process'?: boolean;
    saveBaseline?: string;
    'save-baseline'?: string;
    compareBaseline?: string;
    'compare-baseline'?: string;
    layout?: string;
    style?: string;
    sizes?: string;
    depths?: string;
    help?: boolean;
    [key: string]: unknown;
  },
  _cwd: string,
): Promise<number> {
  const positionals = options._ ?? [];
  const targetSubsystem = positionals[0] ?? 'i18n';

  if (options.help || targetSubsystem === 'help') {
    // eslint-disable-next-line no-console
    console.log(`
Angular CLI Performance Benchmark Runner

Usage:
  pnpm admin benchmark [subsystem] [options]

Subsystems:
  i18n               Run i18n inliner performance benchmarks (default)
  library-builder    Run @angular/build:library scaling benchmarks

Options (i18n):
  --scenario=<name>          Run a specific scenario (e.g. standard-app, enterprise-multilingual)
  --iterations=<n>           Number of measured iterations (default: 5)
  --warmup=<n>               Number of warmup iterations (default: 2)
  --concurrency=<n>          Override worker thread pool concurrency
  --in-process               Run all scenarios in a single process (useful for debugging)
  --build                    Automatically build packages before benchmarking
  --json                     Output results in machine-readable JSON
  --save-baseline=<file>     Save run results to a baseline JSON file
  --compare-baseline=<file>  Compare run results against an existing baseline JSON file

Options (library-builder):
  --layout=<flat|deep>       Fixture layout (default: flat)
  --style=<inline|inline-scss|external>  Component style variant (default: inline)
  --sizes=<n,n,...>          Entry-point counts to sweep, layout=flat only (default: 10,50,300,1000,2000)
  --depths=<n,n,...>         Tree depths to sweep, layout=deep only (default: 2,5,8,11)
  --iterations=<n>           Measured iterations per size (default: 2)
  --json                     Output raw measurements as JSON

  --help                     Show this help message
`);

    return 0;
  }

  if (targetSubsystem === 'library-builder') {
    return runLibraryBuilderSubsystem(options);
  }

  if (targetSubsystem !== 'i18n') {
    // eslint-disable-next-line no-console
    console.error(
      `Unknown benchmark subsystem: "${targetSubsystem}". Supported subsystems: i18n, library-builder`,
    );

    return 1;
  }

  if (options.build) {
    const buildModule = await import('./build.mts');
    await buildModule.default({ local: true });
  }

  // eslint-disable-next-line no-console
  if (!checkBuildStatus(console)) {
    return 1;
  }

  const rawSaveBaseline = options.saveBaseline ?? options['save-baseline'];
  const rawCompareBaseline = options.compareBaseline ?? options['compare-baseline'];

  const iterations = options.iterations !== undefined ? Number(options.iterations) : undefined;
  const warmup = options.warmup !== undefined ? Number(options.warmup) : undefined;
  const concurrency = options.concurrency !== undefined ? Number(options.concurrency) : undefined;

  if (iterations !== undefined && (!Number.isInteger(iterations) || iterations < 1)) {
    // eslint-disable-next-line no-console
    console.error('Error: --iterations must be a positive integer.');

    return 1;
  }

  if (warmup !== undefined && (!Number.isInteger(warmup) || warmup < 0)) {
    // eslint-disable-next-line no-console
    console.error('Error: --warmup must be a non-negative integer.');

    return 1;
  }

  if (concurrency !== undefined && (!Number.isInteger(concurrency) || concurrency < 1)) {
    // eslint-disable-next-line no-console
    console.error('Error: --concurrency must be a positive integer.');

    return 1;
  }

  const cliOptions: BenchmarkCliOptions = {
    scenario: options.scenario,
    iterations,
    warmup,
    concurrency,
    json: Boolean(options.json),
    inProcess: Boolean(options.inProcess ?? options['in-process']),
    saveBaseline: rawSaveBaseline ? path.resolve(_cwd, String(rawSaveBaseline)) : undefined,
    compareBaseline: rawCompareBaseline
      ? path.resolve(_cwd, String(rawCompareBaseline))
      : undefined,
  };

  const { exitCode } = await runI18nBenchmarks(cliOptions);

  return exitCode;
}
