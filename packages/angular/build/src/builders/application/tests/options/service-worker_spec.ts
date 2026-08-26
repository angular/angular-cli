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
  describe('Option: "serviceWorker"', () => {
    beforeEach(async () => {
      const manifest = {
        index: '/index.html',
        assetGroups: [
          {
            name: 'app',
            installMode: 'prefetch',
            resources: {
              files: ['/favicon.ico', '/index.html', '/*.css', '/*.js'],
            },
          },
          {
            name: 'assets',
            installMode: 'lazy',
            updateMode: 'prefetch',
            resources: {
              files: [
                '/assets/**',
                '/*.(svg|cur|jpg|jpeg|png|apng|webp|avif|gif|otf|ttf|woff|woff2)',
              ],
            },
          },
        ],
      };

      await harness.writeFile('src/ngsw-config.json', JSON.stringify(manifest));
    });

    it('should not generate SW config when option is unset', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        serviceWorker: undefined,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness.expectFile('dist/browser/ngsw.json').toNotExist();
    });

    it('should not generate SW config when option is false', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        serviceWorker: false,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness.expectFile('dist/browser/ngsw.json').toNotExist();
    });

    it('should generate SW config when option is true', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        serviceWorker: true,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness.expectFile('dist/browser/ngsw.json').toExist();
    });

    it('should generate SW config referencing index output', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        serviceWorker: true,
        index: {
          input: 'src/index.html',
          output: 'index.csr.html',
        },
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);

      const config = await harness.readFile('dist/browser/ngsw.json');
      expect(JSON.parse(config)).toEqual(jasmine.objectContaining({ index: '/index.csr.html' }));
    });

    it('should write JS-imported CSS chunk to browser dist when SSR is enabled', async () => {
      await harness.modifyFile('src/tsconfig.app.json', (content) => {
        const tsConfig = JSON.parse(content);
        tsConfig.files ??= [];
        tsConfig.files.push('main.server.ts', 'server.ts', 'extra.d.ts');

        return JSON.stringify(tsConfig);
      });

      await harness.writeFile('src/extra.d.ts', `declare module '*.css';`);
      await harness.writeFile('src/server.ts', `console.log('Server!');`);
      await harness.writeFile('src/extra.css', `body { color: red; }`);
      await harness.modifyFile('src/main.ts', (content) => `import './extra.css';\n${content}`);

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        server: 'src/main.server.ts',
        ssr: { entry: 'src/server.ts' },
        serviceWorker: true,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      const config = JSON.parse(harness.readFile('dist/browser/ngsw.json'));
      const hashTable = config.hashTable as Record<string, string>;

      const cssChunkUrls = Object.keys(hashTable).filter((url) => url.endsWith('.css'));
      expect(cssChunkUrls.length).toBeGreaterThan(0);

      for (const url of Object.keys(hashTable)) {
        harness.expectFile(`dist/browser${url}`).toExist();
      }
    });
  });
});
