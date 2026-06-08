/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { BuilderOutput } from '@angular-devkit/architect';

/**
 * @experimental Direct usage of this type is considered experimental.
 */
export interface DevServerBuilderOutput extends BuilderOutput {
  baseUrl: string;
  port?: number;
  address?: string;
}
