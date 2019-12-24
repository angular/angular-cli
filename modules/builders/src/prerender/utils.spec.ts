/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as fs from 'fs';
import { getRoutes } from './utils';

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
});
