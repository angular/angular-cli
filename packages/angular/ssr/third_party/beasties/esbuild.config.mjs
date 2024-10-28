/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join, basename, dirname } from 'node:path';
import { nodeless } from 'unenv';

const { path, fs } = nodeless.alias;

export default {
  format: 'esm',
  platform: 'browser',
  entryNames: 'index',
  legalComments: 'eof',
  alias: {
    'node:fs': fs,
    'node:path': path,
  },
  plugins: [
    {
      name: 'angular-license-extractor',
      setup(build) {
        build.onEnd(async (result) => {
          const licenses = await extractLicenses(result.metafile);

          return writeFile(join(build.initialOptions.outdir, 'THIRD_PARTY_LICENSES.txt'), licenses);
        });
      },
    },
  ],
};

// Note: The following content has been adapted from the Angular CLI license extractor.

/**
 * The path segment used to signify that a file is part of a package.
 */
const NODE_MODULE_SEGMENT = 'node_modules';

/**
 * String constant for the NPM recommended custom license wording.
 *
 * See: https://docs.npmjs.com/cli/v9/configuring-npm/package-json#license
 *
 * Example:
 * ```
 * {
 *   "license" : "SEE LICENSE IN <filename>"
 * }
 * ```
 */
const CUSTOM_LICENSE_TEXT = 'SEE LICENSE IN ';

/**
 * A list of commonly named license files found within packages.
 */
const LICENSE_FILES = ['LICENSE', 'LICENSE.txt', 'LICENSE.md'];

/**
 * Header text that will be added to the top of the output license extraction file.
 */
const EXTRACTION_FILE_HEADER = '';

/**
 * The package entry separator to use within the output license extraction file.
 */
const EXTRACTION_FILE_SEPARATOR = '-'.repeat(80) + '\n';

/**
 * Extracts license information for each node module package included in the output
 * files of the built code. This includes JavaScript and CSS output files. The esbuild
 * metafile generated during the bundling steps is used as the source of information
 * regarding what input files where included and where they are located. A path segment
 * of `node_modules` is used to indicate that a file belongs to a package and its license
 * should be include in the output licenses file.
 *
 * The package name and license field are extracted from the `package.json` file for the
 * package. If a license file (e.g., `LICENSE`) is present in the root of the package, it
 * will also be included in the output licenses file.
 *
 * @param metafile An esbuild metafile object.
 * @returns A string containing the content of the output licenses file.
 */
async function extractLicenses(metafile) {
  const seenPaths = new Set();
  const seenPackages = new Set();
  const extractedLicenses = {};

  for (const entry of Object.values(metafile.outputs)) {
    for (const [inputPath, { bytesInOutput }] of Object.entries(entry.inputs)) {
      // Skip if not included in output
      if (bytesInOutput <= 0) {
        continue;
      }

      // Skip already processed paths
      if (seenPaths.has(inputPath)) {
        continue;
      }
      seenPaths.add(inputPath);

      // Skip non-package paths
      if (!inputPath.includes(NODE_MODULE_SEGMENT)) {
        continue;
      }

      // Extract the package name from the path
      let baseDirectory = join(process.cwd(), inputPath);
      let nameOrScope, nameOrFile;
      let found = false;
      while (baseDirectory !== dirname(baseDirectory)) {
        const segment = basename(baseDirectory);
        if (segment === NODE_MODULE_SEGMENT) {
          found = true;
          break;
        }

        nameOrFile = nameOrScope;
        nameOrScope = segment;
        baseDirectory = dirname(baseDirectory);
      }

      // Skip non-package path edge cases that are not caught in the includes check above
      if (!found || !nameOrScope) {
        continue;
      }

      const packageName = nameOrScope.startsWith('@')
        ? `${nameOrScope}/${nameOrFile}`
        : nameOrScope;
      const packageDirectory = join(baseDirectory, packageName);

      // Load the package's metadata to find the package's name, version, and license type
      const packageJsonPath = join(packageDirectory, 'package.json');
      let packageJson;
      try {
        packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
      } catch {
        // Invalid package
        continue;
      }

      // Skip already processed packages
      const packageId = `${packageName}@${packageJson.version}`;
      if (seenPackages.has(packageId)) {
        continue;
      }
      seenPackages.add(packageId);

      // Attempt to find license text inside package
      let licenseText = '';
      if (
        typeof packageJson.license === 'string' &&
        packageJson.license.toLowerCase().startsWith(CUSTOM_LICENSE_TEXT)
      ) {
        // Attempt to load the package's custom license
        let customLicensePath;
        const customLicenseFile = normalize(
          packageJson.license.slice(CUSTOM_LICENSE_TEXT.length + 1).trim(),
        );
        if (customLicenseFile.startsWith('..') || isAbsolute(customLicenseFile)) {
          // Path is attempting to access files outside of the package
          // TODO: Issue warning?
        } else {
          customLicensePath = join(packageDirectory, customLicenseFile);
          try {
            licenseText = await readFile(customLicensePath, 'utf-8');
            break;
          } catch {}
        }
      } else {
        // Search for a license file within the root of the package
        for (const potentialLicense of LICENSE_FILES) {
          const packageLicensePath = join(packageDirectory, potentialLicense);
          try {
            licenseText = await readFile(packageLicensePath, 'utf-8');
            break;
          } catch {}
        }
      }

      // Generate the package's license entry in the output content
      let extractedLicenseContent = `Package: ${packageJson.name}\n`;
      extractedLicenseContent += `License: ${JSON.stringify(packageJson.license, undefined, 2)}\n`;
      extractedLicenseContent += `\n${licenseText.trim().replace(/\r?\n/g, '\n')}\n`;
      extractedLicenseContent += EXTRACTION_FILE_SEPARATOR;

      extractedLicenses[packageJson.name] = extractedLicenseContent;
    }
  }

  // Get the keys of the object and sort them and etract and join the values corresponding to the sorted keys
  const joinedLicenseContent = Object.keys(extractedLicenses)
    .sort()
    .map((pkgName) => extractedLicenses[pkgName])
    .join('');

  return `${EXTRACTION_FILE_HEADER}\n${EXTRACTION_FILE_SEPARATOR}${joinedLicenseContent}`;
}
