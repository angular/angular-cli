/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { executeDevServer } from '../../index';
import { executeOnceAndFetch } from '../execute-fetch';
import { describeServeBuilder } from '../jasmine-helpers';
import { BASE_OPTIONS, DEV_SERVER_BUILDER_INFO } from '../setup';

describeServeBuilder(executeDevServer, DEV_SERVER_BUILDER_INFO, (harness, setupTarget) => {
  beforeEach(async () => {
    // Application code is not needed for these tests
    await harness.writeFile('src/main.ts', 'console.log("TEST");');
  });

  const javascriptFileContent =
    "import {foo} from 'unresolved'; /* a comment */const foo = `bar`;\n\n\n";

  describe('Behavior: "browser builder assets"', () => {
    it('serves a project JavaScript asset unmodified', async () => {
      await harness.writeFile('src/extra.js', javascriptFileContent);

      setupTarget(harness, {
        assets: ['src/extra.js'],
        optimization: {
          scripts: true,
        },
      });

      harness.useTarget('serve', {
        ...BASE_OPTIONS,
      });

      const { result, response } = await executeOnceAndFetch(harness, 'extra.js');

      expect(result?.success).toBeTrue();
      expect(await response?.text()).toContain(javascriptFileContent);
    });

    it('serves a project TypeScript asset unmodified', async () => {
      await harness.writeFile('src/extra.ts', javascriptFileContent);

      setupTarget(harness, {
        assets: ['src/extra.ts'],
      });

      harness.useTarget('serve', {
        ...BASE_OPTIONS,
      });

      const { result, response } = await executeOnceAndFetch(harness, 'extra.ts');

      expect(result?.success).toBeTrue();
      expect(await response?.text()).toContain(javascriptFileContent);
    });

    it('serves a project CSS asset unmodified', async () => {
      const cssFileContent = 'p { color: blue };';
      await harness.writeFile('src/extra.css', cssFileContent);

      setupTarget(harness, {
        assets: ['src/extra.css'],
      });

      harness.useTarget('serve', {
        ...BASE_OPTIONS,
      });

      const { result, response } = await executeOnceAndFetch(harness, 'extra.css');

      expect(result?.success).toBeTrue();
      expect(await response?.text()).toBe(cssFileContent);
    });

    it('serves a project SCSS asset unmodified', async () => {
      const cssFileContent = 'p { color: blue };';
      await harness.writeFile('src/extra.scss', cssFileContent);

      setupTarget(harness, {
        assets: ['src/extra.scss'],
      });

      harness.useTarget('serve', {
        ...BASE_OPTIONS,
      });

      const { result, response } = await executeOnceAndFetch(harness, 'extra.scss');

      expect(result?.success).toBeTrue();
      expect(await response?.text()).toBe(cssFileContent);
    });

    it('should return 404 for non existing assets', async () => {
      setupTarget(harness, {
        assets: [],
        optimization: {
          scripts: true,
        },
      });

      harness.useTarget('serve', {
        ...BASE_OPTIONS,
      });

      const { result, response } = await executeOnceAndFetch(harness, 'does-not-exist.js');

      expect(result?.success).toBeTrue();
      expect(await response?.status).toBe(404);
    });

    it(`should return the asset that matches 'index.html' when path has a trailing '/'`, async () => {
      await harness.writeFile(
        'src/login/index.html',
        '<html><body><h1>Login page</h1></body><html>',
      );

      setupTarget(harness, {
        assets: ['src/login'],
        optimization: {
          scripts: true,
        },
      });

      harness.useTarget('serve', {
        ...BASE_OPTIONS,
      });

      const { result, response } = await executeOnceAndFetch(harness, 'login/');

      expect(result?.success).toBeTrue();
      expect(await response?.status).toBe(200);
      expect(await response?.text()).toContain('<h1>Login page</h1>');
    });

    it(`should return the asset that matches '.html' when path has no trailing '/'`, async () => {
      await harness.writeFile('src/login/new.html', '<html><body><h1>Login page</h1></body><html>');

      setupTarget(harness, {
        assets: ['src/login'],
        optimization: {
          scripts: true,
        },
      });

      harness.useTarget('serve', {
        ...BASE_OPTIONS,
      });

      const { result, response } = await executeOnceAndFetch(harness, 'login/new');

      expect(result?.success).toBeTrue();
      expect(await response?.status).toBe(200);
      expect(await response?.text()).toContain('<h1>Login page</h1>');
    });

    it(`should return a redirect when an asset directory is accessed without a trailing '/'`, async () => {
      await harness.writeFile(
        'src/login/index.html',
        '<html><body><h1>Login page</h1></body><html>',
      );

      setupTarget(harness, {
        assets: ['src/login'],
        optimization: {
          scripts: true,
        },
      });

      harness.useTarget('serve', {
        ...BASE_OPTIONS,
      });

      const { result, response } = await executeOnceAndFetch(harness, 'login', {
        request: { redirect: 'manual' },
      });

      expect(result?.success).toBeTrue();
      expect(await response?.status).toBe(301);
      expect(await response?.headers.get('Location')).toBe('/login/');
    });

    it('serves a JavaScript asset named as a bundle (main.js)', async () => {
      await harness.writeFile('public/test/main.js', javascriptFileContent);

      setupTarget(harness, {
        assets: [
          {
            glob: '**/*',
            input: 'public',
          },
        ],
      });

      harness.useTarget('serve', {
        ...BASE_OPTIONS,
      });

      const { result, response } = await executeOnceAndFetch(harness, 'test/main.js');
      expect(result?.success).toBeTrue();
      expect(await response?.text()).toContain(javascriptFileContent);
    });

    it('should return 404 when a JavaScript asset named as a bundle (main.js) does not exist', async () => {
      setupTarget(harness, {});

      harness.useTarget('serve', {
        ...BASE_OPTIONS,
      });

      const { result, response } = await executeOnceAndFetch(harness, 'unknown/main.js');
      expect(result?.success).toBeTrue();
      expect(response?.status).toBe(404);
    });
  });
});
