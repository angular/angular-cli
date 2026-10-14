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

  /** Absolute POSIX path to the entry file. */
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
 * All file and directory paths are normalized to POSIX format.
 */
export interface NormalizedLibraryOptions {
  /** Absolute POSIX path to the workspace root directory. */
  workspaceRoot: string;

  /** Absolute POSIX path to the library project root directory. */
  projectRoot: string;

  packageName: string;
  packageJson: PackageJsonData;

  /** Absolute POSIX path to the build output directory. */
  outputPath: string;

  deleteOutputPath: boolean;

  /** Absolute POSIX path to the library's `package.json`. */
  packageJsonPath: string;

  /** Absolute POSIX path to the TypeScript configuration file. */
  tsConfigPath: string;

  entryPoints: Map<string, NormalizedEntryPoint>;
  inlineStyleLanguage: 'css' | 'less' | 'sass' | 'scss';

  /** Absolute POSIX paths to style preprocessor include directories. */
  styleIncludePaths: string[];

  sass?: StylesheetPluginsass;

  /** Normalized asset patterns with POSIX `input` and `output` paths. */
  assets: ReturnType<typeof normalizeAssetPatterns>;

  compilationMode?: 'partial' | 'full';
  declarationMap?: boolean;
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
  /** Exact set of virtual POSIX ESM module IDs bundled into this entry point. */
  esmModuleIds: ReadonlySet<string>;

  /** Exact set of virtual POSIX DTS module IDs bundled into this entry point. */
  dtsModuleIds: ReadonlySet<string>;

  /** Whether this entry point bundle imports 'tslib'. */
  hasTslibImport?: boolean;
}

/**
 * Cached state for the single unified library compilation.
 */
export interface SingleProgramCache {
  /** The active Angular compilation instance. */
  readonly compilationInstance: AngularCompilation;

  /** In-memory map of emitted JavaScript files keyed by POSIX path. */
  readonly esmFiles: Map<string, string>;

  /** In-memory map of emitted TypeScript declaration files keyed by POSIX path. */
  readonly dtsFiles: Map<string, string>;

  /** Set of POSIX file paths that failed during stylesheet bundling or compilation. */
  readonly failedFiles?: ReadonlySet<string>;
}

/**
 * State preserved across incremental builds in watch mode.
 */
export interface SingleBuildState {
  /** Cached unified TypeScript and Angular compilation state. */
  singleProgramCache?: SingleProgramCache;

  /** Effective compilation mode resolved from builder options and tsconfig. */
  compilationMode?: 'partial' | 'full';

  /** Map of entry point names to their previous bundle results. */
  previousBundleResults: Map<string, BundleResult>;

  /** Set of changed POSIX ESM file paths pending bundling. */
  pendingChangedEsmFiles: Set<string>;

  /** Set of changed POSIX TypeScript declaration file paths pending bundling. */
  pendingChangedDtsFiles: Set<string>;

  /** Whether the previous build iteration encountered a compilation or diagnostic error. */
  hasCompilationError?: boolean;

  /** Whether package.json and secondary entry point manifests have been emitted. */
  hasEmittedManifests?: boolean;

  /** Whether the last emitted root package.json included a tslib dependency. */
  hasEmittedTslib?: boolean;

  /** Whether static assets have been emitted in a prior iteration. */
  hasEmittedAssets?: boolean;

  /** Whether entry points in package.json changed since the last compilation. */
  hasEntryPointsChanges?: boolean;
}
