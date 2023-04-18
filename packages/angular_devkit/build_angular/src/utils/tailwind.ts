/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

const tailwindConfigFiles: string[] = [
  'tailwind.config.js',
  'tailwind.config.cjs',
  'tailwind.config.mjs',
  'tailwind.config.ts',
];

export async function findTailwindConfigurationFile(
  workspaceRoot: string,
  projectRoot: string,
): Promise<string | undefined> {
  const dirEntries = [projectRoot, workspaceRoot].map((root) =>
    readdir(root, { withFileTypes: false }).then((entries) => ({
      root,
      files: new Set(entries),
    })),
  );

  // A configuration file can exist in the project or workspace root
  for await (const { root, files } of dirEntries) {
    for (const potentialConfig of tailwindConfigFiles) {
      if (files.has(potentialConfig)) {
        return join(root, potentialConfig);
      }
    }
  }

  return undefined;
}
