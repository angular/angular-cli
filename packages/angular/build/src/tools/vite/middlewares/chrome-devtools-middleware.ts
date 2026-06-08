/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Connect } from 'vite';

type DevToolsJson = {
  workspace: {
    root: string;
    uuid: string;
  };
};

const CHROME_DEVTOOLS_ROUTE = '/.well-known/appspecific/com.chrome.devtools.json';

export function createChromeDevtoolsMiddleware(
  cacheDir: string,
  projectRoot: string,
): Connect.NextHandleFunction {
  let devtoolsConfig: string | undefined;
  const devtoolsConfigPath = join(cacheDir, 'com.chrome.devtools.json');

  return function chromeDevtoolsMiddleware(req, res, next) {
    if (req.url !== CHROME_DEVTOOLS_ROUTE) {
      next();

      return;
    }

    if (!devtoolsConfig) {
      // We store the UUID and re-use it to ensure Chrome does not repeatedly ask for permissions when restarting the dev server.
      try {
        devtoolsConfig = readFileSync(devtoolsConfigPath, 'utf-8');

        const devtoolsConfigJson: DevToolsJson = JSON.parse(devtoolsConfig);
        assert.equal(projectRoot, devtoolsConfigJson?.workspace.root);
      } catch {
        const devtoolsConfigJson: DevToolsJson = {
          workspace: {
            root: projectRoot,
            uuid: randomUUID(),
          },
        };

        devtoolsConfig = JSON.stringify(devtoolsConfigJson, undefined, 2);

        try {
          mkdirSync(cacheDir, { recursive: true });
          writeFileSync(devtoolsConfigPath, devtoolsConfig);
        } catch {}
      }
    }

    res.setHeader('Content-Type', 'application/json');
    res.end(devtoolsConfig);
  };
}
