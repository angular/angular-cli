/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { externalSchematic } from '@angular-devkit/schematics';
import { Schema as SSROptions } from './schema';

export default (options: SSROptions) => externalSchematic('@schematics/angular', 'ssr', options);
