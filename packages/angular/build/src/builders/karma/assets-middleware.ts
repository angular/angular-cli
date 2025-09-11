/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { InlinePluginDef } from 'karma';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import type { ResultFile } from '../application/results';

const isWindows = process.platform === 'win32';

interface ServeFileFunction {
  (
    filepath: string,
    rangeHeader: string | string[] | undefined,
    response: ServerResponse,
    transform?: (c: string | Uint8Array) => string | Uint8Array,
    content?: string | Uint8Array,
    doNotCache?: boolean,
  ): void;
}

export interface LatestBuildFiles {
  files: Record<string, ResultFile | undefined>;
}

const LATEST_BUILD_FILES_TOKEN = 'angularLatestBuildFiles';

export class AngularAssetsMiddleware {
  static readonly $inject = ['serveFile', LATEST_BUILD_FILES_TOKEN];

  static readonly NAME = 'angular-test-assets';

  constructor(
    private readonly serveFile: ServeFileFunction,
    private readonly latestBuildFiles: LatestBuildFiles,
  ) {}

  handle(req: IncomingMessage, res: ServerResponse, next: (err?: unknown) => unknown): void {
    const url = new URL(`http://${req.headers['host'] ?? ''}${req.url ?? ''}`);
    // Remove the leading slash from the URL path and convert to platform specific.
    // The latest build files will use the platform path separator.
    let pathname = url.pathname.slice(1);
    if (isWindows) {
      pathname = pathname.replaceAll(path.posix.sep, path.win32.sep);
    }

    const file = this.latestBuildFiles.files[pathname];
    if (!file) {
      next();

      return;
    }

    // Implementation of serverFile can be found here:
    // https://github.com/karma-runner/karma/blob/84f85e7016efc2266fa6b3465f494a3fa151c85c/lib/middleware/common.js#L10
    switch (file.origin) {
      case 'disk':
        this.serveFile(file.inputPath, undefined, res, undefined, undefined, /* doNotCache */ true);
        break;
      case 'memory':
        // Include pathname to help with Content-Type headers.
        this.serveFile(
          `/unused/${url.pathname}`,
          undefined,
          res,
          undefined,
          file.contents,
          /* doNotCache */ false,
        );
        break;
    }
  }

  static createPlugin(initialFiles: LatestBuildFiles): InlinePluginDef {
    return {
      [LATEST_BUILD_FILES_TOKEN]: ['value', { files: { ...initialFiles.files } }],

      [`middleware:${AngularAssetsMiddleware.NAME}`]: [
        'factory',
        Object.assign((...args: ConstructorParameters<typeof AngularAssetsMiddleware>) => {
          const inst = new AngularAssetsMiddleware(...args);

          return inst.handle.bind(inst);
        }, AngularAssetsMiddleware),
      ],
    };
  }
}
