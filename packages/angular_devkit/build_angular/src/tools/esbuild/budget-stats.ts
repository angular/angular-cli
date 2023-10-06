/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { Metafile } from 'esbuild';
import { basename } from 'node:path';
import type { BudgetStats } from '../../utils/bundle-calculator';
import type { InitialFileRecord } from './bundler-context';

/**
 * Generates a bundle budget calculator compatible stats object that provides
 * the necessary information for the Webpack-based bundle budget code to
 * interoperate with the esbuild-based builders.
 * @param metafile The esbuild metafile of a build to use.
 * @param initialFiles The records of all initial files of a build.
 * @returns A bundle budget compatible stats object.
 */
export function generateBudgetStats(
  metafile: Metafile,
  initialFiles: Map<string, InitialFileRecord>,
): BudgetStats {
  const stats: Required<BudgetStats> = {
    chunks: [],
    assets: [],
  };

  for (const [file, entry] of Object.entries(metafile.outputs)) {
    if (!file.endsWith('.js') && !file.endsWith('.css')) {
      continue;
    }

    const initialRecord = initialFiles.get(file);
    let name = initialRecord?.name;
    if (name === undefined && entry.entryPoint) {
      // For non-initial lazy modules, convert the entry point file into a Webpack compatible name
      name = basename(entry.entryPoint)
        .replace(/\.[cm]?[jt]s$/, '')
        .replace(/[\\/.]/g, '-');
    }

    stats.chunks.push({
      files: [file],
      initial: !!initialRecord,
      names: name ? [name] : undefined,
    });

    // 'ng-component' is set by the angular plugin's component stylesheet bundler
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const componentStyle: boolean = (entry as any)['ng-component'];

    stats.assets.push({
      // Component styles use the input file while all other outputs use the result file
      name: (componentStyle && Object.keys(entry.inputs)[0]) || file,
      size: entry.bytes,
      componentStyle,
    });
  }

  return stats;
}
