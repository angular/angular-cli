/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { join, normalize, virtualFs } from '@angular-devkit/core';
import { tap } from 'rxjs/operators';
import { TestLogger, extractI18nTargetSpec, host, runTargetSpec } from '../utils';


describe('Extract i18n Target', () => {
  const extractionFile = join(normalize('src'), 'messages.xlf');

  beforeEach(done => host.initialize().subscribe(undefined, done.fail, done));
  afterEach(done => host.restore().subscribe(undefined, done.fail, done));

  it('works', (done) => {
    host.appendToFile('src/app/app.component.html', '<p i18n>i18n test</p>');

    runTargetSpec(host, extractI18nTargetSpec).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        expect(host.scopedSync().exists((extractionFile))).toBe(true);
        expect(virtualFs.fileBufferToString(host.scopedSync().read(extractionFile)))
          .toMatch(/i18n test/);
      }),
    ).subscribe(undefined, done.fail, done);
  }, 30000);

  it('shows errors', (done) => {
    const logger = new TestLogger('i18n-errors');
    host.appendToFile('src/app/app.component.html',
      '<p i18n>Hello world <span i18n>inner</span></p>');

    runTargetSpec(host, extractI18nTargetSpec, {}, logger).pipe(
      tap((buildEvent) => {
        expect(buildEvent.success).toBe(false);
        const msg = 'Could not mark an element as translatable inside a translatable section';
        expect(logger.includes(msg)).toBe(true);
      }),
    ).subscribe(undefined, done.fail, done);
  }, 30000);

  it('supports locale', (done) => {
    host.appendToFile('src/app/app.component.html', '<p i18n>i18n test</p>');
    const overrides = { i18nLocale: 'fr' };

    runTargetSpec(host, extractI18nTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        expect(host.scopedSync().exists((extractionFile))).toBe(true);
        expect(virtualFs.fileBufferToString(host.scopedSync().read(extractionFile)))
          .toContain('source-language="fr"');
      }),
    ).subscribe(undefined, done.fail, done);
  }, 30000);

  it('supports out file', (done) => {
    host.appendToFile('src/app/app.component.html', '<p i18n>i18n test</p>');
    const outFile = 'messages.fr.xlf';
    const extractionFile = join(normalize('src'), outFile);
    const overrides = { outFile };

    runTargetSpec(host, extractI18nTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        expect(host.scopedSync().exists(extractionFile)).toBe(true);
        expect(virtualFs.fileBufferToString(host.scopedSync().read(extractionFile)))
          .toMatch(/i18n test/);
      }),
    ).subscribe(undefined, done.fail, done);
  }, 30000);

  it('supports output path', (done) => {
    host.appendToFile('src/app/app.component.html', '<p i18n>i18n test</p>');
    // Note: this folder will not be created automatically. It must exist beforehand.
    const outputPath = 'app';
    const extractionFile = join(normalize('src'), outputPath, 'messages.xlf');
    const overrides = { outputPath };

    runTargetSpec(host, extractI18nTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        expect(host.scopedSync().exists(extractionFile)).toBe(true);
        expect(virtualFs.fileBufferToString(host.scopedSync().read(extractionFile)))
          .toMatch(/i18n test/);
      }),
    ).subscribe(undefined, done.fail, done);
  }, 30000);

  it('supports i18n format', (done) => {
    host.appendToFile('src/app/app.component.html', '<p i18n>i18n test</p>');
    const extractionFile = join(normalize('src'), 'messages.xmb');
    const overrides = { i18nFormat: 'xmb' };

    runTargetSpec(host, extractI18nTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        expect(host.scopedSync().exists(extractionFile)).toBe(true);
        expect(virtualFs.fileBufferToString(host.scopedSync().read(extractionFile)))
          .toMatch(/i18n test/);
      }),
    ).subscribe(undefined, done.fail, done);
  }, 30000);
});
