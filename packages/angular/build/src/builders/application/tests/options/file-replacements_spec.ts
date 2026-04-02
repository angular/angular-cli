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
  describe('Option: "fileReplacements"', () => {
    it('should replace JSON files', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        fileReplacements: [{ replace: './src/one.json', with: './src/two.json' }],
      });

      await harness.modifyFile('tsconfig.json', (content) => {
        const tsconfig = JSON.parse(content);
        tsconfig.compilerOptions.resolveJsonModule = true;

        return JSON.stringify(tsconfig);
      });

      await harness.writeFile('./src/one.json', '{ "x": 12345 }');
      await harness.writeFile('./src/two.json', '{ "x": 67890 }');
      await harness.writeFile('src/main.ts', 'import { x } from "./one.json";\n console.log(x);');

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness.expectFile('dist/browser/main.js').content.not.toContain('12345');
      harness.expectFile('dist/browser/main.js').content.toContain('67890');
    });

    it('should apply file replacements inside web workers', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        fileReplacements: [{ replace: './src/app/env.ts', with: './src/app/env.prod.ts' }],
      });

      await harness.writeFile('src/app/env.ts', `export const value = 'development';`);
      await harness.writeFile('src/app/env.prod.ts', `export const value = 'production';`);

      await harness.writeFile(
        'src/app/worker.ts',
        `import { value } from './env';\nself.postMessage(value);`,
      );

      await harness.writeFile(
        'src/app/app.component.ts',
        `
        import { Component } from '@angular/core';
        @Component({
          selector: 'app-root',
          standalone: false,
          template: '<h1>Worker Test</h1>',
        })
        export class AppComponent {
          worker = new Worker(new URL('./worker', import.meta.url), { type: 'module' });
        }
      `,
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      // Verify the worker output file exists
      expect(harness.hasFileMatch('dist/browser', /^worker-[A-Z0-9]{8}\.js$/)).toBeTrue();

      // Find the worker filename from the main bundle and read its content
      const mainContent = harness.readFile('dist/browser/main.js');
      const workerMatch = mainContent.match(/worker-([A-Z0-9]{8})\.js/);
      expect(workerMatch).not.toBeNull();

      if (workerMatch) {
        const workerFilename = `dist/browser/${workerMatch[0]}`;
        // The worker bundle should contain the replaced (production) value
        harness.expectFile(workerFilename).content.toContain('production');
        // The worker bundle should NOT contain the original (development) value
        harness.expectFile(workerFilename).content.not.toContain('development');
      }
    });

    it('should apply file replacements to transitive imports inside web workers', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        fileReplacements: [{ replace: './src/app/env.ts', with: './src/app/env.prod.ts' }],
      });

      await harness.writeFile('src/app/env.ts', `export const value = 'development';`);
      await harness.writeFile('src/app/env.prod.ts', `export const value = 'production';`);

      // The worker imports a helper that in turn imports the replaceable env file.
      await harness.writeFile(
        'src/app/worker-helper.ts',
        `export { value } from './env';`,
      );

      await harness.writeFile(
        'src/app/worker.ts',
        `import { value } from './worker-helper';\nself.postMessage(value);`,
      );

      await harness.writeFile(
        'src/app/app.component.ts',
        `
        import { Component } from '@angular/core';
        @Component({
          selector: 'app-root',
          standalone: false,
          template: '<h1>Worker Test</h1>',
        })
        export class AppComponent {
          worker = new Worker(new URL('./worker', import.meta.url), { type: 'module' });
        }
      `,
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      // Verify the worker output file exists
      expect(harness.hasFileMatch('dist/browser', /^worker-[A-Z0-9]{8}\.js$/)).toBeTrue();

      // Find the worker filename from the main bundle and read its content
      const mainContent = harness.readFile('dist/browser/main.js');
      const workerMatch = mainContent.match(/worker-([A-Z0-9]{8})\.js/);
      expect(workerMatch).not.toBeNull();

      if (workerMatch) {
        const workerFilename = `dist/browser/${workerMatch[0]}`;
        // The worker bundle should contain the replaced (production) value
        harness.expectFile(workerFilename).content.toContain('production');
        // The worker bundle should NOT contain the original (development) value
        harness.expectFile(workerFilename).content.not.toContain('development');
      }
    });
  });
});
