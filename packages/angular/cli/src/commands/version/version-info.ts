/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { createRequire } from 'node:module';
import { VERSION } from '../../utilities/version';

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
  cli: {
    version: string;
  };
  system: {
    node: {
      version: string;
      unsupported: boolean;
    };
    os: {
      platform: string;
      architecture: string;
    };
    packageManager: {
      name: string;
      version: string | undefined;
    };
  };
  packages: Record<string, string>;
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
  // Trailing slash is used to allow the path to be treated as a directory
  const workspaceRequire = createRequire(context.root + '/');

  let workspacePackage: PartialPackageInfo | undefined;
  try {
    workspacePackage = workspaceRequire('./package.json');
  } catch {}

  const [nodeMajor] = process.versions.node.split('.').map((part) => Number(part));
  const unsupportedNodeVersion = !SUPPORTED_NODE_MAJORS.includes(nodeMajor);

  const packageNames = new Set(
    Object.keys({
      ...workspacePackage?.dependencies,
      ...workspacePackage?.devDependencies,
    }),
  );

  const packages: Record<string, string> = {};
  for (const name of packageNames) {
    if (PACKAGE_PATTERNS.some((p) => p.test(name))) {
      packages[name] = getVersion(name, workspaceRequire);
    }
  }

  return {
    cli: {
      version: VERSION.full,
    },
    system: {
      node: {
        version: process.versions.node,
        unsupported: unsupportedNodeVersion,
      },
      os: {
        platform: process.platform,
        architecture: process.arch,
      },
      packageManager: {
        name: context.packageManager.name,
        version: context.packageManager.version,
      },
    },
    packages,
  };
}

/**
 * Gets the version of a package.
 * @param moduleName The name of the package.
 * @param workspaceRequire A `require` function for the workspace.
 * @param localRequire A `require` function for the CLI.
 * @returns The version of the package, or `<error>` if it could not be found.
 */
function getVersion(moduleName: string, workspaceRequire: NodeJS.Require): string {
  let packageInfo: PartialPackageInfo | undefined;

  // Try to find the package in the workspace
  try {
    packageInfo = workspaceRequire(`${moduleName}/package.json`);
  } catch {}

  // If found, attempt to get the version
  if (packageInfo) {
    return packageInfo.version;
  }

  return '<error>';
}
