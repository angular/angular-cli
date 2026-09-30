/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { AngularCompilation } from '../../tools/angular/compilation';
import type { StylesheetPluginsass } from '../../tools/esbuild/stylesheets/stylesheet-plugin-factory';
import type { normalizeAssetPatterns } from '../../utils';
import type { normalizeCacheOptions } from '../../utils/normalize-cache';
import type { PostcssConfiguration } from '../../utils/postcss-configuration';

/**
 * Normalized representation of an entry point in the library.
 */
export interface NormalizedEntryPoint {
  /** The subpath in package.json exports (e.g. '.' or './testing'). */
  subpath: string;

  /** Subpath name without leading './' (e.g. '.' or 'testing'). */
  name: string;

  /** Display name of the entry point (e.g. '@my/lib' or '@my/lib/testing'). */
  displayName: string;

  /** Base name of the output bundle (e.g. 'my-lib' or 'my-lib-testing'). */
  bundleName: string;

  /** Absolute path to entry file. */
  entryFilePath: string;

  /** Is this the primary entry point ('.')? */
  isPrimary: boolean;
}

/**
 * Partial package.json data structure for library packaging.
 */
export interface PackageJsonData {
  name: string;
  version?: string;
  type?: string;
  main?: string;
  module?: string;
  typings?: string;
  types?: string;
  sideEffects?: boolean | string[];
  exports?: string | unknown[] | Record<string, unknown>;
  scripts?: Record<string, string>;
  workspaces?: unknown;
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
  [key: string]: unknown;
}

/**
 * Normalized options for the library builder.
 */
export interface NormalizedLibraryOptions {
  workspaceRoot: string;
  projectRoot: string;
  packageName: string;
  packageJson: PackageJsonData;
  outputPath: string;
  deleteOutputPath: boolean;
  packageJsonPath: string;
  tsConfigPath: string;
  entryPoints: Map<string, NormalizedEntryPoint>;
  inlineStyleLanguage: 'css' | 'less' | 'sass' | 'scss';
  styleIncludePaths: string[];
  sass?: StylesheetPluginsass;
  assets: ReturnType<typeof normalizeAssetPatterns>;
  compilationMode: 'partial' | 'full';
  declarationMap: boolean;
  allowedNonPeerDependencies: RegExp[];
  keepLifecycleScripts: boolean;
  watch: boolean;
  poll?: number;
  preserveSymlinks: boolean;
  progress: boolean;
  clearScreen?: boolean;
  cacheOptions: ReturnType<typeof normalizeCacheOptions>;
  postcssConfiguration?: { config: PostcssConfiguration; configPath: string };
  tailwindConfiguration?: { file: string; package: string };
  colors: boolean;
}

/**
 * Cached module ID sets for a bundled entry point.
 */
export interface BundleResult {
  /** Exact set of virtual ESM module IDs bundled into this entry point. */
  esmModuleIds: ReadonlySet<string>;

  /** Exact set of virtual DTS module IDs bundled into this entry point. */
  dtsModuleIds: ReadonlySet<string>;
}

/**
 * Cached state for the single unified library compilation.
 */
export interface SingleProgramCache {
  /** The active Angular compilation instance. */
  readonly compilationInstance: AngularCompilation;

  /** In-memory map of emitted JavaScript files keyed by relative output path. */
  readonly esmFiles: Map<string, string>;

  /** In-memory map of emitted TypeScript declaration files keyed by relative output path. */
  readonly dtsFiles: Map<string, string>;

  /** Set of file paths that failed during stylesheet bundling or compilation. */
  readonly failedFiles?: ReadonlySet<string>;
}

/**
 * State preserved across incremental builds in watch mode.
 */
export interface SingleBuildState {
  singleProgramCache?: SingleProgramCache;
  previousBundleResults: Map<string, BundleResult>;
  pendingChangedEsmFiles: Set<string>;
  pendingChangedDtsFiles: Set<string>;
  hasCompilationError?: boolean;
  hasEmittedManifests?: boolean;
  hasEmittedAssets?: boolean;
  hasEntryPointsChanges?: boolean;
  directoryExists: Set<string>;
}
