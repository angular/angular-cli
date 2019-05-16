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
  protected _configOrPath: null | string | JsonObject;
  protected _options: TslintFixTaskOptionsBase;

  constructor(config: JsonObject, options: TslintFixTaskOptionsBase);
  constructor(options: TslintFixTaskOptionsBase);
  constructor(path: string, options: TslintFixTaskOptionsBase);
  constructor(
    configOrPath: string | JsonObject | TslintFixTaskOptionsBase,
    options?: TslintFixTaskOptionsBase,
  ) {
    if (options) {
      this._configOrPath = configOrPath as string | JsonObject;
      this._options = options;
    } else {
      this._options = configOrPath as TslintFixTaskOptionsBase;
      this._configOrPath = null;
    }
  }

  toConfiguration(): TaskConfiguration<TslintFixTaskOptions> {
    const path = typeof this._configOrPath == 'string' ? { tslintPath: this._configOrPath } : {};
    const config = typeof this._configOrPath == 'object' && this._configOrPath !== null
                 ? { tslintConfig: this._configOrPath }
                 : {};
    const options = {
      ...this._options,
      ...path,
      ...config,
    };

    return { name: TslintFixName, options };
  }
}
