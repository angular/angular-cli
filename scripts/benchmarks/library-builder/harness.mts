/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

// Runs and measures a single `@angular/build:library` or `@angular/build:ng-packagr` cold build via Architect's standalone CLI.
// `fixtures.mts` owns generating the on-disk project; this module owns spawning the builder
// against it and reporting what happened. Kept separate so each file has one job.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { Layout, LibraryBuilder, StyleFlavor } from './fixtures.mts';

export interface BuildMeasurement {
  builder: LibraryBuilder;
  layout: Layout;
  styleFlavor: StyleFlavor;
  entryPoints: number;
  iteration: number;
  durationMs: number;
  status: 'ok' | 'fail';
}

export interface BuilderPaths {
  buildPkg: string;
  corePkg: string;
  architectPkg: string;
  architectCli: string;
}

export interface BuilderEnv extends BuilderPaths {
  /** NODE_PATH value to pass to a spawned child so its bare `require()`s resolve into dist/. */
  nodePath: string;
}

/** Verifies `@angular/build` and `@angular-devkit/architect` are built before attempting a build. */
export function checkBuilderIsBuilt(repoRoot: string, logger: Console): BuilderPaths | undefined {
  const buildPkg = path.join(repoRoot, 'dist', '@angular', 'build');
  const corePkg = path.join(repoRoot, 'dist', '@angular-devkit', 'core');
  const architectPkg = path.join(repoRoot, 'dist', '@angular-devkit', 'architect');
  const architectCli = path.join(architectPkg, 'bin', 'cli.js');

  if (!fs.existsSync(path.join(buildPkg, 'package.json')) || !fs.existsSync(architectCli)) {
    logger.error(
      'Error: @angular/build and/or @angular-devkit/architect have not been built yet.\n' +
        'Run "pnpm build" (or "pnpm admin build --local" for a faster local build) first.',
    );

    return undefined;
  }

  return { buildPkg, corePkg, architectPkg, architectCli };
}

/** Creates/repairs `shimDir/<name>` as a symlink to `target`, skipping if already correct. */
function linkIntoShim(shimDir: string, name: string, target: string): void {
  const linkPath = path.join(shimDir, name);
  fs.mkdirSync(path.dirname(linkPath), { recursive: true });

  try {
    if (fs.readlinkSync(linkPath) === target) {
      return;
    }
    fs.rmSync(linkPath, { force: true });
  } catch {
    // ENOENT (link doesn't exist yet) -- fall through to create it.
  }

  fs.symlinkSync(target, linkPath, 'junction');
}

/**
 * Prepares the environment a standalone, spawned `architectCli` process needs to resolve its own
 * dependencies. `dist/` has no `node_modules` of its own, and a `pnpm install` (`hoist: false`)
 * only links `@angular-devkit/core`/`architect`/`@angular/build`'s dependencies into each
 * package's own SOURCE directory under `packages/`, not into anything reachable from `dist/`. So
 * a bare `require('@angular-devkit/core')` from the built CLI script has nowhere to resolve to.
 *
 * Fixes this with a small symlink directory mapping each built package's bare specifier to its
 * `dist/` output, combined with each package's own `node_modules` (where its actual npm deps --
 * ajv-formats, esbuild, sass, etc. -- are already pnpm-linked) into a `NODE_PATH` value: Node
 * treats each `NODE_PATH` entry as an extra global resolution root, so this covers arbitrarily
 * nested bare requires without having to enumerate individual third-party packages.
 */
export function prepareBuilderEnv(
  repoRoot: string,
  builder: BuilderPaths,
  shimDir: string,
  logger: Console,
): BuilderEnv | undefined {
  const ownNodeModulesDirs = [
    path.join(repoRoot, 'packages', 'angular_devkit', 'core', 'node_modules'),
    path.join(repoRoot, 'packages', 'angular_devkit', 'architect', 'node_modules'),
    path.join(repoRoot, 'packages', 'angular', 'build', 'node_modules'),
  ];

  const missing = ownNodeModulesDirs.filter((dir) => !fs.existsSync(dir));
  if (missing.length > 0) {
    logger.error(
      'Error: expected node_modules missing for:\n  ' +
        missing.join('\n  ') +
        '\nRun "pnpm install" at the repo root first.',
    );

    return undefined;
  }

  fs.mkdirSync(shimDir, { recursive: true });
  linkIntoShim(shimDir, '@angular/build', builder.buildPkg);
  linkIntoShim(shimDir, '@angular-devkit/core', builder.corePkg);
  linkIntoShim(shimDir, '@angular-devkit/architect', builder.architectPkg);

  const nodePath = [shimDir, ...ownNodeModulesDirs].join(path.delimiter);

  return { ...builder, nodePath };
}

/** Spawns one cold `lib:build` run against `projectDir` and times it. */
export function buildOnce(
  projectDir: string,
  architectCli: string,
  nodePath: string,
): { durationMs: number; status: 'ok' | 'fail' } {
  const existingNodePath = process.env['NODE_PATH'];
  const mergedNodePath = existingNodePath
    ? `${nodePath}${path.delimiter}${existingNodePath}`
    : nodePath;

  const start = performance.now();
  const result = spawnSync(process.execPath, [architectCli, 'lib:build'], {
    cwd: projectDir,
    stdio: 'pipe',
    maxBuffer: Infinity,
    env: { ...process.env, NODE_PATH: mergedNodePath },
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
