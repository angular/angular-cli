/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { buildApplication } from '../../index';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder } from '../setup';

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  describe('Option: "baseHref"', () => {
    beforeEach(async () => {
      // Application code is not needed for asset tests
      await harness.writeFile('src/main.ts', 'console.log("TEST");');
    });

    it('should update the base element href attribute when option is set', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        baseHref: '/abc',
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness.expectFile('dist/index.html').content.toContain('<base href="/abc">');
    });

    it('should update the base element with no href attribute when option is set', async () => {
      await harness.writeFile(
        'src/index.html',
        `
        <html>
          <head><base></head>
          <body></body>
        </html>
      `,
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        baseHref: '/abc',
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness.expectFile('dist/index.html').content.toContain('<base href="/abc">');
    });

    it('should add the base element href attribute when option is set', async () => {
      await harness.writeFile(
        'src/index.html',
        `
        <html>
          <head></head>
          <body></body>
        </html>
      `,
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        baseHref: '/abc',
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness.expectFile('dist/index.html').content.toContain('<base href="/abc">');
    });

    it('should update the base element href attribute when option is set to an empty string', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        baseHref: '',
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness.expectFile('dist/index.html').content.toContain('<base href="">');
    });

    it('should not update the base element href attribute when option is not present', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness.expectFile('dist/index.html').content.toContain('<base href="/">');
    });

    it('should not change the base element href attribute when option is not present', async () => {
      await harness.writeFile(
        'src/index.html',
        `
        <html>
          <head><base href="."></head>
          <body></body>
        </html>
      `,
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness.expectFile('dist/index.html').content.toContain('<base href=".">');
    });
  });
});
