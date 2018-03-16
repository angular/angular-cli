/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonObject } from '@angular-devkit/core';
import { TaskConfiguration, TaskConfigurationGenerator } from '../../src';
import { TslintFixName, TslintFixTaskOptions, TslintFixTaskOptionsBase } from './options';


export class TslintFixTask implements TaskConfigurationGenerator<TslintFixTaskOptions> {
  constructor(config: JsonObject, options: TslintFixTaskOptionsBase);
  constructor(path: string, options: TslintFixTaskOptionsBase);
  constructor(
    protected _configOrPath: string | JsonObject,
    protected _options: TslintFixTaskOptionsBase,
  ) {}

  toConfiguration(): TaskConfiguration<TslintFixTaskOptions> {
    const options = {
      ...this._options,
      ...((typeof this._configOrPath == 'string'
        ? { tslintPath: this._configOrPath }
        : { tslintConfig: this._configOrPath })),
    };

    return { name: TslintFixName, options };
  }
}
