/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { of } from 'rxjs';
import { createBuilder } from '../src/index2';

export default createBuilder(() => of({
  success: false,
  error: 'False builder always errors.',
}));
