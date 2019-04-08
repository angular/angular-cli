/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { join, normalize, virtualFs } from '@angular-devkit/core';
import { take, tap } from 'rxjs/operators';
import { BrowserBuilderOutput } from '../../src/browser';
import { createArchitect, host } from '../utils';


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
    expect(content).toMatch(/AppServerModuleNgFactory/);

    await run.stop();
  });

  it('supports sourcemaps', async () => {
    const overrides = { sourceMap: true };

    const run = await architect.scheduleTarget(target, overrides);
    const output = await run.result as BrowserBuilderOutput;
    expect(output.success).toBe(true);

    const fileName = join(outputPath, 'main.js');
    const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
    expect(content).toMatch(/AppServerModuleNgFactory/);
    expect(host.scopedSync().exists(join(outputPath, 'main.js.map'))).toBeTruthy();

    await run.stop();
  });

  it('supports scripts only sourcemaps', async () => {
    host.writeMultipleFiles({
      'src/app/app.component.css': `p { color: red; }`,
    });

    const run = await architect.scheduleTarget(target, {
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
  //
  it('supports component styles sourcemaps', async () => {
    const overrides = {
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
        expect(content).toMatch(/AppServerModuleNgFactory/);
      }),
      take(1),
    ).toPromise();

    await run.stop();
  });
});
