/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as fs from 'fs';
import * as path from 'path';

const [
  indexHtml,
  indexFile,
  serverBundlePath,
  browserOutputPath,
  ...routes
] = process.argv.slice(2);

/**
 * Handles importing the server bundle.
 */
async function getServerBundle(bundlePath: string) {
  const {
    AppServerModule,
    AppServerModuleNgFactory,
    renderModule,
    renderModuleFactory,
  } = await import(bundlePath);

  if (renderModuleFactory && AppServerModuleNgFactory) {
    // Happens when in ViewEngine mode.
    return {
      renderModuleFn: renderModuleFactory,
      AppServerModuleDef: AppServerModuleNgFactory,
    };
  }

  if (renderModule && AppServerModule) {
    // Happens when in Ivy mode.
    return {
      renderModuleFn: renderModule,
      AppServerModuleDef: AppServerModule,
    };
  }

  throw new Error(`renderModule method and/or AppServerModule were not exported from: ${serverBundlePath}.`);
}

/**
 * Renders each route in routes and writes them to <outputPath>/<route>/index.html.
 */
// tslint:disable-next-line: no-floating-promises
(async () => {
  const browserIndexOutputPath = path.join(browserOutputPath, indexFile);
  for (const route of routes) {
    const outputFolderPath = path.join(browserOutputPath, route);
    const outputIndexPath = path.join(outputFolderPath, 'index.html');

    try {
      const { renderModuleFn, AppServerModuleDef } = await getServerBundle(serverBundlePath);

      const html = await renderModuleFn(AppServerModuleDef, {
        document: indexHtml + '<!-- This page was prerendered with Angular Universal -->',
        url: route,
      });

      fs.mkdirSync(outputFolderPath, { recursive: true });
      fs.writeFileSync(outputIndexPath, html);

      // This case happens when we are prerendering "/".
      if (browserIndexOutputPath === outputIndexPath) {
        const browserIndexOutputPathOriginal = path.join(browserOutputPath, 'index.original.html');
        fs.writeFileSync(browserIndexOutputPathOriginal, indexHtml);
      }

      if (process.send) {
        process.send({ success: true, outputIndexPath });
      }
    } catch (e) {
      if (process.send) {
        process.send({ success: false, error: e.message, outputIndexPath });
      }

      return;
    }
  }
})();
