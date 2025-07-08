/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { buildApplication } from '../../index';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder } from '../setup';

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  describe('Option: "outputPath"', () => {
    beforeEach(async () => {
      // Add a global stylesheet media file
      await harness.writeFile('src/styles.css', `h1 { background: url('./spectrum.png')}`);
      // Add a component stylesheet media file
      await harness.writeFile('src/app/abc.svg', '');
      await harness.writeFile('src/app/app.component.css', `h2 { background: url('./abc.svg')}`);

      // Enable SSR
      await harness.modifyFile('src/tsconfig.app.json', (content) => {
        const tsConfig = JSON.parse(content);
        tsConfig.files ??= [];
        tsConfig.files.push('main.server.ts', 'server.ts');

        return JSON.stringify(tsConfig);
      });

      // Application server code is not needed in this test
      await harness.writeFile('src/main.server.ts', `console.log('Hello!');`);
      await harness.writeFile('src/server.ts', `console.log('Hello!');`);
    });

    describe(`when option value is is a string`, () => {
      beforeEach(() => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          polyfills: [],
          outputPath: 'dist',
          styles: ['src/styles.css'],
          server: 'src/main.server.ts',
          ssr: {
            entry: 'src/server.ts',
          },
        });
      });

      it(`should emit browser bundles in 'browser' directory`, async () => {
        const { result } = await harness.executeOnce();
        expect(result?.success).toBeTrue();

        harness.expectFile('dist/browser/main.js').toExist();
      });

      it(`should emit media files in 'browser/media' directory`, async () => {
        const { result } = await harness.executeOnce();
        expect(result?.success).toBeTrue();

        harness.expectFile('dist/browser/media/spectrum.png').toExist();
        harness.expectFile('dist/browser/media/abc.svg').toExist();
      });

      it(`should emit server bundles in 'server' directory`, async () => {
        const { result } = await harness.executeOnce();
        expect(result?.success).toBeTrue();

        harness.expectFile('dist/server/server.mjs').toExist();
      });
    });

    describe(`when option value is an object`, () => {
      describe(`'media' is set to 'resources'`, () => {
        beforeEach(() => {
          harness.useTarget('build', {
            ...BASE_OPTIONS,
            polyfills: [],
            styles: ['src/styles.css'],
            server: 'src/main.server.ts',
            outputPath: {
              base: 'dist',
              media: 'resource',
            },
            ssr: {
              entry: 'src/server.ts',
            },
          });
        });

        it(`should emit browser bundles in 'browser' directory`, async () => {
          const { result } = await harness.executeOnce();
          expect(result?.success).toBeTrue();

          harness.expectFile('dist/browser/main.js').toExist();
        });

        it(`should emit media files in 'browser/resource' directory`, async () => {
          const { result } = await harness.executeOnce();
          expect(result?.success).toBeTrue();

          harness.expectFile('dist/browser/resource/spectrum.png').toExist();
          harness.expectFile('dist/browser/resource/abc.svg').toExist();
        });

        it(`should emit server bundles in 'server' directory`, async () => {
          const { result } = await harness.executeOnce();
          expect(result?.success).toBeTrue();

          harness.expectFile('dist/server/server.mjs').toExist();
        });
      });

      describe(`'media' is set to ''`, () => {
        beforeEach(() => {
          harness.useTarget('build', {
            ...BASE_OPTIONS,
            polyfills: [],
            styles: ['src/styles.css'],
            server: 'src/main.server.ts',
            outputPath: {
              base: 'dist',
              media: '',
            },
            ssr: {
              entry: 'src/server.ts',
            },
          });
        });

        it(`should emit browser bundles in 'browser' directory`, async () => {
          const { result } = await harness.executeOnce();
          expect(result?.success).toBeTrue();

          harness.expectFile('dist/browser/main.js').toExist();
        });

        it(`should emit media files in 'browser' directory`, async () => {
          const { result } = await harness.executeOnce();
          expect(result?.success).toBeTrue();

          harness.expectFile('dist/browser/spectrum.png').toExist();
          harness.expectFile('dist/browser/abc.svg').toExist();

          // Component CSS should not be considered media
          harness.expectFile('dist/browser/app.component.css').toNotExist();
        });

        it(`should emit server bundles in 'server' directory`, async () => {
          const { result } = await harness.executeOnce();
          expect(result?.success).toBeTrue();

          harness.expectFile('dist/server/server.mjs').toExist();
        });
      });

      describe(`'server' is set to 'node-server'`, () => {
        beforeEach(() => {
          harness.useTarget('build', {
            ...BASE_OPTIONS,
            polyfills: [],
            styles: ['src/styles.css'],
            server: 'src/main.server.ts',
            outputPath: {
              base: 'dist',
              server: 'node-server',
            },
            ssr: {
              entry: 'src/server.ts',
            },
          });
        });

        it(`should emit browser bundles in 'browser' directory`, async () => {
          const { result } = await harness.executeOnce();
          expect(result?.success).toBeTrue();

          harness.expectFile('dist/browser/main.js').toExist();
        });

        it(`should emit media files in 'browser/media' directory`, async () => {
          const { result } = await harness.executeOnce();
          expect(result?.success).toBeTrue();

          harness.expectFile('dist/browser/media/spectrum.png').toExist();
          harness.expectFile('dist/browser/media/abc.svg').toExist();
        });

        it(`should emit server bundles in 'node-server' directory`, async () => {
          const { result } = await harness.executeOnce();
          expect(result?.success).toBeTrue();

          harness.expectFile('dist/node-server/server.mjs').toExist();
        });
      });

      describe(`'browser' is set to 'public'`, () => {
        beforeEach(() => {
          harness.useTarget('build', {
            ...BASE_OPTIONS,
            polyfills: [],
            styles: ['src/styles.css'],
            server: 'src/main.server.ts',
            outputPath: {
              base: 'dist',
              browser: 'public',
            },
            ssr: {
              entry: 'src/server.ts',
            },
          });
        });

        it(`should emit browser bundles in 'public' directory`, async () => {
          const { result } = await harness.executeOnce();
          expect(result?.success).toBeTrue();

          harness.expectFile('dist/public/main.js').toExist();
        });

        it(`should emit media files in 'public/media' directory`, async () => {
          const { result } = await harness.executeOnce();
          expect(result?.success).toBeTrue();

          harness.expectFile('dist/public/media/spectrum.png').toExist();
          harness.expectFile('dist/public/media/abc.svg').toExist();
        });

        it(`should emit server bundles in 'server' directory`, async () => {
          const { result } = await harness.executeOnce();
          expect(result?.success).toBeTrue();

          harness.expectFile('dist/server/server.mjs').toExist();
        });
      });

      describe(`'browser' is set to ''`, () => {
        it(`should emit browser bundles in '' directory`, async () => {
          harness.useTarget('build', {
            ...BASE_OPTIONS,
            polyfills: [],
            server: 'src/main.server.ts',
            outputPath: {
              base: 'dist',
              browser: '',
            },
            ssr: false,
          });

          const { result } = await harness.executeOnce();
          expect(result?.success).toBeTrue();

          harness.expectFile('dist/main.js').toExist();
        });

        it(`should emit media files in 'media' directory`, async () => {
          harness.useTarget('build', {
            ...BASE_OPTIONS,
            polyfills: [],
            styles: ['src/styles.css'],
            server: 'src/main.server.ts',
            outputPath: {
              base: 'dist',
              browser: '',
            },
            ssr: false,
          });

          const { result } = await harness.executeOnce();
          expect(result?.success).toBeTrue();

          harness.expectFile('dist/media/spectrum.png').toExist();
          harness.expectFile('dist/media/abc.svg').toExist();
        });

        it(`should error when ssr is enabled`, async () => {
          harness.useTarget('build', {
            ...BASE_OPTIONS,
            polyfills: [],
            server: 'src/main.server.ts',
            outputPath: {
              base: 'dist',
              browser: '',
            },
            ssr: {
              entry: 'src/server.ts',
            },
          });

          const { result, logs } = await harness.executeOnce({ outputLogsOnFailure: false });
          expect(result?.success).toBeFalse();
          expect(logs).toContain(
            jasmine.objectContaining({
              message: jasmine.stringMatching(
                `'outputPath.browser' cannot be configured to an empty string when SSR is enabled`,
              ),
            }),
          );
        });
      });

      describe(`'server' is set ''`, () => {
        beforeEach(() => {
          harness.useTarget('build', {
            ...BASE_OPTIONS,
            polyfills: [],
            styles: ['src/styles.css'],
            server: 'src/main.server.ts',
            outputPath: {
              base: 'dist',
              server: '',
            },
            ssr: {
              entry: 'src/server.ts',
            },
          });
        });

        it(`should emit browser bundles in 'browser' directory`, async () => {
          const { result } = await harness.executeOnce();
          expect(result?.success).toBeTrue();

          harness.expectFile('dist/browser/main.js').toExist();
        });

        it(`should emit media files in 'browser/media' directory`, async () => {
          const { result } = await harness.executeOnce();
          expect(result?.success).toBeTrue();

          harness.expectFile('dist/browser/media/spectrum.png').toExist();
          harness.expectFile('dist/browser/media/abc.svg').toExist();
        });

        it(`should emit server bundles in '' directory`, async () => {
          const { result } = await harness.executeOnce();
          expect(result?.success).toBeTrue();

          harness.expectFile('dist/server.mjs').toExist();
        });
      });

      it(`should error when ssr is enabled and 'browser' and 'server' are identical`, async () => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          polyfills: [],
          server: 'src/main.server.ts',
          outputPath: {
            base: 'dist',
            browser: 'public',
            server: 'public',
          },
          ssr: {
            entry: 'src/server.ts',
          },
        });

        const { result, logs } = await harness.executeOnce({ outputLogsOnFailure: false });
        expect(result?.success).toBeFalse();
        expect(logs).toContain(
          jasmine.objectContaining({
            message: jasmine.stringMatching(
              `'outputPath.browser' and 'outputPath.server' cannot be configured to the same value`,
            ),
          }),
        );
      });
    });
  });
});
