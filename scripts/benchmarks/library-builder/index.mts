/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

// Benchmarks `@angular/build:library`'s cold build time across a sweep of library sizes.
//
// Context: a comparison against ng-packagr (a third-party APF build tool) found that its
// per-entry-point build cost grows super-linearly past roughly 300-500 secondary entry points.
// This suite exists to check whether `@angular/build:library` -- a from-scratch build pipeline,
// unrelated to ng-packagr's implementation -- shows the same growth on equivalent fixtures.
// See scripts/benchmarks/library-builder/README.md for the full methodology and findings.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { type FixtureOptions, type Layout, type Style, generateFixture } from './fixtures.mts';

export interface LibraryBuilderBenchmarkOptions {
  layout?: Layout;
  style?: Style;

  /** Comma-separated entry-point counts, for `layout: 'flat'`. */
  sizes?: number[];

  /** Comma-separated tree depths, for `layout: 'deep'`. */
  depths?: number[];
  iterations?: number;
  json?: boolean;
}

export interface BuildMeasurement {
  layout: Layout;
  style: Style;
  entryPoints: number;
  iteration: number;
  durationMs: number;
  status: 'ok' | 'fail';
}

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const scratchRoot = path.join(repoRoot, 'dist', '.library-builder-benchmark-tmp');
const rootNodeModules = path.join(repoRoot, 'node_modules');
const pnpmStore = path.join(rootNodeModules, '.pnpm');

