/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import * as path from 'path';
import { browserBuild, createArchitect, host } from '../../../testing/test-utils';

// Following the naming conventions from
// https://sourcemaps.info/spec.html#h.ghqpj1ytqjbm
const IGNORE_LIST = 'x_google_ignoreList';

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
    const hasTsSourcePaths = sourcePaths.some((p) => path.extname(p) == '.ts');
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
    const hasTsSourcePaths = sourcePaths.some((p) => path.extname(p) == '.ts');
    expect(hasTsSourcePaths).toBe(false, `vendor.js.map not should have '.ts' extentions`);
  });
});

describe('Identifying third-party code in source maps', () => {
  interface SourceMap {
    sources: string[];
    [IGNORE_LIST]: number[];
  }

  const target = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  it('specifies which sources are third party when vendor processing is disabled', async () => {
    const overrides = {
      sourceMap: {
        scripts: true,
        vendor: false,
      },
    };

    const { files } = await browserBuild(architect, host, target, overrides);
    const mainMap: SourceMap = JSON.parse(await files['main.js.map']);
    const polyfillsMap: SourceMap = JSON.parse(await files['polyfills.js.map']);
    const runtimeMap: SourceMap = JSON.parse(await files['runtime.js.map']);
    const vendorMap: SourceMap = JSON.parse(await files['vendor.js.map']);

    expect(mainMap[IGNORE_LIST]).not.toBeUndefined();
    expect(polyfillsMap[IGNORE_LIST]).not.toBeUndefined();
    expect(runtimeMap[IGNORE_LIST]).not.toBeUndefined();
    expect(vendorMap[IGNORE_LIST]).not.toBeUndefined();

    expect(mainMap[IGNORE_LIST].length).toEqual(0);
    expect(polyfillsMap[IGNORE_LIST].length).not.toEqual(0);
    expect(runtimeMap[IGNORE_LIST].length).not.toEqual(0);
    expect(vendorMap[IGNORE_LIST].length).not.toEqual(0);

    const thirdPartyInMain = mainMap.sources.some((s) => s.includes('node_modules'));
    const thirdPartyInPolyfills = polyfillsMap.sources.some((s) => s.includes('node_modules'));
    const thirdPartyInRuntime = runtimeMap.sources.some((s) => s.includes('webpack'));
    const thirdPartyInVendor = vendorMap.sources.some((s) => s.includes('node_modules'));
    expect(thirdPartyInMain).toBe(false, `main.js.map should not include any node modules`);
    expect(thirdPartyInPolyfills).toBe(true, `polyfills.js.map should include some node modules`);
    expect(thirdPartyInRuntime).toBe(true, `runtime.js.map should include some webpack code`);
    expect(thirdPartyInVendor).toBe(true, `vendor.js.map should include some node modules`);

    // All sources in the main map are first-party.
    expect(mainMap.sources.filter((_, i) => !mainMap[IGNORE_LIST].includes(i))).toEqual([
      './src/app/app.component.ts',
      './src/app/app.module.ts',
      './src/main.ts',
      './src/app/app.component.css',
    ]);

    // Only some sources in the polyfills map are first-party.
    expect(polyfillsMap.sources.filter((_, i) => !polyfillsMap[IGNORE_LIST].includes(i))).toEqual([
      './src/polyfills.ts',
    ]);

    // None of the sources in the runtime and vendor maps are first-party.
    expect(runtimeMap.sources.filter((_, i) => !runtimeMap[IGNORE_LIST].includes(i))).toEqual([]);
    expect(vendorMap.sources.filter((_, i) => !vendorMap[IGNORE_LIST].includes(i))).toEqual([]);
  });
});
