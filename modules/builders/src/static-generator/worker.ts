/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { loadEsmModule } from '../utils/utils';

export interface RenderOptions {
  inlineCriticalCss?: boolean;
  outputPath: string;
  route: string;
  port: number;
}

export async function render({
  inlineCriticalCss,
  outputPath,
  route,
  port,
}: RenderOptions): Promise<void> {
  const { Engine } = await loadEsmModule<typeof import('@nguniversal/common/clover/server')>(
    '@nguniversal/common/clover/server',
  );

  const html = await new Engine().render({
    publicPath: outputPath,
    inlineCriticalCss: inlineCriticalCss,
    url: `http://localhost:${port}/${route}`,
  });

  // This case happens when we are prerendering "/".
  const outputFolderPath = join(outputPath, route);
  const outputIndexPath = join(outputFolderPath, 'index.html');
  if (route === '/') {
    const browserIndexOutputPathOriginal = join(outputPath, 'index-ssr.html');
    await fs.rename(outputIndexPath, browserIndexOutputPathOriginal);
  }

  await fs.mkdir(outputFolderPath, { recursive: true });
  await fs.writeFile(outputIndexPath, html);
}
