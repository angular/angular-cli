/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { type Builder, createBuilder } from '../src';

const builder: Builder<{}> = createBuilder(() => ({
  success: false,
  error: 'False builder always errors.',
}));

export default builder;
