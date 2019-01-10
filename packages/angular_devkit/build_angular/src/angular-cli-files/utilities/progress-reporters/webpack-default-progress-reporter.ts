/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { ProgressPluginOptions } from 'webpack/declarations/plugins/ProgressPlugin';
import { BuildOptions } from '../../models/build-options';
import { ProgressReporter } from './progress-reporter';

export class WebpackDefaultProgressReporter extends ProgressReporter {

  constructor() {
    super();
  }

  protected handleProgress(percentage: number, msg: string, ...args: string[]): void {
    throw new Error('This method is not to be called');
  }

  public buildOptions(buildOptions: BuildOptions): ProgressPluginOptions {
    const progressPluginOptions = super.buildOptions(buildOptions);
    // Reset handler to undefined, this will cause ProgressPlugin to use it's default handler
    progressPluginOptions.handler = undefined;

    return progressPluginOptions;
  }

}
