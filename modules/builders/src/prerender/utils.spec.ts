/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BrowserBuilderOptions } from '@angular-devkit/build-angular';
import { getIndexOutputFile, shardArray } from './utils';

describe('Prerender Builder Utils', () => {
  describe('#shardArray', () => {
    const ARRAY = [0, 1, 2, 3, 4];
    it('Should shard an array into numshards shards', () => {
      const result1 = shardArray(ARRAY, 1);
      const result2 = shardArray(ARRAY, 2);
      const result3 = shardArray(ARRAY, 3);
      const result4 = shardArray(ARRAY, 4);
      const result5 = shardArray(ARRAY, 5);
      expect(result1).toEqual([[0, 1, 2, 3, 4]]);
      expect(result2).toEqual([
        [0, 2, 4],
        [1, 3],
      ]);
      expect(result3).toEqual([[0, 3], [1, 4], [2]]);
      expect(result4).toEqual([[0, 4], [1], [2], [3]]);
      expect(result5).toEqual([[0], [1], [2], [3], [4]]);
    });

    it('Should handle 0 or less numshards', () => {
      const result1 = shardArray(ARRAY, 0);
      const result2 = shardArray(ARRAY, -1);
      expect(result1).toEqual([]);
      expect(result2).toEqual([]);
    });

    it('Should not shard more than the total number of items in the array', () => {
      const result = shardArray(ARRAY, 7);
      expect(result).toEqual([[0], [1], [2], [3], [4]]);
    });
  });

  describe('#getIndexOutputFile', () => {
    it('Should return only the file name when index is a string', () => {
      const options = { index: 'src/home.html' } as BrowserBuilderOptions;
      expect(getIndexOutputFile(options)).toBe('home.html');
    });

    it('Should return full file path when index is an object', () => {
      const options = {
        index: { input: 'src/index.html', output: 'src/home.html' },
      } as BrowserBuilderOptions;
      expect(getIndexOutputFile(options)).toBe('src/home.html');
    });
  });
});
