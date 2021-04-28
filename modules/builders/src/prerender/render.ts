/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { ɵInlineCriticalCssProcessor as InlineCriticalCssProcessor } from '@nguniversal/common/engine';
import * as fs from 'fs';
import * as path from 'path';

const [
  indexHtml,
  indexFile,
  serverBundlePath,
  browserOutputPath,
  deployUrl,
  inlineCritialCss,
  minifyCss,
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
  if (!process.send) {
    throw new Error('Process must be spawned with an IPC channel.');
  }

  const browserIndexOutputPath = path.join(browserOutputPath, indexFile);
  let inlineCriticalCssProcessor: InlineCriticalCssProcessor | undefined;

  if (inlineCritialCss === 'true') {
    inlineCriticalCssProcessor = new InlineCriticalCssProcessor({
      deployUrl,
      minify: minifyCss === 'true',
    });
  }

  for (const route of routes) {
    const outputFolderPath = path.join(browserOutputPath, route);
    const outputIndexPath = path.join(outputFolderPath, 'index.html');

    try {
      const { renderModuleFn, AppServerModuleDef } = await getServerBundle(serverBundlePath);

      let html = await renderModuleFn(AppServerModuleDef, {
        document: indexHtml,
        url: route,
      });

      if (inlineCriticalCssProcessor) {
        const { content, warnings, errors } = await inlineCriticalCssProcessor.process(html, {
          outputPath: browserOutputPath,
        });

        // tslint:disable-next-line: no-non-null-assertion
        warnings?.forEach(message => process.send!({ logLevel: 'warn', message }));
        // tslint:disable-next-line: no-non-null-assertion
        errors?.forEach(message => process.send!({ logLevel: 'error', message }));
        html = content;
      }

      // This case happens when we are prerendering "/".
      if (browserIndexOutputPath === outputIndexPath) {
        const browserIndexOutputPathOriginal = path.join(browserOutputPath, 'index.original.html');
        fs.renameSync(browserIndexOutputPath, browserIndexOutputPathOriginal);
      }

      fs.mkdirSync(outputFolderPath, { recursive: true });
      fs.writeFileSync(outputIndexPath, html);

      process.send({ success: true, outputIndexPath });
    } catch (e) {
      process.send({ success: false, error: e.message, outputIndexPath });

      return;
    }
  }
})();
