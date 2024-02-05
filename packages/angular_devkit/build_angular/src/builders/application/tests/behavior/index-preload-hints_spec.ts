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
  describe('Behavior: "Preload hints"', () => {
    it('should add preload hints for transitive global style imports', async () => {
      await harness.writeFile(
        'src/styles.css',
        `
        @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono&family=Roboto:wght@300;400;500;700&display=swap');
      `,
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        styles: ['src/styles.css'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);

      harness
        .expectFile('dist/browser/index.html')
        .content.toContain(
          '<link rel="preload" href="https://fonts.googleapis.com/css2?family=Roboto+Mono&family=Roboto:wght@300;400;500;700&display=swap" as="style">',
        );
    });

    it('should not add preload hints for ssr files', async () => {
      await harness.modifyFile('src/tsconfig.app.json', (content) => {
        const tsConfig = JSON.parse(content);
        tsConfig.files ??= [];
        tsConfig.files.push('main.server.ts', 'server.ts');

        return JSON.stringify(tsConfig);
      });

      await harness.writeFile('src/server.ts', `console.log('Hello!');`);

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        server: 'src/main.server.ts',
        ssr: true,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness.expectFile('dist/server/main.server.mjs').toExist();

      harness
        .expectFile('dist/browser/index.html')
        .content.not.toMatch(/<link rel="modulepreload" href="chunk-\.+\.mjs">/);
    });
  });
});
