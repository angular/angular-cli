/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * @fileoverview
 * This file defines the core interfaces for package metadata and manifests,
 * providing a strongly-typed representation of the data returned by a package
 * manager registry. These interfaces are crucial for features like `ng add`
 * and `ng update`.
 */

/**
 * Defines how a package's dependencies should be saved to `package.json`
 * after being installed by the `ng add` command.
 *
 * - `dependencies`: Save to the `dependencies` section.
 * - `devDependencies`: Save to the `devDependencies` section.
 * - `false`: Do not save to `package.json`.
 */
export type NgAddSaveDependency = 'dependencies' | 'devDependencies' | false;

/**
 * Represents the configuration for `ng add` found in a package's manifest.
 */
export interface NgAdd {
  /**
   * Specifies how the package should be saved to `package.json`.
   * @see NgAddSaveDependency
   */
  save?: NgAddSaveDependency;
}

/**
 * Represents the configuration for `ng update` found in a package's manifest.
 */
export interface NgUpdate {
  /**
   * The path to the schematics collection for migrations.
   */
  migrations?: string;

  /**
   * A list of package names that should be updated together.
   */
  packageGroup?: string[];
}

/**
 * Represents the full metadata for a package available in the registry.
 * This includes a list of all available versions and distribution tags.
 */
export interface PackageMetadata {
  /** The name of the package. */
  name: string;

  /** A mapping of distribution tags (e.g., 'latest', 'next') to version numbers. */
  'dist-tags': Record<string, string>;

  /** An array of all available version strings for the package. */
  versions: string[];

  /** A mapping of version numbers to their ISO 8601 publication time string. */
  time?: Record<string, string>;
}

/**
 * Represents the manifest (similar to `package.json`) for a specific version of a package.
 * It contains metadata essential for the Angular CLI to perform operations like
 * `ng add` and `ng update`.
 */
export interface PackageManifest {
  /** The name of the package. */
  name: string;

  /** The version of the package. */
  version: string;

  /** A mapping of production dependencies. */
  dependencies?: Record<string, string>;

  /** A mapping of peer dependencies. */
  peerDependencies?: Record<string, string>;

  /** A mapping of development dependencies. */
  devDependencies?: Record<string, string>;

  /** The URL to the package's homepage. */
  homepage?: string;

  /** The path to the schematics collection definition, used by `ng generate`. */
  schematics?: string;

  /** Configuration for the `ng add` command. */
  'ng-add'?: NgAdd;

  /** Configuration for the `ng update` command. */
  'ng-update'?: NgUpdate;
}
