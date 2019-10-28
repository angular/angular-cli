/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-big-function
import { Architect } from '@angular-devkit/architect';
import { join, normalize, virtualFs } from '@angular-devkit/core';
import { ServerBuilderOutput } from '../../src';
import { createArchitect, host } from '../utils';


describe('Server Builder styles resources output path (No emit assets)', () => {
  function writeFiles() {
    host.copyFile('src/spectrum.png', './src/assets/component-img-relative.png');
    host.copyFile('src/spectrum.png', './src/assets/component-img-absolute.png');
    host.writeMultipleFiles({
      'src/app/app.component.css': `
          h3 { background: url('/assets/component-img-absolute.png'); }
          h4 { background: url('../assets/component-img-relative.png'); }
        `,
    });
  }

  const target = { project: 'app', target: 'server' };
  let architect: Architect;

  const outputPath = normalize('dist-server');

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  it(`supports resourcesOutputPath in resource urls`, async () => {
    writeFiles();
    const overrides = {
      resourcesOutputPath: 'out-assets',
    };

    const run = await architect.scheduleTarget(target, overrides);
    const output = await run.result as ServerBuilderOutput;
    expect(output.success).toBe(true);

    const fileName = join(outputPath, 'main.js');

    const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));

    expect(content).toContain(`url('/assets/component-img-absolute.png')`);
    expect(content).toContain(`url('out-assets/component-img-relative.png')`);

    expect(host.scopedSync().exists(normalize(`${outputPath}/out-assets/component-img-relative.png`)))
      .toBe(false);
  });

  it(`supports blank resourcesOutputPath`, async () => {
    writeFiles();

    const run = await architect.scheduleTarget(target);
    const output = await run.result as ServerBuilderOutput;
    expect(output.success).toBe(true);

    const fileName = join(outputPath, 'main.js');
    const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));

    expect(content).toContain(`url('/assets/component-img-absolute.png')`);
    expect(content).toContain(`url('component-img-relative.png')`);

    expect(host.scopedSync().exists(normalize(`${outputPath}/component-img-relative.png`)))
      .toBe(false);
  });
});
