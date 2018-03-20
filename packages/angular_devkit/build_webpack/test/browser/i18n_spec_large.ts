/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { join, normalize, virtualFs } from '@angular-devkit/core';
import { tap } from 'rxjs/operators';
import { browserTargetSpec, host, runTargetSpec } from '../utils';


describe('Browser Builder i18n', () => {
  const outputPath = normalize('dist');
  const emptyTranslationFile = `
      <?xml version="1.0" encoding="UTF-8" ?>
      <xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
        <file source-language="en" datatype="plaintext" original="ng2.template">
          <body>
          </body>
        </file>
      </xliff>`;

  beforeEach(done => host.initialize().subscribe(undefined, done.fail, done));
  afterEach(done => host.restore().subscribe(undefined, done.fail, done));

  it('uses translations', (done) => {
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

    host.appendToFile('src/app/app.component.html',
      '<h1 i18n="An introduction header for this sample">Hello i18n!</h1>');

    const overrides = {
      aot: true,
      i18nFile: 'src/locale/messages.fr.xlf',
      i18nFormat: 'true',
      i18nLocale: 'fr',
    };

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const fileName = join(outputPath, 'main.js');
        const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
        expect(content).toMatch(/Bonjour i18n!/);
      }),
    ).subscribe(undefined, done.fail, done);
  }, 30000);

  it('ignores missing translations', (done) => {
    const overrides = {
      aot: true,
      i18nFile: 'src/locale/messages.fr.xlf',
      i18nFormat: 'true',
      i18nLocale: 'fr',
      i18nMissingTranslation: 'ignore',
    };

    host.writeMultipleFiles({ 'src/locale/messages.fr.xlf': emptyTranslationFile });
    host.appendToFile('src/app/app.component.html', '<p i18n>Other content</p>');

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const fileName = join(outputPath, 'main.js');
        const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
        expect(content).toMatch(/Other content/);
      }),
    ).subscribe(undefined, done.fail, done);
  }, 30000);

  it('reports errors for missing translations', (done) => {
    const overrides = {
      aot: true,
      i18nFile: 'src/locale/messages.fr.xlf',
      i18nFormat: 'true',
      i18nLocale: 'fr',
      i18nMissingTranslation: 'error',
    };

    host.writeMultipleFiles({ 'src/locale/messages.fr.xlf': emptyTranslationFile });
    host.appendToFile('src/app/app.component.html', '<p i18n>Other content</p>');

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(false)),
    ).subscribe(undefined, done.fail, done);
  }, 30000);

  it('register locales', (done) => {
    const overrides = { aot: true, i18nLocale: 'fr_FR' };

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const fileName = join(outputPath, 'main.js');
        const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
        expect(content).toMatch(/registerLocaleData/);
        expect(content).toMatch(/angular_common_locales_fr/);
      }),
    ).subscribe(undefined, done.fail, done);
  }, 30000);
});
