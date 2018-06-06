/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonObject } from '@angular-devkit/core';

export const TslintFixName = 'tslint-fix';

export interface TslintFixTaskOptionsBase {
  silent?: boolean;
  format?: string;
  tsConfigPath?: string;

  ignoreErrors?: boolean;

  includes?: string | string[];
}

export interface TslintFixTaskOptionsPath extends TslintFixTaskOptionsBase {
  tslintPath: string;
  tslintConfig?: never;
}

export interface TslintFixTaskOptionsConfig extends TslintFixTaskOptionsBase {
  tslintPath?: never;
  tslintConfig: JsonObject;
}

export type TslintFixTaskOptions = TslintFixTaskOptionsPath | TslintFixTaskOptionsConfig;
