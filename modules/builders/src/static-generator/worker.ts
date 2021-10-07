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

export interface WorkerSetupArgs {
  inlineCriticalCss?: boolean;
}

let sharedOptions: WorkerSetupArgs;

export function setup(options: WorkerSetupArgs): void {
  sharedOptions = options;
}

export async function render(options: {
  outputPath: string;
  route: string;
  port: number;
}): Promise<void> {
  const { outputPath, route, port } = options;

  const { Engine } = await loadEsmModule<typeof import('@nguniversal/common/clover/server')>(
    '@nguniversal/common/clover/server',
  );

  const html = await new Engine().render({
    publicPath: outputPath,
    inlineCriticalCss: sharedOptions.inlineCriticalCss,
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
