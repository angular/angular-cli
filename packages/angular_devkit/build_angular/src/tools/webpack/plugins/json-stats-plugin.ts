/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Compiler } from 'webpack';
import { assertIsError } from '../../../utils/error';
import { addError } from '../../../utils/webpack-diagnostics';

export class JsonStatsPlugin {
  constructor(private readonly statsOutputPath: string) {}

  apply(compiler: Compiler) {
    compiler.hooks.done.tapPromise('angular-json-stats', async (stats) => {
      const { stringifyChunked } = await import('@discoveryjs/json-ext');
      const data = stats.toJson('verbose');

      try {
        await mkdir(dirname(this.statsOutputPath), { recursive: true });
        await pipeline(stringifyChunked(data), createWriteStream(this.statsOutputPath));
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
