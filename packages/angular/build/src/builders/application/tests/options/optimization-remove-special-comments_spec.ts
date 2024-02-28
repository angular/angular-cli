/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { buildApplication } from '../../index';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder } from '../setup';

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  describe('Behavior: "removeSpecialComments"', () => {
    beforeEach(async () => {
      await harness.writeFile(
        'src/styles.css',
        `
          /* normal-comment */
          /*! important-comment */
          div { flex: 1 }
        `,
      );
    });

    it(`should retain special comments when 'removeSpecialComments' is set to 'false'`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        extractLicenses: true,
        styles: ['src/styles.css'],
        optimization: {
          styles: {
            removeSpecialComments: false,
          },
        },
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness
        .expectFile('dist/browser/styles.css')
        .content.toMatch(/\/\*! important-comment \*\/[\s\S]*div{flex:1}/);
    });

    it(`should not retain special comments when 'removeSpecialComments' is set to 'true'`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        extractLicenses: true,
        styles: ['src/styles.css'],
        optimization: {
          styles: {
            removeSpecialComments: true,
          },
        },
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness.expectFile('dist/browser/styles.css').content.not.toContain('important-comment');
    });

    it(`should not retain special comments when 'removeSpecialComments' is not set`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        extractLicenses: true,
        styles: ['src/styles.css'],
        optimization: {
          styles: {},
        },
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness.expectFile('dist/browser/styles.css').content.not.toContain('important-comment');
    });
  });
});
