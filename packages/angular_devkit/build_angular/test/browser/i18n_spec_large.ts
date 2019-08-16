/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Architect } from '@angular-devkit/architect';
import { join, normalize, virtualFs } from '@angular-devkit/core';
import { BrowserBuilderOutput } from '../../src/browser';
import { createArchitect, host, veEnabled } from '../utils';

// DISABLED_FOR_IVY - These should pass but are currently not supported
(veEnabled ? describe : xdescribe)('Browser Builder i18n', () => {
  const emptyTranslationFile = `
      <?xml version="1.0" encoding="UTF-8" ?>
      <xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
        <file source-language="en" datatype="plaintext" original="ng2.template">
          <body>
          </body>
        </file>
      </xliff>`;

  const targetSpec = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  it('uses translations', async () => {
    host.writeMultipleFiles({
      'src/locale/messages.fr.xlf': `
      <?xml version="1.0" encoding="UTF-8" ?>
      <xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
      <file source-language="en" datatype="plaintext" original="ng2.template">
      <body>
      <trans-unit id="8def8481e91291a52f9baa31cbdb313e6a6ca02b" datatype="html">
      <source>Hello i18n!</source>
      <target>Bonjour i18n!</target>
      <note priority="1" from="description">An introduction header for this sample</note>
      </trans-unit>
      </body>
      </file>
      </xliff>
      `,
    });

    host.appendToFile(
      'src/app/app.component.html',
      '<h1 i18n="An introduction header for this sample">Hello i18n!</h1>',
    );

    const overrides = {
      aot: true,
      i18nFile: 'src/locale/messages.fr.xlf',
      i18nFormat: 'true',
      i18nLocale: 'fr',
    };

    const run = await architect.scheduleTarget(targetSpec, overrides);
    const output = (await run.result) as BrowserBuilderOutput;
    expect(output.success).toBe(true);
    const outputPath = output.outputPath;
    const fileName = join(normalize(outputPath), 'main.js');
    const content = virtualFs.fileBufferToString(await host.read(normalize(fileName)).toPromise());
    expect(content).toMatch(/Bonjour i18n!/);

    await run.stop();
  });

  it('ignores missing translations', async () => {
    const overrides = {
      aot: true,
      i18nFile: 'src/locale/messages.fr.xlf',
      i18nFormat: 'true',
      i18nLocale: 'fr',
      i18nMissingTranslation: 'ignore',
    };

    host.writeMultipleFiles({ 'src/locale/messages.fr.xlf': emptyTranslationFile });
    host.appendToFile('src/app/app.component.html', '<p i18n>Other content</p>');

    const run = await architect.scheduleTarget(targetSpec, overrides);
    const output = (await run.result) as BrowserBuilderOutput;
    expect(output.success).toBe(true);
    const outputPath = output.outputPath;
    const fileName = join(normalize(outputPath), 'main.js');
    const content = virtualFs.fileBufferToString(await host.read(normalize(fileName)).toPromise());
    expect(content).toMatch(/Other content/);

    await run.stop();
  });

  it('reports errors for missing translations', async () => {
    const overrides = {
      aot: true,
      i18nFile: 'src/locale/messages.fr.xlf',
      i18nFormat: 'true',
      i18nLocale: 'fr',
      i18nMissingTranslation: 'error',
    };

    host.writeMultipleFiles({ 'src/locale/messages.fr.xlf': emptyTranslationFile });
    host.appendToFile('src/app/app.component.html', '<p i18n>Other content</p>');

    const run = await architect.scheduleTarget(targetSpec, overrides);
    const output = (await run.result) as BrowserBuilderOutput;
    expect(output.success).toBe(false);

    await run.stop();
  });

  it('register locales', async () => {
    const overrides = { aot: true, i18nLocale: 'fr_FR' };

    const run = await architect.scheduleTarget(targetSpec, overrides);
    const output = (await run.result) as BrowserBuilderOutput;
    expect(output.success).toBe(true);
    const outputPath = output.outputPath;
    const fileName = join(normalize(outputPath), 'main.js');
    const content = virtualFs.fileBufferToString(await host.read(normalize(fileName)).toPromise());
    expect(content).toMatch(/registerLocaleData/);
    expect(content).toMatch(/angular_common_locales_fr/);

    await run.stop();
  });
});
