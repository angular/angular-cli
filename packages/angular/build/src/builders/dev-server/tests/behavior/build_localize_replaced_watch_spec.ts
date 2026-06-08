/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { executeDevServer } from '../../index';
import { describeServeBuilder } from '../jasmine-helpers';
import { BASE_OPTIONS, DEV_SERVER_BUILDER_INFO } from '../setup';

describeServeBuilder(executeDevServer, DEV_SERVER_BUILDER_INFO, (harness, setupTarget) => {
  describe('Behavior: "i18n $localize calls are replaced during watching"', () => {
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
          sourceLocale: {
            code: 'fr',
          },
        },
      });

      setupTarget(harness, { localize: ['fr'] });
    });

    it('$localize are replaced in watch', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        watch: true,
      });

      await harness.writeFile(
        'src/app/app.component.html',
        `
          <p id="hello" i18n="An introduction header for this sample">Hello {{ title }}! </p>
        `,
      );

      await harness.executeWithCases([
        async ({ result }) => {
          expect(result?.success).toBe(true);

          const response = await fetch(new URL('main.js', `${result?.baseUrl}`));
          expect(await response?.text()).not.toContain('$localize`:');

          await harness.modifyFile('src/app/app.component.html', (content) =>
            content.replace('introduction', 'intro'),
          );
        },
        async ({ result }) => {
          expect(result?.success).toBe(true);

          const response = await fetch(new URL('main.js', `${result?.baseUrl}`));
          expect(await response?.text()).not.toContain('$localize`:');
        },
      ]);
    });
  });
});
