/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import {
  BrowserBuildOutput,
  browserBuild,
  createArchitect,
  host,
  lazyModuleFiles,
  lazyModuleFnImport,
} from '../utils';


describe('Browser Builder Rollup Concatenation test', () => {
  const target = { project: 'app', target: 'build' };
  const overrides = {
    experimentalRollupPass: true,
    // JIT Rollup bundles will include require calls to .css and .html file, that have lost their
    // path context. AOT code already inlines resources so that's not a problem.
    aot: true,
    // Webpack can't separate rolled-up modules into chunks.
    vendorChunk: false,
    commonChunk: false,
    namedChunks: false,
  };
  const prodOverrides = {
    // Usual prod options.
    fileReplacements: [{
      replace: 'src/environments/environment.ts',
      with: 'src/environments/environment.prod.ts',
    }],
    optimization: true,
    sourceMap: false,
    extractCss: true,
    namedChunks: false,
    aot: true,
    extractLicenses: true,
    vendorChunk: false,
    buildOptimizer: true,
    // Extra prod options we need for experimentalRollupPass.
    commonChunk: false,
    // Just for convenience.
    outputHashing: 'none',
  };
  const rollupProdOverrides = {
    ...prodOverrides,
    experimentalRollupPass: true,
  };
  let architect: Architect;

  const getOutputSize = async (output: BrowserBuildOutput) =>
    (await Promise.all(
      Object.keys(output.files)
        .filter(name => name.endsWith('.js') &&
          // These aren't concatenated by Rollup so no point comparing.
          !['runtime.js', 'polyfills.js'].includes(name))
        .map(name => output.files[name]),
    ))
      .map(content => content.length)
      .reduce((acc, curr) => acc + curr, 0);

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });

  afterEach(async () => host.restore().toPromise());

  it('works', async () => {
    await browserBuild(architect, host, target, overrides);
  });

  it('works with lazy modules', async () => {
    host.writeMultipleFiles(lazyModuleFiles);
    host.writeMultipleFiles(lazyModuleFnImport);
    await browserBuild(architect, host, target, overrides);
  });

  it('creates smaller or same size bundles for app without lazy bundles', async () => {
    const prodOutput = await browserBuild(architect, host, target, prodOverrides);
    const prodSize = await getOutputSize(prodOutput);
    const rollupProdOutput = await browserBuild(architect, host, target, rollupProdOverrides);
    const rollupProd = await getOutputSize(rollupProdOutput);
    expect(prodSize).toBeGreaterThan(rollupProd);
  });

  it('creates smaller bundles for apps with lazy bundles', async () => {
    host.writeMultipleFiles(lazyModuleFiles);
    host.writeMultipleFiles(lazyModuleFnImport);
    const prodOutput = await browserBuild(architect, host, target, prodOverrides);
    const prodSize = await getOutputSize(prodOutput);
    const rollupProdOutput = await browserBuild(architect, host, target, rollupProdOverrides);
    const rollupProd = await getOutputSize(rollupProdOutput);
    expect(prodSize).toBeGreaterThan(rollupProd);
  });
});
