/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { AcceptedPlugin } from 'postcss';

export interface PostcssConfiguration {
  plugins: AcceptedPlugin[];
}

const postcssConfigurationFiles: string[] = [
  'postcss.config.js',
  'postcss.config.cjs',
  'postcss.config.mjs',
];
const tailwindConfigFiles: string[] = [
  'tailwind.config.js',
  'tailwind.config.cjs',
  'tailwind.config.mjs',
  'tailwind.config.ts',
];

export interface SearchDirectory {
  root: string;
  files: Set<string>;
}

export async function generateSearchDirectories(roots: string[]): Promise<SearchDirectory[]> {
  return await Promise.all(
    roots.map((root) =>
      readdir(root, { withFileTypes: true }).then((entries) => ({
        root,
        files: new Set(entries.filter((entry) => entry.isFile()).map((entry) => entry.name)),
      })),
    ),
  );
}

function findFile(
  searchDirectories: SearchDirectory[],
  potentialFiles: string[],
): string | undefined {
  for (const { root, files } of searchDirectories) {
    for (const potential of potentialFiles) {
      if (files.has(potential)) {
        return join(root, potential);
      }
    }
  }

  return undefined;
}

export function findTailwindConfiguration(
  searchDirectories: SearchDirectory[],
): string | undefined {
  return findFile(searchDirectories, tailwindConfigFiles);
}

export async function loadPostcssConfiguration(
  searchDirectories: SearchDirectory[],
): Promise<PostcssConfiguration | undefined> {
  const configPath = findFile(searchDirectories, postcssConfigurationFiles);
  if (!configPath) {
    return undefined;
  }

  const config = await import(configPath);

  // If no plugins are defined, consider it equivalent to no configuration
  if (!config.plugins || !Array.isArray(config.plugins)) {
    return undefined;
  }

  return config;
}
