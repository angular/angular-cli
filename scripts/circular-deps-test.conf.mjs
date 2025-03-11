/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { statSync } from 'node:fs';
import { join } from 'node:path';

import { packages } from './packages.mjs';

export const baseDir = '../';
export const goldenFile = '../goldens/circular-deps/packages.json';
export const glob = '../packages/**/*.ts';
// Command that will be displayed if the golden needs to be updated.
export const approveCommand = 'pnpm ts-circular-deps approve';

/**
 * Custom module resolver that maps specifiers for local packages folder.
 * This ensures that cross package/entry-point dependencies can be detected.
 */
const LOCAL_MAPPINGS = Object.entries(packages).map(([name, pkg]) => [name, pkg.root]);

export function resolveModule(specifier) {
  let localSpecifierPath;

  for (const [key, value] of LOCAL_MAPPINGS) {
    if (specifier.startsWith(key)) {
      localSpecifierPath = specifier.replace(key, value);
      break;
    }
  }

  if (!localSpecifierPath) {
    return null;
  }

  const lookups = [
    localSpecifierPath,
    `${localSpecifierPath}.ts`,
    join(localSpecifierPath, 'src/index.ts'),
    join(localSpecifierPath, 'index.ts'),
  ];

  for (const lookup of lookups) {
    try {
      if (statSync(lookup).isFile()) {
        return lookup;
      }
    } catch {}
  }

  return null;
}
