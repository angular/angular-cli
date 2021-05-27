/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { join, logging, normalize, virtualFs } from '@angular-devkit/core';
import { createArchitect, extractI18nTargetSpec, host } from '../test-utils';

describe('Extract i18n Target', () => {
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
  });

  it('does not emit the application files', async () => {
    host.appendToFile('src/app/app.component.html', '<p i18n>i18n test</p>');

    const run = await architect.scheduleTarget(extractI18nTargetSpec);

    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: true }));

    await run.stop();

    expect(host.scopedSync().exists(normalize('dist/app/main.js'))).toBeFalse();
  });

  it('shows errors', async () => {
    const logger = new logging.Logger('');
    const logs: string[] = [];
    logger.subscribe((e) => logs.push(e.message));

    host.appendToFile(
      'src/app/app.component.html',
      '<p i18n>Hello world <span i18n>inner</span></p>',
    );

    const run = await architect.scheduleTarget(extractI18nTargetSpec, undefined, { logger });

    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: false }));

    await run.stop();

    expect(logs.join()).toMatch(
      'Cannot mark an element as translatable inside of a translatable section',
    );
  });

  it('supports out file', async () => {
    host.appendToFile('src/app/app.component.html', '<p i18n>i18n test</p>');
    const outFile = 'messages.fr.xlf';
    const extractionFile = join(normalize('src'), outFile);
    const overrides = { outFile };

    const run = await architect.scheduleTarget(extractI18nTargetSpec, overrides);

    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: true }));

    await run.stop();

    expect(host.scopedSync().exists(extractionFile)).toBe(true);
    expect(virtualFs.fileBufferToString(host.scopedSync().read(extractionFile))).toMatch(
      /i18n test/,
    );
  });

  it('supports output path', async () => {
    host.appendToFile('src/app/app.component.html', '<p i18n>i18n test</p>');
    // Note: this folder will not be created automatically. It must exist beforehand.
    const outputPath = 'src/i18n';
    const extractionFile = join(normalize('src'), 'i18n', 'messages.xlf');
    const overrides = { outputPath };

    const run = await architect.scheduleTarget(extractI18nTargetSpec, overrides);

    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: true }));

    await run.stop();

    expect(host.scopedSync().exists(extractionFile)).toBe(true);
    expect(virtualFs.fileBufferToString(host.scopedSync().read(extractionFile))).toMatch(
      /i18n test/,
    );
  });

  it('supports i18n format', async () => {
    host.appendToFile('src/app/app.component.html', '<p i18n>i18n test</p>');
    const extractionFile = join(normalize('src'), 'messages.xmb');
    const overrides = { format: 'xmb' };

    const run = await architect.scheduleTarget(extractI18nTargetSpec, overrides);

    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: true }));

    await run.stop();

    expect(host.scopedSync().exists(extractionFile)).toBe(true);
    expect(virtualFs.fileBufferToString(host.scopedSync().read(extractionFile))).toMatch(
      /i18n test/,
    );
  });

  it('issues warnings for duplicate message identifiers', async () => {
    host.appendToFile(
      'src/app/app.component.ts',
      'const c = $localize`:@@message-2:message contents`; const d = $localize`:@@message-2:different message contents`;',
    );

    const logger = new logging.Logger('');
    const logs: string[] = [];
    logger.subscribe((e) => logs.push(e.message));

    const run = await architect.scheduleTarget(extractI18nTargetSpec, undefined, { logger });
    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: true }));

    await run.stop();

    expect(host.scopedSync().exists(extractionFile)).toBe(true);

    const fullLog = logs.join();
    expect(fullLog).toContain('Duplicate messages with id');
  });

  it('ignores inline styles', async () => {
    host.appendToFile('src/app/app.component.html', '<p i18n>i18n test</p>');
    host.replaceInFile('src/app/app.component.ts', 'styleUrls', 'styles');
    host.replaceInFile('src/app/app.component.ts', './app.component.css', 'h1 { color: green; }');

    const run = await architect.scheduleTarget(extractI18nTargetSpec);

    // This will fail if a style is processed since the style rules are not included during extraction
    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: true }));

    await run.stop();
  });
});
