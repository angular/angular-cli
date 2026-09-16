/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import fs from 'node:fs';
import { type BenchmarkCliOptions, runI18nBenchmarks } from './benchmarks/i18n/index.mts';

function checkBuildStatus(logger: Console): boolean {
  const distFile = 'dist/@angular/build/src/tools/esbuild/i18n-inliner.js';
  const srcFile = 'packages/angular/build/src/tools/esbuild/i18n-inliner.ts';

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

export default async function (
  options: {
    _?: string[];
    scenario?: string;
    iterations?: string | number;
    warmup?: string | number;
    concurrency?: string | number;
    build?: boolean;
    json?: boolean;
    saveBaseline?: string;
    'save-baseline'?: string;
    compareBaseline?: string;
    'compare-baseline'?: string;
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

Options:
  --scenario=<name>          Run a specific scenario (e.g. standard-app, enterprise-multilingual)
  --iterations=<n>           Number of measured iterations (default: 5)
  --warmup=<n>               Number of warmup iterations (default: 2)
  --concurrency=<n>          Override worker thread pool concurrency
  --build                    Automatically build packages before benchmarking
  --json                     Output results in machine-readable JSON
  --save-baseline=<file>     Save run results to a baseline JSON file
  --compare-baseline=<file>  Compare run results against an existing baseline JSON file
  --help                     Show this help message
`);

    return 0;
  }

  if (targetSubsystem !== 'i18n') {
    // eslint-disable-next-line no-console
    console.error(`Unknown benchmark subsystem: "${targetSubsystem}". Supported subsystems: i18n`);

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

  const cliOptions: BenchmarkCliOptions = {
    scenario: options.scenario,
    iterations: options.iterations !== undefined ? Number(options.iterations) : undefined,
    warmup: options.warmup !== undefined ? Number(options.warmup) : undefined,
    concurrency: options.concurrency !== undefined ? Number(options.concurrency) : undefined,
    json: Boolean(options.json),
    saveBaseline: options.saveBaseline ?? options['save-baseline'],
    compareBaseline: options.compareBaseline ?? options['compare-baseline'],
  };

  const { exitCode } = await runI18nBenchmarks(cliOptions);

  return exitCode;
}
