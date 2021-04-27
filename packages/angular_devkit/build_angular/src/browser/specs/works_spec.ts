/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { describeBuilder } from '../../testing';
import { buildWebpackBrowser } from '../index';

const BROWSER_BUILDER_INFO = {
  name: '@angular-devkit/build-angular:browser',
  schemaPath: __dirname + '/../schema.json',
};

describeBuilder(buildWebpackBrowser, BROWSER_BUILDER_INFO, (harness) => {
  describe('basic test', () => {
    it('works', async () => {
      // Provide a target and options for builder execution
      harness.useTarget('build', {
        outputPath: 'dist',
        index: 'src/index.html',
        main: 'src/main.ts',
        polyfills: 'src/polyfills.ts',
        tsConfig: 'src/tsconfig.app.json',
        progress: false,
        assets: ['src/favicon.ico', 'src/assets'],
        styles: ['src/styles.css'],
        scripts: [],
      });

      // Execute builder with above provided project, target, and options
      await harness.executeOnce();

      // Default files should be in outputPath.
      expect(harness.hasFile('dist/runtime.js')).toBe(true);
      expect(harness.hasFile('dist/main.js')).toBe(true);
      expect(harness.hasFile('dist/polyfills.js')).toBe(true);
      expect(harness.hasFile('dist/vendor.js')).toBe(true);
      expect(harness.hasFile('dist/favicon.ico')).toBe(true);
      expect(harness.hasFile('dist/styles.css')).toBe(true);
      expect(harness.hasFile('dist/index.html')).toBe(true);
    });
  });
});
