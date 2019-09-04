/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { getSystemPath, join, normalize, virtualFs } from '@angular-devkit/core';
import { take, tap } from 'rxjs/operators';
import { BrowserBuilderOutput } from '../../src/browser';
import { BundleDependencies } from '../../src/server/schema';
import { createArchitect, host, veEnabled } from '../utils';


describe('Server Builder', () => {
  const target = { project: 'app', target: 'server' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  const outputPath = normalize('dist-server');

  it('works (base)', async () => {
    const run = await architect.scheduleTarget(target);
    const output = await run.result as BrowserBuilderOutput;
    expect(output.success).toBe(true);

    const fileName = join(outputPath, 'main.js');
    const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));

    if (veEnabled) {
      expect(content).toMatch(/AppServerModuleNgFactory/);
    } else {
      expect(content).toMatch(/AppServerModule\.ngModuleDef/);
    }

    await run.stop();
  });

  it('should not emit polyfills', async () => {
    const run = await architect.scheduleTarget(target);
    const output = await run.result as BrowserBuilderOutput;
    expect(output.success).toBe(true);

    expect(host.fileMatchExists(getSystemPath(outputPath), /polyfills/)).not.toBeDefined();
    expect(host.fileMatchExists(getSystemPath(outputPath), /main/)).toBeDefined();

    await run.stop();
  });

  it('should not emit polyfills when ES5 support is needed', async () => {
    // the below is needed because of different code paths
    // for polyfills if differential loading is needed
    host.writeMultipleFiles({
      'browserslist': 'IE 10',
    });

    const run = await architect.scheduleTarget(target);
    const output = await run.result as BrowserBuilderOutput;
    expect(output.success).toBe(true);

    expect(host.fileMatchExists(getSystemPath(outputPath), /polyfills/)).not.toBeDefined();
    expect(host.fileMatchExists(getSystemPath(outputPath), /main/)).toBeDefined();

    await run.stop();
  });

  it('supports sourcemaps', async () => {
    const overrides = { sourceMap: true };
    const run = await architect.scheduleTarget(target, overrides);
    const output = await run.result as BrowserBuilderOutput;
    expect(output.success).toBe(true);
    expect(host.scopedSync().exists(join(outputPath, 'main.js.map'))).toBeTruthy();
    await run.stop();
  });

  it('supports scripts only sourcemaps', async () => {
    host.writeMultipleFiles({
      'src/app/app.component.css': `p { color: red; }`,
    });

    const run = await architect.scheduleTarget(target, {
      bundleDependencies: BundleDependencies.None,
      sourceMap: {
        styles: false,
        scripts: true,
      },
    });
    const output = await run.result as BrowserBuilderOutput;
    expect(output.success).toBe(true);

    expect(host.scopedSync().exists(join(outputPath, 'main.js.map'))).toBe(true);

    const scriptContent = virtualFs.fileBufferToString(
      host.scopedSync().read(join(outputPath, 'main.js')),
    );
    expect(scriptContent).toContain('sourceMappingURL=main.js.map');
    expect(scriptContent).not.toContain('sourceMappingURL=data:application/json');

    await run.stop();
  });

  it('supports component styles sourcemaps', async () => {
    const overrides = {
      bundleDependencies: BundleDependencies.None,
      sourceMap: {
        styles: true,
        scripts: true,
      },
    };

    host.writeMultipleFiles({
      'src/app/app.component.css': `p { color: red; }`,
    });

    const run = await architect.scheduleTarget(target, overrides);
    const output = await run.result as BrowserBuilderOutput;
    expect(output.success).toBe(true);

    expect(host.scopedSync().exists(join(outputPath, 'main.js.map'))).toBe(true);

    const scriptContent = virtualFs.fileBufferToString(
      host.scopedSync().read(join(outputPath, 'main.js')),
    );
    expect(scriptContent).toContain('sourceMappingURL=main.js.map');
    expect(scriptContent).toContain('sourceMappingURL=data:application/json');

    await run.stop();
  });

  it('runs watch mode', async () => {
    const overrides = { watch: true };

    const run = await architect.scheduleTarget(target, overrides);

    await run.output.pipe(
      tap((buildEvent) => {
        expect(buildEvent.success).toBe(true);

        const fileName = join(outputPath, 'main.js');
        const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
        if (veEnabled) {
          expect(content).toMatch(/AppServerModuleNgFactory/);
        } else {
          expect(content).toMatch(/AppServerModule\.ngModuleDef/);
        }
      }),
      take(1),
    ).toPromise();

    await run.stop();
  });
});
