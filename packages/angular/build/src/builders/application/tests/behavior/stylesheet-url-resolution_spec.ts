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

    it('should not rebase a URL with a namespaced Sass variable reference that points to an absolute asset', async () => {
      await harness.writeFiles({
        'src/styles.scss': `@use 'theme/a';`,
        'src/theme/a.scss': `
                            @use './b' as named;
                            .a {
                              background-image: url(named.$my-var)
                            }
        `,
        'src/theme/b.scss': `@forward './c.scss' show $my-var;`,
        'src/theme/c.scss': `$my-var: "https://example.com/example.png";`,
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        styles: ['src/styles.scss'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness
        .expectFile('dist/browser/styles.css')
        .content.toContain('url(https://example.com/example.png)');
    });

    it('should not rebase a URL with a Sass variable reference that points to an absolute asset', async () => {
      await harness.writeFiles({
        'src/styles.scss': `@use 'theme/a';`,
        'src/theme/a.scss': `
                            @import './b';
                            .a {
                              background-image: url($my-var)
                            }
        `,
        'src/theme/b.scss': `$my-var: "https://example.com/example.png";`,
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        styles: ['src/styles.scss'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness
        .expectFile('dist/browser/styles.css')
        .content.toContain('url(https://example.com/example.png)');
    });

    it('should rebase a URL with a namespaced Sass variable referencing a local resource', async () => {
      await harness.writeFiles({
        'src/styles.scss': `@use 'theme/a';`,
        'src/theme/a.scss': `
                            @use './b' as named;
                            .a {
                              background-image: url(named.$my-var)
                            }
        `,
        'src/theme/b.scss': `@forward './c.scss' show $my-var;`,
        'src/theme/c.scss': `$my-var: "./images/logo.svg";`,
        'src/theme/images/logo.svg': `<svg></svg>`,
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        outputHashing: OutputHashing.None,
        styles: ['src/styles.scss'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness.expectFile('dist/browser/styles.css').content.toContain(`url("./media/logo.svg")`);
      harness.expectFile('dist/browser/media/logo.svg').toExist();
    });

    it('should rebase a URL with a hyphen-namespaced Sass variable referencing a local resource', async () => {
      await harness.writeFiles({
        'src/styles.scss': `@use 'theme/a';`,
        'src/theme/a.scss': `
                            @use './b' as named-hyphen;
                            .a {
                              background-image: url(named-hyphen.$my-var)
                            }
        `,
        'src/theme/b.scss': `@forward './c.scss' show $my-var;`,
        'src/theme/c.scss': `$my-var: "./images/logo.svg";`,
        'src/theme/images/logo.svg': `<svg></svg>`,
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        outputHashing: OutputHashing.None,
        styles: ['src/styles.scss'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness.expectFile('dist/browser/styles.css').content.toContain(`url("./media/logo.svg")`);
      harness.expectFile('dist/browser/media/logo.svg').toExist();
    });

    it('should rebase a URL with a underscore-namespaced Sass variable referencing a local resource', async () => {
      await harness.writeFiles({
        'src/styles.scss': `@use 'theme/a';`,
        'src/theme/a.scss': `
                            @use './b' as named_underscore;
                            .a {
                              background-image: url(named_underscore.$my-var)
                            }
        `,
        'src/theme/b.scss': `@forward './c.scss' show $my-var;`,
        'src/theme/c.scss': `$my-var: "./images/logo.svg";`,
        'src/theme/images/logo.svg': `<svg></svg>`,
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        outputHashing: OutputHashing.None,
        styles: ['src/styles.scss'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness.expectFile('dist/browser/styles.css').content.toContain(`url("./media/logo.svg")`);
      harness.expectFile('dist/browser/media/logo.svg').toExist();
    });

    it('should rebase a URL with a Sass variable referencing a local resource', async () => {
      await harness.writeFiles({
        'src/styles.scss': `@use 'theme/a';`,
        'src/theme/a.scss': `
                            @import './b';
                            .a {
                              background-image: url($my-var)
                            }
        `,
        'src/theme/b.scss': `$my-var: "./images/logo.svg";`,
        'src/theme/images/logo.svg': `<svg></svg>`,
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        outputHashing: OutputHashing.None,
        styles: ['src/styles.scss'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness.expectFile('dist/browser/styles.css').content.toContain(`url("./media/logo.svg")`);
      harness.expectFile('dist/browser/media/logo.svg').toExist();
    });

    it('should rebase a URL with an leading interpolation referencing a local resource', async () => {
      await harness.writeFiles({
        'src/styles.scss': `@use 'theme/a';`,
        'src/theme/a.scss': `
                            @import './b';
                            .a {
                              background-image: url(#{$my-var}logo.svg)
                            }
        `,
        'src/theme/b.scss': `$my-var: "./images/";`,
        'src/theme/images/logo.svg': `<svg></svg>`,
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        outputHashing: OutputHashing.None,
        styles: ['src/styles.scss'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness.expectFile('dist/browser/styles.css').content.toContain(`url("./media/logo.svg")`);
      harness.expectFile('dist/browser/media/logo.svg').toExist();
    });

    it('should rebase a URL with interpolation using concatenation referencing a local resource', async () => {
      await harness.writeFiles({
        'src/styles.scss': `@use 'theme/a';`,
        'src/theme/a.scss': `
                            @import './b';
                            $extra-var: "2";
                            $postfix-var: "xyz";
                            .a {
                              background-image: url("#{$my-var}logo#{$extra-var+ "-" + $postfix-var}.svg")
                            }
        `,
        'src/theme/b.scss': `$my-var: "./images/";`,
        'src/theme/images/logo2-xyz.svg': `<svg></svg>`,
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        outputHashing: OutputHashing.None,
        styles: ['src/styles.scss'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness
        .expectFile('dist/browser/styles.css')
        .content.toContain(`url("./media/logo2-xyz.svg")`);
      harness.expectFile('dist/browser/media/logo2-xyz.svg').toExist();
    });

    it('should rebase a URL with an non-leading interpolation referencing a local resource', async () => {
      await harness.writeFiles({
        'src/styles.scss': `@use 'theme/a';`,
        'src/theme/a.scss': `
                            @import './b';
                            .a {
                              background-image: url(./#{$my-var}logo.svg)
                            }
        `,
        'src/theme/b.scss': `$my-var: "./images/";`,
        'src/theme/images/logo.svg': `<svg></svg>`,
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        outputHashing: OutputHashing.None,
        styles: ['src/styles.scss'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness.expectFile('dist/browser/styles.css').content.toContain(`url("./media/logo.svg")`);
      harness.expectFile('dist/browser/media/logo.svg').toExist();
    });

    it('should not rebase Sass function definition with name ending in "url"', async () => {
      await harness.writeFiles({
        'src/styles.scss': `@use 'theme/a';`,
        'src/theme/a.scss': `
                            @import './b';
                            .a {
                              $asset: my-function-url('logo');
                              background-image: url($asset)
                            }
        `,
        'src/theme/b.scss': `@function my-function-url($name) { @return "./images/" + $name + ".svg"; }`,
        'src/theme/images/logo.svg': `<svg></svg>`,
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        outputHashing: OutputHashing.None,
        styles: ['src/styles.scss'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness.expectFile('dist/browser/styles.css').content.toContain(`url("./media/logo.svg")`);
      harness.expectFile('dist/browser/media/logo.svg').toExist();
    });

    it('should not process a URL that has been marked as external', async () => {
      await harness.writeFiles({
        'src/styles.scss': `@use 'theme/a';`,
        'src/theme/a.scss': `
          .a {
            background-image: url("assets/logo.svg")
          }
        `,
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        outputHashing: OutputHashing.None,
        externalDependencies: ['assets/*'],
        styles: ['src/styles.scss'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness.expectFile('dist/browser/styles.css').content.toContain(`url(assets/logo.svg)`);
    });
  });
});
