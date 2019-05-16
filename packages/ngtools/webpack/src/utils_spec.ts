/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { flattenArray } from './utils';

describe('@ngtools/webpack utils', () => {
  describe('flattenArray', () => {
    it('should flatten an array', () => {
      const arr = flattenArray(['module', ['browser', 'main']]);
      expect(arr).toEqual(['module', 'browser', 'main']);
    });
  });
});
