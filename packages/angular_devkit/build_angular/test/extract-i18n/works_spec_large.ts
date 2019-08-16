/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Architect } from '@angular-devkit/architect';
import { TestLogger } from '@angular-devkit/architect/testing';
import { join, normalize, virtualFs } from '@angular-devkit/core';
import { createArchitect, extractI18nTargetSpec, host, veEnabled } from '../utils';


// DISABLED_FOR_IVY   These should pass but are currently not supported
(veEnabled ? describe : xdescribe)('Extract i18n Target', () => {
  const extractionFile = join(normalize('src'), 'messages.xlf');
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });

  afterEach(() => host.restore().toPromise());

  it('generates an extraction file', async () => {
    host.appendToFile('src/app/app.component.html', '<p i18n>i18n test</p>');

    const run = await architect.scheduleTarget(extractI18nTargetSpec);

    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: true }));

    await run.stop();

    const exists = host.scopedSync().exists(extractionFile);
    expect(exists).toBe(true);

    if (exists) {
      const content = virtualFs.fileBufferToString(host.scopedSync().read(extractionFile));
      expect(content).toContain('i18n test');
    }
  }, 30000);

  it('does not show full build logs', async () => {
    const logger = new TestLogger('i18n');
    host.appendToFile('src/app/app.component.html', '<p i18n>i18n test</p>');

    const run = await architect.scheduleTarget(extractI18nTargetSpec);

    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: true }));

    await run.stop();

    expect(logger.includes('Chunk Names')).toBe(false);
    expect(logger.includes('[emitted]')).toBe(false);
  }, 30000);

  it('shows errors', async () => {
    const logger = new TestLogger('i18n-errors');
    host.appendToFile('src/app/app.component.html',
      '<p i18n>Hello world <span i18n>inner</span></p>');

    const run = await architect.scheduleTarget(extractI18nTargetSpec, undefined, { logger });

    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: false }));

    await run.stop();

    const msg = 'Could not mark an element as translatable inside a translatable section';
    expect(logger.includes(msg)).toBe(true);
  }, 30000);

  it('supports locale', async () => {
    host.appendToFile('src/app/app.component.html', '<p i18n>i18n test</p>');
    const overrides = { i18nLocale: 'fr' };

    const run = await architect.scheduleTarget(extractI18nTargetSpec, overrides);

    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: true }));

    await run.stop();

    expect(host.scopedSync().exists((extractionFile))).toBe(true);
    expect(virtualFs.fileBufferToString(host.scopedSync().read(extractionFile)))
      .toContain('source-language="fr"');
  }, 30000);

  it('supports out file', async () => {
    host.appendToFile('src/app/app.component.html', '<p i18n>i18n test</p>');
    const outFile = 'messages.fr.xlf';
    const extractionFile = join(normalize('src'), outFile);
    const overrides = { outFile };

    const run = await architect.scheduleTarget(extractI18nTargetSpec, overrides);

    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: true }));

    await run.stop();

    expect(host.scopedSync().exists(extractionFile)).toBe(true);
    expect(virtualFs.fileBufferToString(host.scopedSync().read(extractionFile)))
      .toMatch(/i18n test/);
  }, 30000);

  it('supports output path', async () => {
    host.appendToFile('src/app/app.component.html', '<p i18n>i18n test</p>');
    // Note: this folder will not be created automatically. It must exist beforehand.
    const outputPath = 'app';
    const extractionFile = join(normalize('src'), outputPath, 'messages.xlf');
    const overrides = { outputPath };

    const run = await architect.scheduleTarget(extractI18nTargetSpec, overrides);

    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: true }));

    await run.stop();

    expect(host.scopedSync().exists(extractionFile)).toBe(true);
    expect(virtualFs.fileBufferToString(host.scopedSync().read(extractionFile)))
      .toMatch(/i18n test/);
  }, 30000);

  it('supports i18n format', async () => {
    host.appendToFile('src/app/app.component.html', '<p i18n>i18n test</p>');
    const extractionFile = join(normalize('src'), 'messages.xmb');
    const overrides = { i18nFormat: 'xmb' };

    const run = await architect.scheduleTarget(extractI18nTargetSpec, overrides);

    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: true }));

    await run.stop();

    expect(host.scopedSync().exists(extractionFile)).toBe(true);
    expect(virtualFs.fileBufferToString(host.scopedSync().read(extractionFile)))
      .toMatch(/i18n test/);
  }, 30000);
});
