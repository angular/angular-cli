/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { createRequire } from 'node:module';
import { resolve } from 'node:path';

/**
 * A subset of `package.json` fields that are relevant for the version command.
 */
interface PartialPackageInfo {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/**
 * An object containing all the version information that will be displayed by the command.
 */
export interface VersionInfo {
  ngCliVersion: string;
  angularCoreVersion: string;
  angularSameAsCore: string[];
  versions: Record<string, string>;
  unsupportedNodeVersion: boolean;
  nodeVersion: string;
  packageManagerName: string;
  packageManagerVersion: string | undefined;
  os: string;
  arch: string;
}

/**
 * Major versions of Node.js that are officially supported by Angular.
 * @see https://angular.dev/reference/versions#supported-node-js-versions
 */
const SUPPORTED_NODE_MAJORS = [20, 22, 24];

/**
 * A list of regular expression patterns that match package names that should be included in the
 * version output.
 */
const PACKAGE_PATTERNS = [
  /^@angular\/.*/,
  /^@angular-devkit\/.*/,
  /^@ngtools\/.*/,
  /^@schematics\/.*/,
  /^rxjs$/,
  /^typescript$/,
  /^ng-packagr$/,
  /^webpack$/,
  /^zone\.js$/,
];

/**
 * Gathers all the version information from the environment and workspace.
 * @returns An object containing all the version information.
 */
export function gatherVersionInfo(context: {
  packageManager: { name: string; version: string | undefined };
  root: string;
}): VersionInfo {
  const localRequire = createRequire(resolve(__filename, '../../../'));
  // Trailing slash is used to allow the path to be treated as a directory
  const workspaceRequire = createRequire(context.root + '/');

  const cliPackage: PartialPackageInfo = localRequire('./package.json');
  let workspacePackage: PartialPackageInfo | undefined;
  try {
    workspacePackage = workspaceRequire('./package.json');
  } catch {}

  const [nodeMajor] = process.versions.node.split('.').map((part) => Number(part));
  const unsupportedNodeVersion = !SUPPORTED_NODE_MAJORS.includes(nodeMajor);

  const packageNames = new Set(
    Object.keys({
      ...cliPackage.dependencies,
      ...cliPackage.devDependencies,
      ...workspacePackage?.dependencies,
      ...workspacePackage?.devDependencies,
    }),
  );

  const versions: Record<string, string> = {};
  for (const name of packageNames) {
    if (PACKAGE_PATTERNS.some((p) => p.test(name))) {
      versions[name] = getVersion(name, workspaceRequire, localRequire);
    }
  }

  const ngCliVersion = cliPackage.version;
  let angularCoreVersion = '';
  const angularSameAsCore: string[] = [];

  if (workspacePackage) {
    // Filter all angular versions that are the same as core.
    angularCoreVersion = versions['@angular/core'];
    if (angularCoreVersion) {
      for (const [name, version] of Object.entries(versions)) {
        if (version === angularCoreVersion && name.startsWith('@angular/')) {
          angularSameAsCore.push(name.replace(/^@angular\//, ''));
          delete versions[name];
        }
      }

      // Make sure we list them in alphabetical order.
      angularSameAsCore.sort();
    }
  }

  return {
    ngCliVersion,
    angularCoreVersion,
    angularSameAsCore,
    versions,
    unsupportedNodeVersion,
    nodeVersion: process.versions.node,
    packageManagerName: context.packageManager.name,
    packageManagerVersion: context.packageManager.version,
    os: process.platform,
    arch: process.arch,
  };
}

/**
 * Gets the version of a package.
 * @param moduleName The name of the package.
 * @param workspaceRequire A `require` function for the workspace.
 * @param localRequire A `require` function for the CLI.
 * @returns The version of the package, or `<error>` if it could not be found.
 */
function getVersion(
  moduleName: string,
  workspaceRequire: NodeJS.Require,
  localRequire: NodeJS.Require,
): string {
  let packageInfo: PartialPackageInfo | undefined;
  let cliOnly = false;

  // Try to find the package in the workspace
  try {
    packageInfo = workspaceRequire(`${moduleName}/package.json`);
  } catch {}

  // If not found, try to find within the CLI
  if (!packageInfo) {
    try {
      packageInfo = localRequire(`${moduleName}/package.json`);
      cliOnly = true;
    } catch {}
  }

  // If found, attempt to get the version
  if (packageInfo) {
    try {
      return packageInfo.version + (cliOnly ? ' (cli-only)' : '');
    } catch {}
  }

  return '<error>';
}
