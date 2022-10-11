/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { Type } from '@angular/core';
import type * as platformServer from '@angular/platform-server';
import assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { loadEsmModule } from '../utils/utils';

export interface RenderOptions {
  indexFile: string;
  deployUrl: string;
  inlineCriticalCss: boolean;
  minifyCss: boolean;
  outputPath: string;
  serverBundlePath: string;
  route: string;
}
export interface RenderResult {
  errors?: string[];
  warnings?: string[];
}

/**
 * Renders each route in routes and writes them to <outputPath>/<route>/index.html.
 */
export async function render({
  indexFile,
  deployUrl,
  minifyCss,
  outputPath,
  serverBundlePath,
  route,
  inlineCriticalCss,
}: RenderOptions): Promise<RenderResult> {
  const result = {} as RenderResult;
  const browserIndexOutputPath = path.join(outputPath, indexFile);
  const outputFolderPath = path.join(outputPath, route);
  const outputIndexPath = path.join(outputFolderPath, 'index.html');

  const { AppServerModule, renderModule, ɵSERVER_CONTEXT } = (await import(serverBundlePath)) as {
    renderModule: typeof platformServer.renderModule | undefined;
    ɵSERVER_CONTEXT: typeof platformServer.ɵSERVER_CONTEXT | undefined;
    AppServerModule: Type<unknown> | undefined;
  };

  assert(renderModule, `renderModule was not exported from: ${serverBundlePath}.`);
  assert(AppServerModule, `AppServerModule was not exported from: ${serverBundlePath}.`);
  assert(ɵSERVER_CONTEXT, `ɵSERVER_CONTEXT was not exported from: ${serverBundlePath}.`);

  const indexBaseName = fs.existsSync(path.join(outputPath, 'index.original.html'))
    ? 'index.original.html'
    : indexFile;
  const browserIndexInputPath = path.join(outputPath, indexBaseName);
  let document = await fs.promises.readFile(browserIndexInputPath, 'utf8');

  if (inlineCriticalCss) {
    // Workaround for https://github.com/GoogleChromeLabs/critters/issues/64
    document = document.replace(
      / media="print" onload="this\.media='all'"><noscript><link .+?><\/noscript>/g,
      '>',
    );
  }

  let html = await renderModule(AppServerModule, {
    document,
    url: route,
    extraProviders: [
      {
        provide: ɵSERVER_CONTEXT,
        useValue: 'ssg',
      },
    ],
  });

  if (inlineCriticalCss) {
    const { ɵInlineCriticalCssProcessor: InlineCriticalCssProcessor } = await loadEsmModule<
      typeof import('@nguniversal/common/tools')
    >('@nguniversal/common/tools');

    const inlineCriticalCssProcessor = new InlineCriticalCssProcessor({
      deployUrl: deployUrl,
      minify: minifyCss,
    });

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
