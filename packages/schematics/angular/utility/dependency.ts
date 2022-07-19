/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Rule, SchematicContext } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import * as path from 'path';

const installTasks = new WeakMap<SchematicContext, Set<string>>();

interface MinimalPackageManifest {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

/**
 * An enum used to specify the type of a dependency found within a package manifest
 * file (`package.json`).
 */
export enum DependencyType {
  Default = 'dependencies',
  Dev = 'devDependencies',
  Peer = 'peerDependencies',
}

/**
 * An enum used to specify the dependency installation behavior for the {@link addDependency}
 * schematics rule. The installation behavior affects if and when {@link NodePackageInstallTask}
 * will be scheduled when using the rule.
 */
export enum InstallBehavior {
  /**
   * No installation will occur as a result of the rule when specified.
   *
   * NOTE: This does not prevent other rules from scheduling a {@link NodePackageInstallTask}
   * which may install the dependency.
   */
  None,
  /**
   * Automatically determine the need to schedule a {@link NodePackageInstallTask} based on
   * previous usage of the {@link addDependency} within the schematic.
   */
  Auto,
  /**
   * Always schedule a {@link NodePackageInstallTask} when the rule is executed.
   */
  Always,
}

/**
 * An enum used to specify the existing dependency behavior for the {@link addDependency}
 * schematics rule. The existing behavior affects whether the named dependency will be added
 * to the `package.json` when the dependency is already present with a differing specifier.
 */
export enum ExistingBehavior {
  /**
   * The dependency will not be added or otherwise changed if it already exists.
   */
  Skip,
  /**
   * The dependency's existing specifier will be replaced with the specifier provided in the
   * {@link addDependency} call. A warning will also be shown during schematic execution to
   * notify the user of the replacement.
   */
  Replace,
}

/**
 * Adds a package as a dependency to a `package.json`. By default the `package.json` located
 * at the schematic's root will be used. The `manifestPath` option can be used to explicitly specify
 * a `package.json` in different location. The type of the dependency can also be specified instead
 * of the default of the `dependencies` section by using the `type` option for either `devDependencies`
 * or `peerDependencies`.
 *
 * When using this rule, {@link NodePackageInstallTask} does not need to be included directly by
 * a schematic. A package manager install task will be automatically scheduled as needed.
 *
 * @param name The name of the package to add.
 * @param specifier The package specifier for the package to add. Typically a SemVer range.
 * @param options An optional object that can contain the `type` of the dependency
 * and/or a path (`packageJsonPath`) of a manifest file (`package.json`) to modify.
 * @returns A Schematics {@link Rule}
 */
export function addDependency(
  name: string,
  specifier: string,
  options: {
    /**
     * The type of the dependency determines the section of the `package.json` to which the
     * dependency will be added. Defaults to {@link DependencyType.Default} (`dependencies`).
     */
    type?: DependencyType;
    /**
     * The path of the package manifest file (`package.json`) that will be modified.
     * Defaults to `/package.json`.
     */
    packageJsonPath?: string;
    /**
     * The dependency installation behavior to use to determine whether a
     * {@link NodePackageInstallTask} should be scheduled after adding the dependency.
     * Defaults to {@link InstallBehavior.Auto}.
     */
    install?: InstallBehavior;
    /**
     * The behavior to use when the dependency already exists within the `package.json`.
     * Defaults to {@link ExistingBehavior.Replace}.
     */
    existing?: ExistingBehavior;
  } = {},
): Rule {
  const {
    type = DependencyType.Default,
    packageJsonPath = '/package.json',
    install = InstallBehavior.Auto,
    existing = ExistingBehavior.Replace,
  } = options;

  return (tree, context) => {
    const manifest = tree.readJson(packageJsonPath) as MinimalPackageManifest;
    const dependencySection = manifest[type];

    if (!dependencySection) {
      // Section is not present. The dependency can be added to a new object literal for the section.
      manifest[type] = { [name]: specifier };
    } else {
      const existingSpecifier = dependencySection[name];

      if (existingSpecifier === specifier) {
        // Already present with same specifier
        return;
      }

      if (existingSpecifier) {
        // Already present but different specifier

        if (existing === ExistingBehavior.Skip) {
          return;
        }

        // ExistingBehavior.Replace is the only other behavior currently
        context.logger.warn(
          `Package dependency "${name}" already exists with a different specifier. ` +
            `"${existingSpecifier}" will be replaced with "${specifier}".`,
        );
      }

      // Add new dependency in alphabetical order
      const entries = Object.entries(dependencySection);
      entries.push([name, specifier]);
      entries.sort((a, b) => a[0].localeCompare(b[0]));
      manifest[type] = Object.fromEntries(entries);
    }

    tree.overwrite(packageJsonPath, JSON.stringify(manifest, null, 2));

    const installPaths = installTasks.get(context) ?? new Set<string>();
    if (
      install === InstallBehavior.Always ||
      (install === InstallBehavior.Auto && !installPaths.has(packageJsonPath))
    ) {
      context.addTask(
        new NodePackageInstallTask({ workingDirectory: path.dirname(packageJsonPath) }),
      );
      installPaths.add(packageJsonPath);
      installTasks.set(context, installPaths);
    }
  };
}
