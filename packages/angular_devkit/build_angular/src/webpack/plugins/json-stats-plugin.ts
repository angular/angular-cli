/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { createWriteStream, promises as fsPromises } from 'fs';
import { dirname } from 'path';
import { Compiler } from 'webpack';
import { assertIsError } from '../../utils/error';

import { addError } from '../../utils/webpack-diagnostics';

export class JsonStatsPlugin {
  constructor(private readonly statsOutputPath: string) {}

  apply(compiler: Compiler) {
    compiler.hooks.done.tapPromise('angular-json-stats', async (stats) => {
      const { stringifyStream } = await import('@discoveryjs/json-ext');
      const data = stats.toJson('verbose');

      try {
        await fsPromises.mkdir(dirname(this.statsOutputPath), { recursive: true });
        await new Promise<void>((resolve, reject) =>
          stringifyStream(data)
            .pipe(createWriteStream(this.statsOutputPath))
            .on('close', resolve)
            .on('error', reject),
        );
      } catch (error) {
        assertIsError(error);
        addError(
          stats.compilation,
          `Unable to write stats file: ${error.message || 'unknown error'}`,
        );
      }
    });
  }
}
