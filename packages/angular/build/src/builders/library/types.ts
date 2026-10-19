/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { AngularCompilation } from '../../tools/angular/compilation';
import type { StylesheetPluginsass } from '../../tools/esbuild/stylesheets/stylesheet-plugin-factory';
import type { NormalizedAssetsPattern } from '../../utils';
import type { NormalizedCachedOptions } from '../../utils/normalize-cache';
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

  /** Name of the npm package from the library's `package.json`. */
  packageName: string;

  /** Parsed contents of the library's `package.json`. */
  packageJson: PackageJsonData;

  /** Absolute POSIX path to the build output directory. */
  outputPath: string;

  /** Whether to delete the output directory before building. */
  deleteOutputPath: boolean;

  /** Absolute POSIX path to the library's `package.json`. */
  packageJsonPath: string;

  /** Absolute POSIX path to the TypeScript configuration file. */
  tsConfigPath: string;

  /** Map of normalized entry points keyed by entry point name. */
  entryPoints: Map<string, NormalizedEntryPoint>;

  /** Default stylesheet language for inline component styles. */
  inlineStyleLanguage: 'css' | 'less' | 'sass' | 'scss';

  /** Absolute POSIX paths to style preprocessor include directories. */
  styleIncludePaths: string[];

  /** Optional Sass preprocessor configuration. */
  sass?: StylesheetPluginsass;

  /** Normalized asset patterns with POSIX `input` and `output` paths. */
  assets: NormalizedAssetsPattern[];

  /** Angular compilation mode (`'partial'` or `'full'`). */
  compilationMode?: 'partial' | 'full';

  /** Whether to generate source maps for TypeScript declaration files. */
  declarationMap?: boolean;

  /** Regular expressions matching allowed non-peer dependencies. */
  allowedNonPeerDependencies: RegExp[];

  /** Whether to preserve lifecycle scripts in the emitted `package.json`. */
  keepLifecycleScripts: boolean;

  /** Whether to run the build in watch mode. */
  watch: boolean;

  /** Optional file watching polling interval in milliseconds. */
  poll?: number;

  /** Whether to preserve symbolic links during resolution and bundling. */
  preserveSymlinks: boolean;

  /** Whether to display build progress in the terminal. */
  progress: boolean;

  /** Whether to clear the terminal screen before watch rebuilds. */
  clearScreen?: boolean;

  /** Normalized build cache configuration. */
  cacheOptions: NormalizedCachedOptions;

  /** Resolved PostCSS configuration, if present in the workspace. */
  postcssConfiguration?: { config: PostcssConfiguration; configPath: string };

  /** Resolved Tailwind CSS configuration, if applicable. */
  tailwindConfiguration?: { file: string; package: string };

  /** Whether terminal color output is enabled. */
  colors: boolean;
}

/**
 * Cached module ID and output file sets for a bundled entry point.
 */
export interface BundleResult {
  /** Exact set of virtual POSIX ESM module IDs bundled into this entry point. */
  esmModuleIds: ReadonlySet<string>;

  /** Exact set of virtual POSIX DTS module IDs bundled into this entry point. */
  dtsModuleIds: ReadonlySet<string>;

  /** Relative POSIX output paths of ESM bundle files and sourcemaps emitted for this entry point. */
  esmOutputFiles: ReadonlySet<string>;

  /** Relative POSIX output paths of DTS bundle files and sourcemaps emitted for this entry point. */
  dtsOutputFiles: ReadonlySet<string>;

  /** Whether this entry point bundle imports 'tslib'. */
  hasTslibImport: boolean;
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

  /** Set of POSIX file paths that failed during stylesheet bundling. */
  readonly failedFiles: ReadonlySet<string>;
}

/**
 * Output of the unified library compilation step.
 */
export interface LibraryCompilationOutput {
  /** Read-only map of emitted JavaScript files keyed by POSIX path. */
  readonly esmFiles: ReadonlyMap<string, string>;

  /** Read-only map of emitted TypeScript declaration files keyed by POSIX path. */
  readonly dtsFiles: ReadonlyMap<string, string>;

  /** Set of POSIX JavaScript file paths that were added, modified, or deleted in this iteration. */
  readonly changedEsmFiles: ReadonlySet<string>;

  /** Set of POSIX declaration file paths that were added, modified, or deleted in this iteration. */
  readonly changedDtsFiles: ReadonlySet<string>;

  /** Set of all POSIX source and dependency file paths referenced during compilation. */
  readonly referencedFiles: ReadonlySet<string>;

  /** Cached compilation state for subsequent incremental builds. */
  readonly cache: SingleProgramCache;

  /** Whether any component stylesheet bundling errors occurred. */
  readonly hasStylesheetErrors: boolean;

  /** Promise that resolves when compilation diagnostics have been formatted and recorded. */
  readonly diagnosePromise: Promise<void>;

  /** Effective declarationMap setting resolved from builder options and tsconfig. */
  readonly declarationMap: boolean;

  /** Effective compilationMode setting resolved from builder options and tsconfig. */
  readonly compilationMode: 'partial' | 'full';
}
