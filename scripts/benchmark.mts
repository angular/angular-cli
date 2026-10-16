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
import { STYLE_FLAVORS, type StyleFlavor } from './benchmarks/library-builder/fixtures.mts';
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

function parseIntList(raw: string | number | undefined): number[] | undefined {
  if (raw === undefined) {
    return undefined;
  }

  return String(raw)
    .split(',')
    .map((s) => Number(s.trim()));
}

function parseStringList(raw: string | undefined): string[] | undefined {
  if (raw === undefined) {
    return undefined;
  }

  return raw.split(',').map((s) => s.trim());
}

async function runLibraryBuilderSubsystem(
  options: {
    layout?: string;
    count?: string;
    depth?: string;
    'style-flavor'?: string;
    iterations?: string | number;
    json?: boolean;
    csv?: string | boolean;
  },
  cwd: string,
): Promise<number> {
  if (options.layout !== undefined && options.layout !== 'flat' && options.layout !== 'deep') {
    // eslint-disable-next-line no-console
    console.error('Error: --layout must be "flat" or "deep", got "' + options.layout + '".');

    return 1;
  }

  const count = parseIntList(options.count);
  if (count !== undefined && count.some((n) => !Number.isInteger(n) || n < 1)) {
    // eslint-disable-next-line no-console
    console.error(
      'Error: --count must be a comma-separated list of positive integers, got "' +
        options.count +
        '".',
    );

    return 1;
  }

  const depth = parseIntList(options.depth);
  if (depth !== undefined && depth.some((n) => !Number.isInteger(n) || n < 1)) {
    // eslint-disable-next-line no-console
    console.error(
      'Error: --depth must be a comma-separated list of positive integers, got "' +
        options.depth +
        '".',
    );

    return 1;
  }

  const iterations = options.iterations !== undefined ? Number(options.iterations) : undefined;
  if (iterations !== undefined && (!Number.isInteger(iterations) || iterations < 1)) {
    // eslint-disable-next-line no-console
    console.error(
      'Error: --iterations must be a positive integer, got "' + options.iterations + '".',
    );

    return 1;
  }

  if (options.csv !== undefined && (typeof options.csv !== 'string' || options.csv.length === 0)) {
    // eslint-disable-next-line no-console
    console.error('Error: --csv requires a file path, got "' + options.csv + '".');

    return 1;
  }

  const styleFlavor = parseStringList(options['style-flavor']);
  const validStyleFlavors: readonly string[] = STYLE_FLAVORS;
  if (styleFlavor !== undefined && styleFlavor.some((f) => !validStyleFlavors.includes(f))) {
    // eslint-disable-next-line no-console
    console.error(
      'Error: --style-flavor must be a comma-separated list of: ' +
        STYLE_FLAVORS.join(', ') +
        '. Got "' +
        options['style-flavor'] +
        '".',
    );

    return 1;
  }

  const cliOptions: LibraryBuilderBenchmarkOptions = {
    layout: options.layout as LibraryBuilderBenchmarkOptions['layout'],
    count,
    depth,
    styleFlavor: styleFlavor as StyleFlavor[] | undefined,
    iterations,
    json: Boolean(options.json),
    csv: options.csv !== undefined ? path.resolve(cwd, options.csv as string) : undefined,
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
    count?: string;
    depth?: string;
    'style-flavor'?: string;
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
  --count=<n,n,...>          Entry-point count targets, drives both layouts
                             (default: 10,20,50,100,200,300,400,500,1000,2000)
  --depth=<n,n,...>          Explicit tree depths, layout=deep only. Overrides the depths
                             that would otherwise be derived from --count (the smallest
                             depth with 2^depth >= each target count).
  --style-flavor=<f,f,...>   Style-flavor targets, one or more of: inline, inline-css,
                             inline-scss, external, external-css, external-scss
                             (default: inline)
  --iterations=<n>           Measured iterations (default: 3)
  --json                     Output raw measurements as JSON to stdout
  --csv=<path>               Write raw per-iteration measurements as CSV to <path>

  --help                     Show this help message
`);

    return 0;
  }

  if (targetSubsystem === 'library-builder') {
    return runLibraryBuilderSubsystem(options, _cwd);
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
