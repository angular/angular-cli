/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Architect } from '@angular-devkit/architect';
import * as path from 'path';
import { browserBuild, createArchitect, host, veEnabled } from '../utils';

describe('Browser Builder external source map', () => {
  const target = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  it('works', async () => {
    const overrides = {
      sourceMap: {
        scripts: true,
        styles: true,
        vendor: true,
      },
    };

    const { files } = await browserBuild(architect, host, target, overrides);
    const sourcePaths: string[] = JSON.parse(await files['vendor.js.map']).sources;
    const hasTsSourcePaths = sourcePaths.some(p => path.extname(p) == '.ts');
    expect(hasTsSourcePaths).toBe(true, `vendor.js.map should have '.ts' extentions`);
  });

  it(`works when using deprecated 'vendorSourceMap'`, async () => {
    const overrides = {
      sourceMap: {
        scripts: true,
        styles: true,
      },
      vendorSourceMap: true,
    };

    const { files } = await browserBuild(architect, host, target, overrides);
    const sourcePaths: string[] = JSON.parse(await files['vendor.js.map']).sources;
    const hasTsSourcePaths = sourcePaths.some(p => path.extname(p) == '.ts');
    expect(hasTsSourcePaths).toBe(true, `vendor.js.map should have '.ts' extentions`);
  });

  it('does not map sourcemaps from external library when disabled', async () => {
    const overrides = {
      sourceMap: {
        scripts: true,
        styles: true,
        vendor: false,
      },
    };

    const { files } = await browserBuild(architect, host, target, overrides);
    const sourcePaths: string[] = JSON.parse(await files['vendor.js.map']).sources;
    const hasTsSourcePaths = sourcePaths.some(p => path.extname(p) == '.ts');
    expect(hasTsSourcePaths).toBe(false, `vendor.js.map not should have '.ts' extentions`);
  });
});
