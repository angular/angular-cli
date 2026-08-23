/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { transform } from 'esbuild';
import { BuildOutputFileType, createOutputFile } from '../../tools/esbuild/bundler-files';
import { generateAngularServerAppManifest } from './manifest';

describe('generateAngularServerAppManifest', () => {
  it('serializes asset paths embedded in the executable manifest', async () => {
    const assetPath = "products/quote's-name/index.html";
    const chunkPath = `assets-chunks/${assetPath.replace(/[./]/g, '_')}.mjs`;
    const asset = createOutputFile(assetPath, '<html></html>', BuildOutputFileType.Browser);

    const { manifestContent } = generateAngularServerAppManifest(
      new Map([[assetPath, asset]]),
      [],
      false,
      undefined,
      undefined,
      '/',
      new Set(),
      { inputs: {}, outputs: {} },
      undefined,
    );

    expect(manifestContent).toContain(`${JSON.stringify(assetPath)}: {`);
    expect(manifestContent).toContain(`import(${JSON.stringify(`./${chunkPath}`)})`);
    expect(manifestContent).not.toContain(`'${assetPath}':`);

    const { warnings } = await transform(manifestContent);
    expect(warnings).toEqual([]);
  });
});
