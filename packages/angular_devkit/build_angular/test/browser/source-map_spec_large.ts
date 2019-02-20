/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { runTargetSpec } from '@angular-devkit/architect/testing';
import { join, normalize, virtualFs } from '@angular-devkit/core';
import { tap } from 'rxjs/operators';
import { OutputHashing, Schema as BrowserBuilderSchema } from '../../src/browser/schema';
import { browserTargetSpec, host } from '../utils';

// tslint:disable-next-line:no-big-function
describe('Browser Builder source map', () => {
  const outputPath = normalize('dist');

  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  it('works', (done) => {
    const overrides: Partial<BrowserBuilderSchema> = {
      sourceMap: true,
      extractCss: true,
      styles: ['src/styles.css'],
    };

    host.writeMultipleFiles({
      'src/styles.css': `div { flex: 1 }`,
    });

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const scriptsFileName = join(outputPath, 'main.js.map');
        expect(host.scopedSync().exists(scriptsFileName)).toBe(true);

        const stylesFileName = join(outputPath, 'styles.css.map');
        expect(host.scopedSync().exists(stylesFileName)).toBe(true);
      }),
    ).toPromise().then(done, done.fail);
  });

  it('works with outputHashing', (done) => {
    const overrides: Partial<BrowserBuilderSchema> = {
      sourceMap: true,
      outputHashing: OutputHashing.All,
    };

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        expect(host.fileMatchExists(outputPath, /main\.[0-9a-f]{20}\.js.map/)).toBeTruthy();
      }),
    ).toPromise().then(done, done.fail);
  });

  it('does not output source map when disabled', (done) => {
    const overrides = { sourceMap: false };

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const fileName = join(outputPath, 'main.js.map');
        expect(host.scopedSync().exists(fileName)).toBe(false);
      }),
    ).toPromise().then(done, done.fail);
  });

  it('supports eval source map', (done) => {
    const overrides = { sourceMap: true, evalSourceMap: true };

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        expect(host.scopedSync().exists(join(outputPath, 'main.js.map'))).toBe(false);
        const fileName = join(outputPath, 'main.js');
        const content = virtualFs.fileBufferToString(host.scopedSync().read(fileName));
        expect(content).toContain('eval("function webpackEmptyAsyncContext');
      }),
    ).toPromise().then(done, done.fail);
  });

  it('supports hidden sourcemaps', (done) => {
    const overrides: Partial<BrowserBuilderSchema> = {
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


    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        expect(host.scopedSync().exists(join(outputPath, 'main.js.map'))).toBe(true);
        expect(host.scopedSync().exists(join(outputPath, 'styles.css.map'))).toBe(true);

        const scriptContent = virtualFs.fileBufferToString(
          host.scopedSync().read(join(outputPath, 'main.js')),
        );
        expect(scriptContent).not.toContain('sourceMappingURL=main.js.map');

        const styleContent = virtualFs.fileBufferToString(
          host.scopedSync().read(join(outputPath, 'styles.css')),
        );
        expect(styleContent).not.toContain('sourceMappingURL=styles.css.map');
      }),
    ).toPromise().then(done, done.fail);
  });

  it('supports styles only sourcemaps', (done) => {
    const overrides: Partial<BrowserBuilderSchema> = {
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

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        expect(host.scopedSync().exists(join(outputPath, 'main.js.map'))).toBe(false);
        expect(host.scopedSync().exists(join(outputPath, 'styles.css.map'))).toBe(true);

        const scriptContent = virtualFs.fileBufferToString(
          host.scopedSync().read(join(outputPath, 'main.js')),
        );
        expect(scriptContent).not.toContain('sourceMappingURL=main.js.map');

        const styleContent = virtualFs.fileBufferToString(
          host.scopedSync().read(join(outputPath, 'styles.css')),
        );

        expect(styleContent).toContain('sourceMappingURL=styles.css.map');
      }),
    ).toPromise().then(done, done.fail);
  });

  it('supports scripts only sourcemaps', (done) => {
    const overrides: Partial<BrowserBuilderSchema> = {
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

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        expect(host.scopedSync().exists(join(outputPath, 'main.js.map'))).toBe(true);
        expect(host.scopedSync().exists(join(outputPath, 'styles.css.map'))).toBe(false);

        const scriptContent = virtualFs.fileBufferToString(
          host.scopedSync().read(join(outputPath, 'main.js')),
        );
        expect(scriptContent).toContain('sourceMappingURL=main.js.map');

        const styleContent = virtualFs.fileBufferToString(
          host.scopedSync().read(join(outputPath, 'styles.css')),
        );
        expect(styleContent).not.toContain('sourceMappingURL=styles.css.map');
      }),
    ).toPromise().then(done, done.fail);
  });

  it('should not inline component styles sourcemaps when hidden', (done) => {
    const overrides: Partial<BrowserBuilderSchema> = {
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

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        expect(host.scopedSync().exists(join(outputPath, 'main.js.map'))).toBe(true);
        expect(host.scopedSync().exists(join(outputPath, 'styles.css.map'))).toBe(true);

        const scriptContent = virtualFs.fileBufferToString(
          host.scopedSync().read(join(outputPath, 'main.js')),
        );

        expect(scriptContent).not.toContain('sourceMappingURL=main.js.map');
        expect(scriptContent).not.toContain('sourceMappingURL=data:application/json');

        const styleContent = virtualFs.fileBufferToString(
          host.scopedSync().read(join(outputPath, 'styles.css')),
        );
        expect(styleContent).not.toContain('sourceMappingURL=styles.css.map');
      }),
    ).toPromise().then(done, done.fail);
  });
});
