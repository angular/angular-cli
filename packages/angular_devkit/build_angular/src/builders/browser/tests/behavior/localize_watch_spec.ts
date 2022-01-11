/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { concatMap, count, take, timeout } from 'rxjs/operators';
import { BUILD_TIMEOUT, buildWebpackBrowser } from '../../index';
import { BASE_OPTIONS, BROWSER_BUILDER_INFO, describeBuilder } from '../setup';

describeBuilder(buildWebpackBrowser, BROWSER_BUILDER_INFO, (harness) => {
  describe('Behavior: "localize works in watch mode"', () => {
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
    });

    it('localize works in watch mode', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        watch: true,
        localize: true,
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

            switch (index) {
              case 0: {
                harness.expectFile('dist/fr/main.js').content.toContain('Bonjour');

                // Trigger rebuild
                await harness.appendToFile('src/app/app.component.html', '\n\n');
                break;
              }
              case 1: {
                harness.expectFile('dist/fr/main.js').content.toContain('Bonjour');
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
