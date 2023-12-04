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
  describe('Behavior: "Stylesheet url() Resolution"', () => {
    it('should show a note when using tilde prefix in a directly referenced stylesheet', async () => {
      await harness.writeFile(
        'src/styles.css',
        `
        .a {
          background-image: url("~/image.jpg")
        }
      `,
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        styles: ['src/styles.css'],
      });

      const { result, logs } = await harness.executeOnce({ outputLogsOnFailure: false });
      expect(result?.success).toBe(false);

      expect(logs).toContain(
        jasmine.objectContaining({
          message: jasmine.stringMatching('You can remove the tilde and'),
        }),
      );
      expect(logs).not.toContain(
        jasmine.objectContaining({
          message: jasmine.stringMatching('Preprocessor stylesheets may not show the exact'),
        }),
      );
    });

    it('should show a note when using tilde prefix in an imported CSS stylesheet', async () => {
      await harness.writeFile(
        'src/styles.css',
        `
        @import "a.css";
      `,
      );
      await harness.writeFile(
        'src/a.css',
        `
        .a {
          background-image: url("~/image.jpg")
        }
      `,
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        styles: ['src/styles.css'],
      });

      const { result, logs } = await harness.executeOnce({ outputLogsOnFailure: false });
      expect(result?.success).toBe(false);

      expect(logs).toContain(
        jasmine.objectContaining({
          message: jasmine.stringMatching('You can remove the tilde and'),
        }),
      );
    });

    it('should show a note when using tilde prefix in an imported Sass stylesheet', async () => {
      await harness.writeFile(
        'src/styles.scss',
        `
        @import "a";
      `,
      );
      await harness.writeFile(
        'src/a.scss',
        `
        .a {
          background-image: url("~/image.jpg")
        }
      `,
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        styles: ['src/styles.scss'],
      });

      const { result, logs } = await harness.executeOnce({ outputLogsOnFailure: false });
      expect(result?.success).toBe(false);

      expect(logs).toContain(
        jasmine.objectContaining({
          message: jasmine.stringMatching('You can remove the tilde and'),
        }),
      );
      expect(logs).toContain(
        jasmine.objectContaining({
          message: jasmine.stringMatching('Preprocessor stylesheets may not show the exact'),
        }),
      );
    });

    it('should show a note when using caret prefix in a directly referenced stylesheet', async () => {
      await harness.writeFile(
        'src/styles.css',
        `
        .a {
          background-image: url("^image.jpg")
        }
      `,
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        styles: ['src/styles.css'],
      });

      const { result, logs } = await harness.executeOnce({ outputLogsOnFailure: false });
      expect(result?.success).toBe(false);

      expect(logs).toContain(
        jasmine.objectContaining({
          message: jasmine.stringMatching('You can remove the caret and'),
        }),
      );
    });

    it('should show a note when using caret prefix in an imported Sass stylesheet', async () => {
      await harness.writeFile(
        'src/styles.scss',
        `
        @import "a";
      `,
      );
      await harness.writeFile(
        'src/a.scss',
        `
        .a {
          background-image: url("^image.jpg")
        }
      `,
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        styles: ['src/styles.scss'],
      });

      const { result, logs } = await harness.executeOnce({ outputLogsOnFailure: false });
      expect(result?.success).toBe(false);

      expect(logs).toContain(
        jasmine.objectContaining({
          message: jasmine.stringMatching('You can remove the caret and'),
        }),
      );
    });

    it('should not rebase a URL with a namespaced Sass variable reference', async () => {
      await harness.writeFile(
        'src/styles.scss',
        `
        @import "a";
      `,
      );
      await harness.writeFile(
        'src/a.scss',
        `
        @use './b' as named;
        .a {
          background-image: url(named.$my-var)
        }
      `,
      );
      await harness.writeFile(
        'src/b.scss',
        `
        @forward './c.scss' show $my-var;
      `,
      );
      await harness.writeFile(
        'src/c.scss',
        `
        $my-var: "https://example.com/example.png";
      `,
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        styles: ['src/styles.scss'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);

      harness
        .expectFile('dist/browser/styles.css')
        .content.toContain('url(https://example.com/example.png)');
    });
  });
});
