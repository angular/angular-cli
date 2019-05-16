/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-big-function
import { Architect } from '@angular-devkit/architect';
import { normalize } from '@angular-devkit/core';
import { browserBuild, createArchitect, host } from '../utils';


describe('Browser Builder styles resources output path', () => {
  const imgSvg = `
    <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="40" stroke="green" stroke-width="4" fill="yellow" />
    </svg>
  `;

  function writeFiles() {
    // Use a large image for the relative ref so it cannot be inlined.
    host.copyFile('src/spectrum.png', './src/assets/global-img-relative.png');
    host.copyFile('src/spectrum.png', './src/assets/component-img-relative.png');
    host.writeMultipleFiles({
      'src/styles.css': `
          h1 { background: url('/assets/global-img-absolute.svg'); }
          h2 { background: url('./assets/global-img-relative.png'); }
        `,
      'src/app/app.component.css': `
          h3 { background: url('/assets/component-img-absolute.svg'); }
          h4 { background: url('../assets/component-img-relative.png'); }
        `,
      'src/assets/global-img-absolute.svg': imgSvg,
      'src/assets/component-img-absolute.svg': imgSvg,
    });
  }

  const target = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  it(`supports resourcesOutputPath in resource urls`, async () => {
    writeFiles();
    // Check base paths are correctly generated.
    const overrides = {
      aot: true,
      extractCss: true,
      resourcesOutputPath: 'out-assets',
    };

    const { files } = await browserBuild(architect, host, target, overrides);
    const styles = await files['styles.css'];
    const main = await files['main.js'];

    expect(styles).toContain(`url('/assets/global-img-absolute.svg')`);
    expect(styles).toContain(`url('out-assets/global-img-relative.png')`);
    expect(main).toContain(`url('/assets/component-img-absolute.svg')`);
    expect(main).toContain(`url('out-assets/component-img-relative.png')`);

    expect(host.scopedSync()
      .exists(normalize('dist/assets/global-img-absolute.svg'))).toBe(true);
    expect(host.scopedSync()
      .exists(normalize('dist/out-assets/global-img-relative.png'))).toBe(true);
    expect(host.scopedSync()
      .exists(normalize('dist/assets/component-img-absolute.svg'))).toBe(true);
    expect(host.scopedSync()
      .exists(normalize('dist/out-assets/component-img-relative.png'))).toBe(true);
  });

  it(`supports blank resourcesOutputPath`, async () => {
    writeFiles();

    // Check base paths are correctly generated.
    const overrides = { aot: true, extractCss: true };
    const { files } = await browserBuild(architect, host, target, overrides);
    const styles = await files['styles.css'];
    const main = await files['main.js'];

    expect(styles).toContain(`url('/assets/global-img-absolute.svg')`);
    expect(styles).toContain(`url('global-img-relative.png')`);
    expect(main).toContain(`url('/assets/component-img-absolute.svg')`);
    expect(main).toContain(`url('component-img-relative.png')`);
    expect(host.scopedSync().exists(normalize('dist/assets/global-img-absolute.svg')))
      .toBe(true);
    expect(host.scopedSync().exists(normalize('dist/global-img-relative.png')))
      .toBe(true);
    expect(host.scopedSync().exists(normalize('dist/assets/component-img-absolute.svg')))
      .toBe(true);
    expect(host.scopedSync().exists(normalize('dist/component-img-relative.png')))
      .toBe(true);
  });
});
