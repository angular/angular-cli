/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as fs from 'fs';
import { getRoutes, shardArray } from './utils';

describe('Prerender Builder Utils', () => {
  describe('#getRoutes', () => {
    const WORKSPACE_ROOT = '/path/to/angular/json';
    const ROUTES_FILE = './routes.txt';
    const ROUTES_FILE_CONTENT = ['/route1', '/route1', '/route2', '/route3'].join('\n');
    const ROUTES = ['/route3', '/route3', '/route4'];

    beforeEach(() => {
      spyOn(fs, 'readFileSync').and.returnValue(ROUTES_FILE_CONTENT);
    });

    it('Should return the deduped union of options.routes and options.routesFile - routes and routesFile defined', () => {
      const routes = getRoutes(WORKSPACE_ROOT, ROUTES_FILE, ROUTES);
      expect(routes).toEqual(['/route1', '/route2', '/route3', '/route4']);
    });

    it('Should return the deduped union of options.routes and options.routesFile - only routes defined', () => {
      const routes = getRoutes(WORKSPACE_ROOT, undefined, ROUTES);
      expect(routes).toEqual(['/route3', '/route4']);
    });

    it('Should return the deduped union of options.routes and options.routesFile - only routes file defined', () => {
      const routes = getRoutes(WORKSPACE_ROOT, ROUTES_FILE, undefined);
      expect(routes).toEqual(['/route1', '/route2', '/route3']);
    });
  });

  describe('#shardArray', () => {
    const ARRAY = [0, 1, 2, 3, 4];
    it('Should shard an array into numshards shards', () => {
      const result1 = shardArray(ARRAY, 1);
      const result2 = shardArray(ARRAY, 2);
      const result3 = shardArray(ARRAY, 3);
      const result4 = shardArray(ARRAY, 4);
      const result5 = shardArray(ARRAY, 5);
      expect(result1).toEqual([[0, 1, 2, 3, 4]]);
      expect(result2).toEqual([[0, 2, 4], [1, 3]]);
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
});
