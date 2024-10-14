/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { Connect } from 'vite';

const ANGULAR_COMPONENT_PREFIX = '/@ng/component';

export function createAngularComponentMiddleware(
  templateUpdates: ReadonlyMap<string, string>,
): Connect.NextHandleFunction {
  return function angularComponentMiddleware(req, res, next) {
    if (req.url === undefined || res.writableEnded) {
      return;
    }

    if (!req.url.startsWith(ANGULAR_COMPONENT_PREFIX)) {
      next();

      return;
    }

    const requestUrl = new URL(req.url, 'http://localhost');
    const componentId = requestUrl.searchParams.get('c');
    if (!componentId) {
      res.statusCode = 400;
      res.end();

      return;
    }

    const updateCode = templateUpdates.get(componentId) ?? '';

    res.setHeader('Content-Type', 'text/javascript');
    res.setHeader('Cache-Control', 'no-cache');
    res.end(updateCode);
  };
}
