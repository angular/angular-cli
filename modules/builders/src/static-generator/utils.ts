/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext } from '@angular-devkit/architect';
import { BrowserBuilderOptions } from '@angular-devkit/build-angular';
import * as fs from 'fs';
import { parseAngularRoutes } from 'guess-parser';
import * as path from 'path';
import { Schema as PrerenderBuilderOptions } from './schema';

/**
 * Returns the union of routes, the contents of routesFile if given,
 * and the static routes extracted if guessRoutes is set to true.
 */
export async function getRoutes(
  options: PrerenderBuilderOptions,
  tsConfigPath: string | undefined,
  context: BuilderContext,
): Promise<string[]> {
  const { routes = [] } = options;
  const { logger, workspaceRoot } = context;
  if (options.routesFile) {
    const routesFilePath = path.join(workspaceRoot, options.routesFile);
    routes.push(
      ...fs
        .readFileSync(routesFilePath, 'utf8')
        .split(/\r?\n/)
        .filter((v) => !!v),
    );
  }

  if (options.guessRoutes && tsConfigPath) {
    try {
      routes.push(
        ...parseAngularRoutes(path.join(workspaceRoot, tsConfigPath))
          .map((routeObj) => routeObj.path)
          .filter((route) => !route.includes('*') && !route.includes(':')),
      );
    } catch (e) {
      logger.error('Unable to extract routes from application.', e);
    }
  }

  return [...routes.map((r) => (r === '' ? '/' : r))];
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
