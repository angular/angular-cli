/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ProgressPluginOptions } from 'webpack/declarations/plugins/ProgressPlugin';
import { BuildOptions } from '../../models/build-options';

export abstract class ProgressReporter {

  protected abstract handleProgress(percentage: number, msg: string, ...args: string[]): void;

  protected baseOptions(): ProgressPluginOptions {
    return {};
  }

  public buildOptions(buildOptions: BuildOptions): ProgressPluginOptions {
    const progressPluginOptions = this.baseOptions();
    progressPluginOptions.handler = ((percentage, msg, ...args) =>
      this.handleProgress(percentage, msg, ...args));
    progressPluginOptions.profile = buildOptions.verbose;

    return progressPluginOptions;
  }

}
