/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { Connect } from 'vite' with {
  'resolution-mode': 'import',
};
import type { ManualRebuildController } from '../../../utils/manual-rebuild';

/**
 * The development server route used to request a rebuild when manual rebuild mode is enabled.
 */
export const REBUILD_ROUTE = '/__ng_rebuild';

/**
 * Creates a middleware that triggers a rebuild of all pending file changes when a `POST` request
 * is sent to {@link REBUILD_ROUTE}. The response is sent once the rebuild has completed and contains
 * a JSON object with the outcome of the rebuild (e.g., `{ "status": "success" }`).
 *
 * @param controller The controller used to request rebuilds.
 * @returns A Connect middleware function.
 */
export function createAngularRebuildMiddleware(
  controller: ManualRebuildController,
): Connect.NextHandleFunction {
  return function angularRebuildMiddleware(req, res, next) {
    const pathname = req.url?.split('?', 1)[0];
    if (pathname !== REBUILD_ROUTE) {
      next();

      return;
    }

    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Allow', 'POST');
      res.end();

      return;
    }

    // Reject cross-origin requests made by browsers to prevent arbitrary web pages from
    // triggering rebuilds. Non-browser clients (e.g., curl or tooling) do not send an origin.
    if (!isSameOrigin(req.headers.origin, req.headers.host)) {
      res.statusCode = 403;
      res.end();

      return;
    }

    controller.requestRebuild().then(
      (result) => {
        res.statusCode = result.status === 'cancelled' ? 503 : 200;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify(result));
      },
      (error) => next(error),
    );
  };
}

function isSameOrigin(origin: string | undefined, host: string | undefined): boolean {
  if (origin === undefined) {
    return true;
  }

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
