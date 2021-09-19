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

export interface WorkerSetupArgs {
  indexFile: string;
  deployUrl: string;
  inlineCriticalCss: boolean;
  minifyCss: boolean;
}

export interface RenderResult {
  errors?: string[];
  warnings?: string[];
}

let workerArgs: WorkerSetupArgs;
let inlineCriticalCssProcessor: InlineCriticalCssProcessor | undefined;

export function setup(options: WorkerSetupArgs): void {
  workerArgs = options;
  if (workerArgs.inlineCriticalCss) {
    inlineCriticalCssProcessor = new InlineCriticalCssProcessor({
      deployUrl: workerArgs.deployUrl,
      minify: workerArgs.minifyCss,
    });
  }
}

/**
 * Renders each route in routes and writes them to <outputPath>/<route>/index.html.
 */
export async function render(
  outputPath: string,
  serverBundlePath: string,
  route: string,
): Promise<RenderResult> {
  const result = {} as RenderResult;
  const browserIndexOutputPath = path.join(outputPath, workerArgs.indexFile);
  const outputFolderPath = path.join(outputPath, route);
  const outputIndexPath = path.join(outputFolderPath, 'index.html');

  const { renderModule, AppServerModule } = await import(serverBundlePath);

  const indexBaseName = fs.existsSync(path.join(outputPath, 'index.original.html'))
    ? 'index.original.html'
    : workerArgs.indexFile;
  const browserIndexInputPath = path.join(outputPath, indexBaseName);
  let indexHtml = await fs.promises.readFile(browserIndexInputPath, 'utf8');
  indexHtml = indexHtml.replace(
    '</html>',
    '<!-- This page was prerendered with Angular Universal -->\n</html>',
  );
  if (workerArgs.inlineCriticalCss) {
    // Workaround for https://github.com/GoogleChromeLabs/critters/issues/64
    indexHtml = indexHtml.replace(
      / media=\"print\" onload=\"this\.media='all'"><noscript><link .+?><\/noscript>/g,
      '>',
    );
  }

  let html = await renderModule(AppServerModule, {
    document: indexHtml,
    url: route,
  });

  if (inlineCriticalCssProcessor) {
    const { content, warnings, errors } = await inlineCriticalCssProcessor.process(html, {
      outputPath,
    });
    result.errors = errors;
    result.warnings = warnings;
    html = content;
  }

  // This case happens when we are prerendering "/".
  if (browserIndexOutputPath === outputIndexPath) {
    const browserIndexOutputPathOriginal = path.join(outputPath, 'index.original.html');
    fs.renameSync(browserIndexOutputPath, browserIndexOutputPathOriginal);
  }

  fs.mkdirSync(outputFolderPath, { recursive: true });
  fs.writeFileSync(outputIndexPath, html);

  return result;
}
