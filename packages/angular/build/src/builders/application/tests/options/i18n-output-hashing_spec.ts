/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { buildApplication } from '../../index';
import { OutputHashing } from '../../schema';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder } from '../setup';

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  describe('i18n output hashing', () => {
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

    it('should not include a global i18n hash footer in localized output files', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        localize: true,
        outputHashing: OutputHashing.None,
      });

      await harness.writeFile(
        'src/app/app.component.html',
        `
          <p id="hello" i18n="An introduction header for this sample">Hello {{ title }}! </p>
        `,
      );

      await harness.writeFile('src/locales/messages.fr.xlf', TRANSLATION_FILE_CONTENT);

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      // Verify that the main JS output file does not contain a global i18n footer hash comment.
      // Previously, all JS files included a `/**i18n:<sha256>*/` footer computed from ALL
      // translation files, causing all chunk hashes to change whenever any translation
      // changed (issue #30675).
      harness
        .expectFile('dist/browser/fr/main.js')
        .content.not.toMatch(/\/\*\*i18n:[0-9a-f]{64}\*\//);
    });
  });
});

const TRANSLATION_FILE_CONTENT = `
  <?xml version="1.0" encoding="UTF-8" ?>
  <xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
    <file target-language="fr" datatype="plaintext" original="ng2.template">
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
