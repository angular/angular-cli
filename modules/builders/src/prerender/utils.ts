/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext, targetFromTargetString } from '@angular-devkit/architect';
import { BrowserBuilderOptions } from '@angular-devkit/build-angular';
import * as fs from 'fs';
import { parseAngularRoutes } from 'guess-parser';
import * as os from 'os';
import * as path from 'path';

import { PrerenderBuilderOptions } from './models';

/**
 * Returns the union of routes, the contents of routesFile if given,
 * and the static routes extracted if guessRoutes is set to true.
 */
export async function getRoutes(
  options: PrerenderBuilderOptions,
  context: BuilderContext,
): Promise<string[]> {
  let routes = options.routes || [];

  if (options.routesFile) {
    const routesFilePath = path.resolve(context.workspaceRoot, options.routesFile);
    routes = routes.concat(
      fs.readFileSync(routesFilePath, 'utf8')
        .split(/\r?\n/)
        .filter(v => !!v)
    );
  }

  if (options.guessRoutes) {
    const browserTarget = targetFromTargetString(options.browserTarget);
    const { tsConfig } = await context.getTargetOptions(browserTarget);
    if (typeof tsConfig === 'string') {
      try {
        routes = routes.concat(
          parseAngularRoutes(path.join(context.workspaceRoot, tsConfig))
            .map(routeObj => routeObj.path)
            .filter(route => !route.includes('*') && !route.includes(':'))
        );
      } catch (e) {
        context.logger.error('Unable to extract routes from application.', e);
      }
    }
  }

  return [...new Set(routes)];
}

/**
 * Evenly shards items in an array.
 * e.g. shardArray([1, 2, 3, 4], 2) => [[1, 2], [3, 4]]
 */
export function shardArray<T>(items: T[], maxNoOfShards = (os.cpus().length - 1) || 1): T[][] {
  const shardedArray = [];
  const numShards = Math.min(maxNoOfShards, items.length);
  for (let i = 0; i < numShards; i++) {
    shardedArray.push(
      items.filter((_, index) => index % numShards === i)
    );
  }

  return shardedArray;
}

/**
 * Returns the name of the index file outputted by the browser builder.
 */
export function getIndexOutputFile(options: BrowserBuilderOptions): string {
  if (typeof options.index === 'string') {
    return path.basename(options.index);
  } else {
    return options.index.output || 'index.html';
  }
}
