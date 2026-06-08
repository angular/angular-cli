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
  describe('Option: "deployUrl"', () => {
    beforeEach(async () => {
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
        .expectFile('dist/browser/index.html')
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
        .expectFile('dist/browser/index.html')
        .content.toEqual(
          `<html><head><base href="/"><link rel="stylesheet" href="https://example.com/some/path/styles.css"></head>` +
            `<body><app-root></app-root>` +
            `<script src="https://example.com/some/path/main.js" type="module"></script></body></html>`,
        );
    });

    it('should update resources component stylesheets to reference deployURL', async () => {
      await harness.writeFile('src/app/test.svg', '<svg></svg>');
      await harness.writeFile(
        'src/app/app.component.css',
        `* { background-image: url('./test.svg'); }`,
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        deployUrl: 'https://example.com/some/path/',
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness
        .expectFile('dist/browser/main.js')
        .content.toContain('background-image: url("https://example.com/some/path/media/test.svg")');
    });
  });
});
