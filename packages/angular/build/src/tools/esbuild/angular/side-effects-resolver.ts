/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { PluginBuild } from 'esbuild';
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';

/**
 * Extracts the root package directory containing package.json for a file inside node_modules.
 * Supports standard packages (node_modules/pkg/...) and scoped packages (node_modules/@scope/pkg/...).
 */
export function getPackageDirectory(filePath: string): string | undefined {
  const normalizedPath = filePath.includes('\\') ? filePath.replace(/\\/g, '/') : filePath;
  let index = normalizedPath.lastIndexOf('/node_modules/');
  let offset = 14;
  if (index === -1) {
    if (normalizedPath.startsWith('node_modules/')) {
      index = 0;
      offset = 13;
    } else {
      return undefined;
    }
  }

  const afterNodeModules = normalizedPath.slice(index + offset);
  const firstSlash = afterNodeModules.indexOf('/');
  if (firstSlash === -1) {
    return undefined;
  }

  let end = index + offset;
  if (afterNodeModules.startsWith('@')) {
    const secondSlash = afterNodeModules.indexOf('/', firstSlash + 1);
    end += secondSlash === -1 ? afterNodeModules.length : secondSlash;
  } else {
    end += firstSlash;
  }

  return filePath.slice(0, end);
}

/**
 * Resolves and memoizes package-level and file-level side-effects for bundling optimizations.
 */
export class SideEffectsResolver {
  readonly #build: PluginBuild;
  readonly #advancedOptimizations: boolean;
  readonly #workingDirectory: string;

  /**
   * Memoizes package-level sideEffects values.
   * - `true` or `false` when package.json specifies a boolean `sideEffects`.
   * - `null` when package.json has non-boolean (e.g. array of globs, string), omitted sideEffects, or fails to read.
   * - `Promise<boolean | null>` while package.json is being read and parsed.
   */
  readonly #packageSideEffectsCache = new Map<string, Promise<boolean | null> | boolean | null>();

  /**
   * Memoizes file-level sideEffects results.
   * - `true` or `false` once resolved.
   * - `Promise<boolean>` while esbuild resolution is in-flight.
   */
  readonly #fileSideEffectsCache = new Map<string, Promise<boolean> | boolean>();

  constructor(build: PluginBuild, advancedOptimizations: boolean = true) {
    this.#build = build;
    this.#advancedOptimizations = advancedOptimizations;
    this.#workingDirectory = build.initialOptions.absWorkingDir ?? '';
  }

  /**
   * Determines if a file has side-effects.
   * Returns `undefined` when `advancedOptimizations` is disabled.
   */
  async resolve(filePath: string): Promise<boolean | undefined> {
    if (!this.#advancedOptimizations) {
      return undefined;
    }

    const cachedFileSideEffects = this.#fileSideEffectsCache.get(filePath);
    if (cachedFileSideEffects !== undefined) {
      return cachedFileSideEffects;
    }

    const packageDir = getPackageDirectory(filePath);
    if (packageDir !== undefined) {
      let packageSideEffects = this.#packageSideEffectsCache.get(packageDir);
      if (packageSideEffects === undefined) {
        packageSideEffects = this.#resolvePackageSideEffects(packageDir);
        this.#packageSideEffectsCache.set(packageDir, packageSideEffects);
      }

      if (packageSideEffects instanceof Promise) {
        packageSideEffects = await packageSideEffects;
        this.#packageSideEffectsCache.set(packageDir, packageSideEffects);
      }

      if (packageSideEffects !== null) {
        this.#fileSideEffectsCache.set(filePath, packageSideEffects);

        return packageSideEffects;
      }
    }

    // Fallback: per-file resolution via esbuild when outside node_modules,
    // or when the package sideEffects is non-boolean (array of globs, string, omitted).
    const resolutionPromise = (async () => {
      try {
        const { sideEffects } = await this.#build.resolve(filePath, {
          kind: 'import-statement',
          resolveDir: this.#workingDirectory,
        });

        this.#fileSideEffectsCache.set(filePath, sideEffects);

        return sideEffects;
      } catch (error) {
        this.#fileSideEffectsCache.delete(filePath);
        throw error;
      }
    })();

    this.#fileSideEffectsCache.set(filePath, resolutionPromise);

    return resolutionPromise;
  }

  async #resolvePackageSideEffects(packageDir: string): Promise<boolean | null> {
    try {
      const packageJsonPath = path.join(packageDir, 'package.json');
      const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent) as { sideEffects?: unknown } | null;
      const sideEffects = packageJson?.sideEffects;

      return typeof sideEffects === 'boolean' ? sideEffects : null;
    } catch {
      return null;
    }
  }

  /**
   * Clears all memoized package and file-level side-effects caches.
   */
  clear(): void {
    this.#packageSideEffectsCache.clear();
    this.#fileSideEffectsCache.clear();
  }
}

/**
 * Creates a side-effects resolver function that determines whether a file has side-effects.
 *
 * @param build The esbuild PluginBuild instance.
 * @param advancedOptimizations Whether advanced optimizations are enabled.
 * @returns An async function accepting a file path and returning whether the file has side-effects,
 * or `undefined` when `advancedOptimizations` is false.
 */
export function createSideEffectsResolver(
  build: PluginBuild,
  advancedOptimizations?: boolean,
): (filePath: string) => Promise<boolean | undefined> {
  if (!advancedOptimizations) {
    return async () => undefined;
  }

  const resolver = new SideEffectsResolver(build, advancedOptimizations);

  return (filePath: string) => resolver.resolve(filePath);
}
