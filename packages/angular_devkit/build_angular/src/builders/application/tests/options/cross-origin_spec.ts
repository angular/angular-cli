/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { buildApplication } from '../../index';
import { CrossOrigin } from '../../schema';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder } from '../setup';

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  describe('Option: "crossOrigin"', () => {
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

    it('should add the use-credentials crossorigin attribute when option is set to use-credentials', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        styles: ['src/styles.css'],
        crossOrigin: CrossOrigin.UseCredentials,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness
        .expectFile('dist/index.html')
        .content.toEqual(
          `<html><head><base href="/"><link rel="stylesheet" href="styles.css" crossorigin="use-credentials"></head>` +
            `<body><app-root></app-root>` +
            `<script src="main.js" type="module" crossorigin="use-credentials"></script></body></html>`,
        );
    });

    it('should add the anonymous crossorigin attribute when option is set to anonymous', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        styles: ['src/styles.css'],
        crossOrigin: CrossOrigin.Anonymous,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness
        .expectFile('dist/index.html')
        .content.toEqual(
          `<html><head><base href="/">` +
            `<link rel="stylesheet" href="styles.css" crossorigin="anonymous"></head>` +
            `<body><app-root></app-root>` +
            `<script src="main.js" type="module" crossorigin="anonymous"></script></body></html>`,
        );
    });

    it('should not add a crossorigin attribute when option is set to none', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        styles: ['src/styles.css'],
        crossOrigin: CrossOrigin.None,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness
        .expectFile('dist/index.html')
        .content.toEqual(
          `<html><head><base href="/">` +
            `<link rel="stylesheet" href="styles.css"></head>` +
            `<body><app-root></app-root>` +
            `<script src="main.js" type="module"></script></body></html>`,
        );
    });

    it('should not add a crossorigin attribute when option is not present', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        styles: ['src/styles.css'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness
        .expectFile('dist/index.html')
        .content.toEqual(
          `<html><head><base href="/">` +
            `<link rel="stylesheet" href="styles.css"></head>` +
            `<body><app-root></app-root>` +
            `<script src="main.js" type="module"></script></body></html>`,
        );
    });
  });
});