function checkBuilderIsBuilt(
  logger: Console,
): { buildPkg: string; architectPkg: string; architectCli: string } | undefined {
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

/**
 * `@angular/build` and `@angular-devkit/architect` are Bazel-built workspace packages, not
 * ordinary npm dependencies -- a plain `pnpm install` never links them (or their own
 * dependencies) into the root node_modules. Resolving a plain `require('@angular/build')`
 * from anywhere therefore needs these links to exist at least once, at the repo root (Node's
 * module resolution walks up from each required file's real, on-disk location, so per-fixture
 * symlinks are not enough once a dependency itself does a bare `require`).
 *
 * This walks the dependency graph starting at `@angular/build` and `@angular-devkit/architect`
 * and links any package missing from node_modules, resolving each from the pnpm store so it
 * doesn't go stale if a dependency version changes.
 */
function ensureBuilderDepsLinkedAtRepoRoot(
  logger: Console,
  { buildPkg, architectPkg }: { buildPkg: string; architectPkg: string },
): void {
  fs.mkdirSync(path.join(rootNodeModules, '@angular'), { recursive: true });
  fs.mkdirSync(path.join(rootNodeModules, '@angular-devkit'), { recursive: true });
  linkIfMissing('@angular/build', buildPkg);
  linkIfMissing('@angular-devkit/architect', architectPkg);

  const seen = new Set<string>(['@angular/build', '@angular-devkit/architect']);
  const queue: string[] = ['@angular/build', '@angular-devkit/architect'];
  while (queue.length > 0) {
    const pkgName = queue.shift();
    if (pkgName === undefined) {
      break;
    }
    const pkgJsonPath = path.join(rootNodeModules, pkgName, 'package.json');
    if (!fs.existsSync(pkgJsonPath)) {
      continue;
    }
    const deps = Object.keys(
      (JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8')).dependencies ?? {}) as Record<
        string,
        string
      >,
    );
    for (const dep of deps) {
      if (seen.has(dep)) {
        continue;
      }
      seen.add(dep);
      queue.push(dep);
      if (!fs.existsSync(path.join(rootNodeModules, dep))) {
        linkFromPnpmStore(logger, dep);
      }
    }
  }
}

function linkIfMissing(name: string, target: string): void {
  const linkPath = path.join(rootNodeModules, name);
  try {
    const stat = fs.lstatSync(linkPath);
    if (stat.isSymbolicLink() && !fs.existsSync(linkPath)) {
      // Remove broken symlink to avoid EEXIST error on recreation
      fs.unlinkSync(linkPath);
    } else {
      // Symlink already exists and is valid
      return;
    }
  } catch (e: any) {
    if (e.code !== 'ENOENT') {
      throw e;
    }
  }
  fs.symlinkSync(target, linkPath, 'dir');
}

/** Resolves `dep` (e.g. "rxjs" or "@angular-devkit/core") to its pnpm store dir and symlinks it. */
function linkFromPnpmStore(logger: Console, dep: string): void {
  const storeName = dep.startsWith('@') ? dep.replace('/', '+') : dep;
  const candidates = fs.existsSync(pnpmStore)
    ? fs.readdirSync(pnpmStore).filter((entry) => entry.startsWith(`${storeName}@`))
    : [];
  if (candidates.length === 0) {
    logger.warn(`Warning: could not resolve "${dep}" from the pnpm store; it may be missing.`);

    return;
  }
  // Prefer the lexically-last match (newest version) when more than one is installed.
  candidates.sort();
  const storeDir = candidates[candidates.length - 1];
  const target = path.join(pnpmStore, storeDir, 'node_modules', dep);
  if (dep.includes('/')) {
    fs.mkdirSync(path.join(rootNodeModules, path.dirname(dep)), { recursive: true });
  }
  linkIfMissing(dep, target);
}

function buildOnce(
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

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export async function runLibraryBuilderBenchmarks(
  options: LibraryBuilderBenchmarkOptions = {},
): Promise<{ measurements: BuildMeasurement[]; exitCode: number }> {
  const builder = checkBuilderIsBuilt(console);
  if (!builder) {
    return { measurements: [], exitCode: 1 };
  }
  ensureBuilderDepsLinkedAtRepoRoot(console, builder);

  const layout = options.layout ?? 'flat';
  const style = options.style ?? 'inline';
  const iterations = options.iterations ?? 2;
  const sizes =
    layout === 'flat'
      ? (options.sizes ?? [10, 50, 300, 1000, 2000])
      : (options.depths ?? [2, 5, 8, 11]);

  fs.mkdirSync(scratchRoot, { recursive: true });
  const measurements: BuildMeasurement[] = [];

  try {
    for (const sizeOrDepth of sizes) {
      const label = layout + "-" + style + "-" + (layout === "deep" ? "depth" + sizeOrDepth : sizeOrDepth);
      const projectDir = path.join(scratchRoot, label);

      const fixtureOptions: FixtureOptions =
        layout === 'flat'
          ? { layout, style, count: sizeOrDepth }
          : { layout, style, depth: sizeOrDepth };
      const entryPoints = generateFixture(projectDir, fixtureOptions);

      if (!options.json) {
        // eslint-disable-next-line no-console
        console.log("\n[library-builder] " + label + " (" + entryPoints + " entry points)");
      }

      const durations: number[] = [];
      for (let i = 1; i <= iterations; i++) {
        const { durationMs, status } = buildOnce(projectDir, builder.architectCli);
        if (!options.json) {
          // eslint-disable-next-line no-console
          console.log(
            "  run " + i + "/" + iterations + ": " + (status === 'ok' ? 'done' : 'FAILED') + " in " + (durationMs / 1000).toFixed(2) + "s"
          );
        }
        if (status === 'ok') {
          durations.push(durationMs);
        }
        measurements.push({ layout, style, entryPoints, iteration: i, durationMs, status });
      }

      if (!options.json && durations.length > 0) {
        const medianMs = median(durations);
        // eslint-disable-next-line no-console
        console.log(
          "  median: " + (medianMs / 1000).toFixed(2) + "s  (" + (medianMs / entryPoints).toFixed(2) + "ms/entry)"
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
    console.log(JSON.stringify(measurements, null, 2));
  }

  return { measurements, exitCode: anyFailed ? 1 : 0 };
}
