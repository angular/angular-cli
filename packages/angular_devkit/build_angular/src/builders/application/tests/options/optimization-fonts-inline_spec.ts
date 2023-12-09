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
  describe('Option: "fonts.inline"', () => {
    beforeEach(async () => {
      await harness.modifyFile('/src/index.html', (content) =>
        content.replace(
          '<head>',
          `<head><link href="https://fonts.googleapis.com/css?family=Roboto:300,400,500" rel="stylesheet">`,
        ),
      );

      await harness.writeFile(
        'src/styles.css',
        '@import url(https://fonts.googleapis.com/css?family=Roboto:300,400,500);',
      );

      await harness.writeFile(
        'src/app/app.component.css',
        '@import url(https://fonts.googleapis.com/css?family=Roboto:300,400,500);',
      );
    });

    it(`should not inline fonts when fonts optimization is set to false`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        optimization: {
          scripts: true,
          styles: true,
          fonts: false,
        },
        styles: ['src/styles.css'],
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBeTrue();
      for (const file of ['styles.css', 'index.html', 'main.js']) {
        harness
          .expectFile(`dist/browser/${file}`)
          .content.toContain(`https://fonts.googleapis.com/css?family=Roboto:300,400,500`);
      }
    });

    it(`should inline fonts when fonts optimization is unset`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        optimization: {
          scripts: true,
          styles: true,
          fonts: undefined,
        },
        styles: ['src/styles.css'],
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBeTrue();
      for (const file of ['styles.css', 'index.html', 'main.js']) {
        harness
          .expectFile(`dist/browser/${file}`)
          .content.not.toContain(`https://fonts.googleapis.com/css?family=Roboto:300,400,500`);
        harness
          .expectFile(`dist/browser/${file}`)
          .content.toMatch(/@font-face{font-family:'?Roboto/);
      }
    });

    it(`should inline fonts when fonts optimization is true`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        optimization: {
          scripts: true,
          styles: true,
          fonts: true,
        },
        styles: ['src/styles.css'],
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBeTrue();
      for (const file of ['styles.css', 'index.html', 'main.js']) {
        harness
          .expectFile(`dist/browser/${file}`)
          .content.not.toContain(`https://fonts.googleapis.com/css?family=Roboto:300,400,500`);
        harness
          .expectFile(`dist/browser/${file}`)
          .content.toMatch(/@font-face{font-family:'?Roboto/);
      }
    });
  });
});
