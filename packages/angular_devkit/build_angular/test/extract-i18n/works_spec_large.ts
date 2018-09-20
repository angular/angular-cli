/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { DefaultTimeout, TestLogger, runTargetSpec } from '@angular-devkit/architect/testing';
import { join, normalize, virtualFs } from '@angular-devkit/core';
import { tap } from 'rxjs/operators';
import { extractI18nTargetSpec, host } from '../utils';


describe('Extract i18n Target', () => {
  const extractionFile = join(normalize('src'), 'messages.xlf');

  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  it('works', (done) => {
    host.appendToFile('src/app/app.component.html', '<p i18n>i18n test</p>');

    runTargetSpec(host, extractI18nTargetSpec).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        expect(host.scopedSync().exists((extractionFile))).toBe(true);
        expect(virtualFs.fileBufferToString(host.scopedSync().read(extractionFile)))
          .toMatch(/i18n test/);
      }),
    ).toPromise().then(done, done.fail);
  }, 30000);

  it('shows errors', (done) => {
    const logger = new TestLogger('i18n-errors');
    host.appendToFile('src/app/app.component.html',
      '<p i18n>Hello world <span i18n>inner</span></p>');

    runTargetSpec(host, extractI18nTargetSpec, {}, DefaultTimeout, logger).pipe(
      tap((buildEvent) => {
        expect(buildEvent.success).toBe(false);
        const msg = 'Could not mark an element as translatable inside a translatable section';
        expect(logger.includes(msg)).toBe(true);
      }),
    ).toPromise().then(done, done.fail);
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
    ).toPromise().then(done, done.fail);
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
    ).toPromise().then(done, done.fail);
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
    ).toPromise().then(done, done.fail);
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
    ).toPromise().then(done, done.fail);
  }, 30000);
});
