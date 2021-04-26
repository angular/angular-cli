/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { JsonObject } from '@angular-devkit/core';

/** @deprecated since version 11. Use `ng lint --fix` directly instead. */
export const TslintFixName = 'tslint-fix';

/** @deprecated since version 11. Use `ng lint --fix` directly instead. */
export interface TslintFixTaskOptionsBase {
  silent?: boolean;
  format?: string;
  tsConfigPath?: string;

  ignoreErrors?: boolean;

  includes?: string | string[];
  files?: string | string[];

  tslintPath?: string;
  tslintConfig?: JsonObject;
}

/** @deprecated since version 11. Use `ng lint --fix` directly instead. */
export type TslintFixTaskOptions = TslintFixTaskOptionsBase;
