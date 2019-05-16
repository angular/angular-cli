/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Architect } from '@angular-devkit/architect';
import { browserBuild, createArchitect, host } from '../utils';


describe('Browser Builder optimization level', () => {
  const target = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  it('works', async () => {
    const overrides = { optimization: true };

    const { files } = await browserBuild(architect, host, target, overrides);
    expect(await files['main.js']).not.toContain('AppComponent');
  });

  it('tsconfig target changes optimizations to use ES2015', async () => {
    host.replaceInFile('tsconfig.json', '"target": "es5"', '"target": "es2015"');

    const overrides = { optimization: true };
    const { files } = await browserBuild(architect, host, target, overrides);
    expect(await files['vendor.js']).toMatch(/class \w{constructor\(\){/);
  });

  it('supports styles only optimizations', async () => {
    const overrides = {
      optimization: {
        styles: true,
        scripts: false,
      },
      aot: true,
      extractCss: true,
      styles: ['src/styles.css'],
    };

    host.appendToFile('src/main.ts', '/** js comment should not be dropped */');
    host.appendToFile('src/app/app.component.css', 'div { color: white }');
    host.writeMultipleFiles({
      'src/styles.css': `div { color: white }`,
    });

    const { files } = await browserBuild(architect, host, target, overrides);
    expect(await files['main.js']).toContain('js comment should not be dropped');
    expect(await files['main.js']).toContain('color:#fff');
    expect(await files['styles.css']).toContain('color:#fff');
  });

  it('supports scripts only optimizations', async () => {
    const overrides = {
      optimization: {
        styles: false,
        scripts: true,
      },
      aot: true,
      extractCss: true,
      styles: ['src/styles.css'],
    };

    host.appendToFile('src/main.ts', '/** js comment should be dropped */');
    host.appendToFile('src/app/app.component.css', 'div { color: white }');
    host.writeMultipleFiles({
      'src/styles.css': `div { color: white }`,
    });

    const { files } = await browserBuild(architect, host, target, overrides);
    expect(await files['main.js']).not.toContain('js comment should be dropped');
    expect(await files['main.js']).toContain('color: white');
    expect(await files['styles.css']).toContain('color: white');
  });
});
