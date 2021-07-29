/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { resolve } from 'path';
import { Configuration } from 'webpack';
import { WebpackConfigOptions } from '../../utils/build-options';
import { getTypescriptWorkerPlugin } from './typescript';

export function getWorkerConfig(wco: WebpackConfigOptions): Configuration {
  const { webWorkerTsConfig } = wco.buildOptions;

  if (!webWorkerTsConfig) {
    return {};
  }

  return {
    plugins: [getTypescriptWorkerPlugin(wco, resolve(wco.root, webWorkerTsConfig))],
  };
}
