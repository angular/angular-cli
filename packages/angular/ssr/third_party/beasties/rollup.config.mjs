/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import alias from '@rollup/plugin-alias';
import { createRollupLicensePlugin } from 'rollup-license-plugin';
import { nodeless } from 'unenv';

/**
 * Header text that will be added to the top of the output license extraction file.
 */
const EXTRACTION_FILE_HEADER = '';

/**
 * The package entry separator to use within the output license extraction file.
 */
const EXTRACTION_FILE_SEPARATOR = '-'.repeat(80) + '\n';

const { path, fs } = nodeless.alias;

export default {
  plugins: [
    nodeResolve({
      preferBuiltins: false,
      browser: true,
    }),
    commonjs(),
    alias({
      entries: {
        'node:path': path,
        'node:fs': fs,
      },
    }),
    createRollupLicensePlugin({
      additionalFiles: {
        'THIRD_PARTY_LICENSES.txt': (packages) => {
          const extractedLicenses = {};

          for (const { name, license, licenseText } of packages) {
            // Generate the package's license entry in the output content
            let extractedLicenseContent = `Package: ${name}\n`;
            extractedLicenseContent += `License: ${license}\n`;
            extractedLicenseContent += `\n${(licenseText ?? '').trim().replace(/\r?\n/g, '\n')}\n`;
            extractedLicenseContent += EXTRACTION_FILE_SEPARATOR;

            extractedLicenses[name] = extractedLicenseContent;
          }

          // Get the keys of the object and sort them and etract and join the values corresponding to the sorted keys
          const joinedLicenseContent = Object.keys(extractedLicenses)
            .sort()
            .map((pkgName) => extractedLicenses[pkgName])
            .join('');

          return `${EXTRACTION_FILE_HEADER}\n${EXTRACTION_FILE_SEPARATOR}${joinedLicenseContent}`;
        },
      },
    }),
  ],
  output: {
    exports: 'auto',
  },
};
