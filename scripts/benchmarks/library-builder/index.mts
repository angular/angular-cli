/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

// Benchmarks `@angular/build:library`'s cold build time across a sweep of library sizes.
// This module only orchestrates the sweep: fixture generation lives in fixtures.mts, build
// execution and measurement live in harness.mts.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type FixtureOptions, type Layout, generateFixture } from './fixtures.mts';
import { type BuildMeasurement, buildOnce, checkBuilderIsBuilt, median } from './harness.mts';
import { formatCsvReport, formatJsonReport } from './reporters.mts';

export interface LibraryBuilderBenchmarkOptions {
  layout?: Layout;
  count?: number[];
  depth?: number[];
  iterations?: number;
  json?: boolean;
  csv?: string;
}

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const scratchRoot = path.join(repoRoot, 'dist', '.library-benchmark-fixtures');

/**
 * Default entry-point counts for the `flat` layout, chosen to resolve a U-shaped scaling curve.
 * Also drives the `deep` layout's default depths (see `depthsForEntryPointTargets`) -- `--count`
 * is the one sweep parameter users pick; `--depth` is only ever an explicit override.
 */
const DEFAULT_FLAT_COUNTS = [10, 20, 50, 100, 200, 300, 400, 500, 1000, 2000];

/**
 * Derives default `deep` layout tree depths from a set of target entry-point counts, picking for
 * each target `n` the smallest `depth` with `2^depth >= n`, de-duplicated in ascending order.
 * This keeps both layouts comparable at roughly the same entry-point scale instead of an
 * arbitrary, independently-chosen depth list.
 */
function depthsForEntryPointTargets(targets: number[]): number[] {
  const depths = new Set<number>();
  for (const target of targets) {
    depths.add(Math.max(1, Math.ceil(Math.log2(target))));
  }

  return [...depths].sort((a, b) => a - b);
}

export async function runLibraryBuilderBenchmarks(
  options: LibraryBuilderBenchmarkOptions = {},
): Promise<{ measurements: BuildMeasurement[]; exitCode: number }> {
  const builder = checkBuilderIsBuilt(repoRoot, console);
  if (!builder) {
    return { measurements: [], exitCode: 1 };
  }

  const layout = options.layout ?? 'flat';
  const iterations = options.iterations ?? 3;
  const sizes =
    layout === 'flat'
      ? (options.count ?? DEFAULT_FLAT_COUNTS)
      : (options.depth ?? depthsForEntryPointTargets(options.count ?? DEFAULT_FLAT_COUNTS));

  fs.mkdirSync(scratchRoot, { recursive: true });
  const measurements: BuildMeasurement[] = [];

  try {
    for (const sizeOrDepth of sizes) {
      const label = layout + '-' + (layout === 'deep' ? 'depth' + sizeOrDepth : sizeOrDepth);
      const projectDir = path.join(scratchRoot, label);

      const fixtureOptions: FixtureOptions =
        layout === 'flat' ? { layout, count: sizeOrDepth } : { layout, depth: sizeOrDepth };
      const entryPoints = generateFixture(projectDir, fixtureOptions);

      if (!options.json) {
        // eslint-disable-next-line no-console
        console.log('\n[library-builder] ' + label + ' (' + entryPoints + ' entry points)');
      }

      const durations: number[] = [];
      for (let i = 1; i <= iterations; i++) {
        const { durationMs, status } = buildOnce(projectDir, builder.architectCli);
        if (!options.json) {
          // eslint-disable-next-line no-console
          console.log(
            '  run ' +
              i +
              '/' +
              iterations +
              ': ' +
              (status === 'ok' ? 'done' : 'FAILED') +
              ' in ' +
              (durationMs / 1000).toFixed(2) +
              's',
          );
        }
        if (status === 'ok') {
          durations.push(durationMs);
        }
        measurements.push({ layout, entryPoints, iteration: i, durationMs, status });
      }

      if (!options.json && durations.length > 0) {
        const medianMs = median(durations);
        // eslint-disable-next-line no-console
        console.log(
          '  median: ' +
            (medianMs / 1000).toFixed(2) +
            's  (' +
            (medianMs / entryPoints).toFixed(2) +
            'ms/entry)',
        );
      }

      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(scratchRoot, { recursive: true, force: true });
  }

  const anyFailed = measurements.some((m) => m.status === 'fail');
  if (options.json) {
    // eslint-disable-next-line no-console
    console.log(formatJsonReport(measurements));
  }

  if (options.csv) {
    fs.writeFileSync(options.csv, formatCsvReport(measurements));
    if (!options.json) {
      // eslint-disable-next-line no-console
      console.log('CSV written to: ' + options.csv);
    }
  }

  return { measurements, exitCode: anyFailed ? 1 : 0 };
}
