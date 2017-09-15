/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { benchmark } from '@_/benchmark';
import { join, normalize } from './path';


const p1 = '/b/././a/tt/../../../a/b/./d/../c';
const p2 = '/a/tt/../../../a/b/./d';


describe('Virtual FS Path', () => {
  benchmark('normalize', () => normalize(p1));
  benchmark('join', () => join(normalize(p1), normalize(p2)));
});
