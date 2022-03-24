/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/* eslint-disable max-len */
import fetch from 'node-fetch'; // eslint-disable-line import/no-extraneous-dependencies
import { concatMap, count, take, timeout } from 'rxjs/operators';
import { URL } from 'url';
import { serveWebpackBrowser } from '../../index';
import {
  BASE_OPTIONS,
  BUILD_TIMEOUT,
  DEV_SERVER_BUILDER_INFO,
  describeBuilder,
  setupBrowserTarget,
} from '../setup';

describeBuilder(serveWebpackBrowser, DEV_SERVER_BUILDER_INFO, (harness) => {
  describe('Behavior: "i18n translation file watching"', () => {
    beforeEach(() => {
      harness.useProject('test', {
        root: '.',
        sourceRoot: 'src',
        cli: {
          cache: {
            enabled: false,
          },
        },
        i18n: {
          locales: {
            'fr': 'src/locales/messages.fr.xlf',
          },
        },
      });

      setupBrowserTarget(harness, { localize: ['fr'] });
    });

    it('watches i18n translation files by default', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
      });

      await harness.writeFile(
        'src/app/app.component.html',
        `
          <p id="hello" i18n="An introduction header for this sample">Hello {{ title }}! </p>
        `,
      );

      await harness.writeFile('src/locales/messages.fr.xlf', TRANSLATION_FILE_CONTENT);

      const buildCount = await harness
        .execute()
        .pipe(
          timeout(BUILD_TIMEOUT),
          concatMap(async ({ result }, index) => {
            expect(result?.success).toBe(true);

            const mainUrl = new URL('main.js', `${result?.baseUrl}`);

            switch (index) {
              case 0: {
                const response = await fetch(mainUrl);
                expect(await response?.text()).toContain('Bonjour');

                await harness.modifyFile('src/locales/messages.fr.xlf', (content) =>
                  content.replace('Bonjour', 'Salut'),
                );
                break;
              }
              case 1: {
                const response = await fetch(mainUrl);
                expect(await response?.text()).toContain('Salut');
                break;
              }
            }
          }),
          take(2),
          count(),
        )
        .toPromise();

      expect(buildCount).toBe(2);
    });
  });
});

const TRANSLATION_FILE_CONTENT = `
  <?xml version="1.0" encoding="UTF-8" ?>
  <xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
    <file target-language="en-US" datatype="plaintext" original="ng2.template">
      <body>
        <trans-unit id="4286451273117902052" datatype="html">
          <target>Bonjour <x id="INTERPOLATION" equiv-text="{{ title }}"/>! </target>
          <context-group purpose="location">
            <context context-type="targetfile">src/app/app.component.html</context>
            <context context-type="linenumber">2,3</context>
          </context-group>
          <note priority="1" from="description">An introduction header for this sample</note>
        </trans-unit>
      </body>
    </file>
  </xliff>
`;
