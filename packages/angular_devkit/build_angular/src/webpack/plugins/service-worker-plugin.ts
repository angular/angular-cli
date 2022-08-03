/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { Compiler } from 'webpack';
import { augmentAppWithServiceWorker } from '../../utils/service-worker';

export interface ServiceWorkerPluginOptions {
  projectRoot: string;
  root: string;
  outputPath: string;
  baseHref?: string;
  ngswConfigPath?: string;
}

export class ServiceWorkerPlugin {
  constructor(private readonly options: ServiceWorkerPluginOptions) {}

  apply(compiler: Compiler) {
    compiler.hooks.done.tapPromise('angular-service-worker', async (_compilation) => {
      const { projectRoot, root, baseHref = '', ngswConfigPath, outputPath } = this.options;

      await augmentAppWithServiceWorker(
        projectRoot,
        root,
        outputPath,
        baseHref,
        ngswConfigPath,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (compiler.inputFileSystem as any).promises,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (compiler.outputFileSystem as any).promises,
      );
    });
  }
}
