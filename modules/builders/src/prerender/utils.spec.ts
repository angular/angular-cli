/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext } from '@angular-devkit/architect';
import { BrowserBuilderOptions } from '@angular-devkit/build-angular';
import { logging } from '@angular-devkit/core';
import * as fs from 'fs';
import * as guessParser from 'guess-parser';

import { PrerenderBuilderOptions } from './models';
import { getIndexOutputFile, getRoutes, shardArray } from './utils';

describe('Prerender Builder Utils', () => {
  describe('#getRoutes', () => {
    const ROUTES_FILE = './routes.txt';
    const ROUTES_FILE_CONTENT = ['/route1', '/route1', '/route2', '/route3'].join('\n');
    const ROUTES = ['/route3', '/route3', '/route4'];
    const GUESSED_ROUTES: any = [
      { path: '/route4' },
      { path: '/route5' },
      { path: '/**' },
      { path: '/user/:id' },
    ];

    const TSCONFIG_PATH = 'tsconfig.app.json';
    const CONTEXT = {
      workspaceRoot: '/path/to/angular/json',
      logger: new logging.NullLogger(),
    } as unknown as BuilderContext;

    let parseAngularRoutesSpy: jasmine.Spy;
    let loggerErrorSpy: jasmine.Spy;

    beforeEach(() => {
      spyOn(fs, 'readFileSync').and.returnValue(ROUTES_FILE_CONTENT);
      parseAngularRoutesSpy = spyOn(guessParser, 'parseAngularRoutes').and.returnValue(
        GUESSED_ROUTES,
      );
      loggerErrorSpy = spyOn(CONTEXT.logger, 'error');
    });

    // eslint-disable-next-line max-len
    it('Should return the union of the routes from routes, routesFile, and the extracted routes without any parameterized routes', async () => {
      const options = {
        routes: ROUTES,
        routesFile: ROUTES_FILE,
        guessRoutes: true,
      } as PrerenderBuilderOptions;
      const routes = await getRoutes(options, TSCONFIG_PATH, CONTEXT);
      expect(routes).toEqual(
        jasmine.arrayContaining(['/route1', '/route2', '/route3', '/route4', '/route5']),
      );
    });

    it('Should return only the given routes', async () => {
      const options = { routes: ROUTES } as PrerenderBuilderOptions;
      const routes = await getRoutes(options, TSCONFIG_PATH, CONTEXT);
      expect(routes).toEqual(jasmine.arrayContaining(['/route3', '/route4']));
    });

    it('Should return the routes from the routesFile', async () => {
      const options = { routesFile: ROUTES_FILE } as PrerenderBuilderOptions;
      const routes = await getRoutes(options, TSCONFIG_PATH, CONTEXT);
      expect(routes).toEqual(jasmine.arrayContaining(['/route1', '/route2', '/route3']));
    });

    it('Should catch errors thrown by parseAngularRoutes', async () => {
      const options = { routes: ROUTES, guessRoutes: true } as PrerenderBuilderOptions;
      parseAngularRoutesSpy.and.throwError('Test Error');
      const routes = await getRoutes(options, TSCONFIG_PATH, CONTEXT);
      expect(routes).toEqual(jasmine.arrayContaining(['/route3', '/route4']));
      expect(loggerErrorSpy).toHaveBeenCalled();
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
