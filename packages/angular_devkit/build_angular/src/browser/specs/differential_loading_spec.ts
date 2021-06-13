/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { PathFragment } from '@angular-devkit/core';
import { browserBuild, createArchitect, host } from '../../test-utils';

const TEST_TIMEOUT = 8 * 60 * 1000;

describe('Browser Builder with differential loading', () => {
  const target = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    // to trigger differential loading we need an non ever green browser
    host.writeMultipleFiles({
      '.browserslistrc': 'IE 10',
    });

    architect = (await createArchitect(host.root())).architect;
  });

  afterEach(async () => host.restore().toPromise());

  it(
    'emits all the neccessary files for default configuration',
    async () => {
      const { files } = await browserBuild(architect, host, target, { sourceMap: true });

      const expectedOutputs = [
        'favicon.ico',
        'index.html',

        'main-es2017.js',
        'main-es2017.js.map',
        'main-es5.js',
        'main-es5.js.map',

        'polyfills-es2017.js',
        'polyfills-es2017.js.map',
        'polyfills-es5.js',
        'polyfills-es5.js.map',

        'runtime-es2017.js',
        'runtime-es2017.js.map',
        'runtime-es5.js',
        'runtime-es5.js.map',

        'vendor-es2017.js',
        'vendor-es2017.js.map',
        'vendor-es5.js',
        'vendor-es5.js.map',

        'styles.css',
        'styles.css.map',
      ] as PathFragment[];

      expect(Object.keys(files)).toEqual(jasmine.arrayWithExactContents(expectedOutputs));
    },
    TEST_TIMEOUT,
  );

  it(
    'emits all the neccessary files for target of ESNext',
    async () => {
      host.replaceInFile('tsconfig.json', '"target": "es2017",', `"target": "esnext",`);

      const { files } = await browserBuild(architect, host, target, { sourceMap: true });
      const expectedOutputs = [
        'favicon.ico',
        'index.html',

        'main-esnext.js',
        'main-esnext.js.map',
        'main-es5.js',
        'main-es5.js.map',

        'polyfills-esnext.js',
        'polyfills-esnext.js.map',
        'polyfills-es5.js',
        'polyfills-es5.js.map',

        'runtime-esnext.js',
        'runtime-esnext.js.map',
        'runtime-es5.js',
        'runtime-es5.js.map',

        'vendor-esnext.js',
        'vendor-esnext.js.map',
        'vendor-es5.js',
        'vendor-es5.js.map',

        'styles.css',
        'styles.css.map',
      ] as PathFragment[];

      expect(Object.keys(files)).toEqual(jasmine.arrayWithExactContents(expectedOutputs));
    },
    TEST_TIMEOUT,
  );

  it(
    'deactivates differential loading for watch mode',
    async () => {
      const { files } = await browserBuild(architect, host, target, {
        watch: true,
        sourceMap: true,
      });

      const expectedOutputs = [
        'favicon.ico',
        'index.html',

        'main-es2017.js',
        'main-es2017.js.map',

        'polyfills-es2017.js',
        'polyfills-es2017.js.map',

        'runtime-es2017.js',
        'runtime-es2017.js.map',

        'vendor-es2017.js',
        'vendor-es2017.js.map',

        'styles.css',
        'styles.css.map',
      ] as PathFragment[];

      expect(Object.keys(files)).toEqual(jasmine.arrayWithExactContents(expectedOutputs));
    },
    TEST_TIMEOUT,
  );

  it(
    'emits the right ES formats',
    async () => {
      const { files } = await browserBuild(architect, host, target, {
        optimization: true,
        vendorChunk: false,
      });
      expect(await files['main-es5.js']).not.toContain('const ');
      expect(await files['main-es2017.js']).toContain('const ');
    },
    TEST_TIMEOUT,
  );

  it(
    'wraps ES5 scripts in an IIFE',
    async () => {
      const { files } = await browserBuild(architect, host, target, { optimization: false });
      expect(await files['main-es5.js']).toMatch(/^\(function \(\) \{/);
      expect(await files['main-es2017.js']).not.toMatch(/^\(function \(\) \{/);
    },
    TEST_TIMEOUT,
  );

  it(
    'uses the right zone.js variant',
    async () => {
      const { files } = await browserBuild(architect, host, target, { optimization: false });
      expect(await files['polyfills-es5.js']).toContain('zone.js/plugins/zone-legacy');
      expect(await files['polyfills-es5.js']).toContain('registerElementPatch');
      expect(await files['polyfills-es2017.js']).not.toContain('zone.js/plugins/zone-legacy');
      expect(await files['polyfills-es2017.js']).not.toContain('registerElementPatch');
    },
    TEST_TIMEOUT,
  );

  it(
    'adds `type="module"` when differential loading is needed',
    async () => {
      host.writeMultipleFiles({
        '.browserslistrc': `
        last 1 chrome version
        IE 9
      `,
      });

      const { files } = await browserBuild(architect, host, target, { watch: true });
      expect(await files['index.html']).toContain(
        '<script src="runtime-es2017.js" type="module"></script>' +
          '<script src="polyfills-es2017.js" type="module"></script>' +
          '<script src="vendor-es2017.js" type="module"></script>' +
          '<script src="main-es2017.js" type="module"></script>',
      );
    },
    TEST_TIMEOUT,
  );
});
