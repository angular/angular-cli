/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { buildEsbuildBrowser } from '../../index';
import { BASE_OPTIONS, BROWSER_BUILDER_INFO, describeBuilder } from '../setup';

describeBuilder(buildEsbuildBrowser, BROWSER_BUILDER_INFO, (harness) => {
  describe('Option: "deployUrl"', () => {
    beforeEach(async () => {
      // Application code is not needed for asset tests
      await harness.writeFile('src/main.ts', 'console.log("TEST");');

      // Add a global stylesheet to test link elements
      await harness.writeFile('src/styles.css', '/* Global styles */');

      // Reduce the input index HTML to a single line to simplify comparing
      await harness.writeFile(
        'src/index.html',
        '<html><head><base href="/"></head><body><app-root></app-root></body></html>',
      );
    });

    it('should update script src and link href attributes when option is set to relative URL', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        styles: ['src/styles.css'],
        deployUrl: 'deployUrl/',
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness
        .expectFile('dist/index.html')
        .content.toEqual(
          `<html><head><base href="/"><link rel="stylesheet" href="deployUrl/styles.css"></head>` +
            `<body><app-root></app-root>` +
            `<script src="deployUrl/main.js" type="module"></script></body></html>`,
        );
    });

    it('should update script src and link href attributes when option is set to absolute URL', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        styles: ['src/styles.css'],
        deployUrl: 'https://example.com/some/path/',
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness
        .expectFile('dist/index.html')
        .content.toEqual(
          `<html><head><base href="/"><link rel="stylesheet" href="https://example.com/some/path/styles.css"></head>` +
            `<body><app-root></app-root>` +
            `<script src="https://example.com/some/path/main.js" type="module"></script></body></html>`,
        );
    });

    it('should update dynamic import statements when option is set', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        styles: ['src/styles.css'],
        deployUrl: 'https://example.com/some/path/',
        namedChunks: true,
      });

      await harness.writeFile('src/main.ts', 'console.log("TEST");\nimport("./a");\nexport {}');
      await harness.writeFile('src/a.ts', 'console.log("A");\nexport {}');

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness
        .expectFile('dist/main.js')
        .content.toContain('import("https://example.com/some/path/a');
    });
  });
});
