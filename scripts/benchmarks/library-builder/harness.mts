/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

// Runs and measures a single `@angular/build:library` cold build via Architect's standalone CLI.
// `fixtures.mts` owns generating the on-disk project; this module owns spawning the builder
// against it and reporting what happened. Kept separate so each file has one job.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { Layout, StyleFlavor } from './fixtures.mts';

export interface BuildMeasurement {
  layout: Layout;
  styleFlavor: StyleFlavor;
  entryPoints: number;
  iteration: number;
  durationMs: number;
  status: 'ok' | 'fail';
}

export interface BuilderPaths {
  buildPkg: string;
  architectPkg: string;
  architectCli: string;
}

/** Verifies `@angular/build` and `@angular-devkit/architect` are built before attempting a build. */
export function checkBuilderIsBuilt(repoRoot: string, logger: Console): BuilderPaths | undefined {
  const buildPkg = path.join(repoRoot, 'dist', '@angular', 'build');
  const architectPkg = path.join(repoRoot, 'dist', '@angular-devkit', 'architect');
  const architectCli = path.join(architectPkg, 'bin', 'cli.js');

  if (!fs.existsSync(path.join(buildPkg, 'package.json')) || !fs.existsSync(architectCli)) {
    logger.error(
      'Error: @angular/build and/or @angular-devkit/architect have not been built yet.\n' +
        'Run "pnpm build" (or "pnpm admin build --local" for a faster local build) first.',
    );

    return undefined;
  }

  return { buildPkg, architectPkg, architectCli };
}

/** Spawns one cold `lib:build` run against `projectDir` and times it. */
export function buildOnce(
  projectDir: string,
  architectCli: string,
): { durationMs: number; status: 'ok' | 'fail' } {
  const start = performance.now();
  const result = spawnSync(process.execPath, [architectCli, 'lib:build'], {
    cwd: projectDir,
    stdio: 'pipe',
    maxBuffer: Infinity,
  });
  const durationMs = performance.now() - start;
  const status = result.status === 0 ? 'ok' : 'fail';
  if (status === 'fail') {
    if (result.error) {
      // eslint-disable-next-line no-console
      console.error(result.error);
    }
    // eslint-disable-next-line no-console
    console.error(result.stdout?.toString());
    // eslint-disable-next-line no-console
    console.error(result.stderr?.toString());
  }

  return { durationMs, status };
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}
