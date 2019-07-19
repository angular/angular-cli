/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Architect } from '@angular-devkit/architect';
import { OutputHashing } from '../../src/browser/schema';
import { browserBuild, createArchitect, host } from '../utils';

// tslint:disable-next-line:no-big-function
describe('Browser Builder source map', () => {
  const target = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  it('works', async () => {
    const overrides = {
      sourceMap: true,
      extractCss: true,
      styles: ['src/styles.css'],
    };

    host.writeMultipleFiles({
      'src/styles.css': `div { flex: 1 }`,
    });

    const { files } = await browserBuild(architect, host, target, overrides);
    expect(await files['main.js.map']).not.toBeUndefined();
    expect(await files['styles.css.map']).not.toBeUndefined();
  });

  it(`sourcemaps sources should not start with '/'`, async () => {
    // If sourcemaps sources start with a '/' it will break VS code breakpoints
    // Unless 'sourceMapPathOverrides' are provided
    const overrides = {
      sourceMap: true,
    };

    const { files } = await browserBuild(architect, host, target, overrides);
    const mainJSMap = await files['main.js.map'];
    expect(mainJSMap).not.toBeUndefined();

    const sources: string[] = JSON.parse(mainJSMap).sources;
    for (const source of sources) {
      expect(source.startsWith('/')).toBe(false, `${source} started with an '/'.`);
    }
  });

  it('works with outputHashing', async () => {
    const { files } = await browserBuild(architect, host, target, {
      sourceMap: true,
      outputHashing: OutputHashing.All,
    });

    expect(Object.keys(files).some(name => /main\.[0-9a-f]{20}\.js.map/.test(name))).toBeTruthy();
  });

  it('does not output source map when disabled', async () => {
    const { files } = await browserBuild(architect, host, target, {
      sourceMap: false,
    });

    expect(files['main.js.map']).toBeUndefined();
  });

  it('supports eval source map', async () => {
    const { files } = await browserBuild(architect, host, target, {
      sourceMap: true, evalSourceMap: true,
    });

    expect(files['main.js.map']).toBeUndefined();
    expect(await files['main.js']).toContain('eval("function webpackEmptyAsyncContext');
  });

  it('supports hidden sourcemaps', async () => {
    const overrides = {
      sourceMap: {
        hidden: true,
        styles: true,
        scripts: true,
      },
      extractCss: true,
      styles: ['src/styles.scss'],
    };

    host.writeMultipleFiles({
      'src/styles.scss': `div { flex: 1 }`,
    });

    const { files } = await browserBuild(architect, host, target, overrides);
    expect('main.js.map' in files).toBe(true);
    expect('styles.css.map' in files).toBe(true);
    expect(await files['main.js']).not.toContain('sourceMappingURL=main.js.map');
    expect(await files['styles.css']).not.toContain('sourceMappingURL=styles.css.map');
  });

  it('supports styles only sourcemaps', async () => {
    const overrides = {
      sourceMap: {
        styles: true,
        scripts: false,
      },
      extractCss: true,
      styles: ['src/styles.scss'],
    };

    host.writeMultipleFiles({
      'src/styles.scss': `div { flex: 1 }`,
    });

    const { files } = await browserBuild(architect, host, target, overrides);
    expect('main.js.map' in files).toBe(false);
    expect('styles.css.map' in files).toBe(true);
    expect(await files['main.js']).not.toContain('sourceMappingURL=main.js.map');
    expect(await files['styles.css']).toContain('sourceMappingURL=styles.css.map');
  });

  it('supports scripts only sourcemaps', async () => {
    const overrides = {
      sourceMap: {
        styles: false,
        scripts: true,
      },
      extractCss: true,
      styles: ['src/styles.scss'],
    };

    host.writeMultipleFiles({
      'src/styles.scss': `div { flex: 1 }`,
    });

    const { files } = await browserBuild(architect, host, target, overrides);
    expect('main.js.map' in files).toBe(true);
    expect('styles.css.map' in files).toBe(false);
    expect(await files['main.js']).toContain('sourceMappingURL=main.js.map');
    expect(await files['styles.css']).not.toContain('sourceMappingURL=styles.css.map');
  });

  it('should not inline component styles sourcemaps when hidden', async () => {
    const overrides = {
      sourceMap: {
        hidden: true,
        styles: true,
        scripts: true,
      },
      extractCss: true,
      styles: ['src/styles.scss'],
    };

    host.writeMultipleFiles({
      'src/styles.scss': `div { flex: 1 }`,
      'src/app/app.component.css': `p { color: red; }`,
    });

    const { files } = await browserBuild(architect, host, target, overrides);
    expect('main.js.map' in files).toBe(true);
    expect('styles.css.map' in files).toBe(true);
    expect(await files['main.js']).not.toContain('sourceMappingURL=main.js.map');
    expect(await files['main.js']).not.toContain('sourceMappingURL=data:application/json');
    expect(await files['styles.css']).not.toContain('sourceMappingURL=styles.css.map');
    expect(await files['styles.css']).not.toContain('sourceMappingURL=data:application/json');
  });
});
