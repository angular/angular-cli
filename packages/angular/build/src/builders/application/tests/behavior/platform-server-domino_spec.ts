/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { buildApplication } from '../../index';
import { OutputMode, Platform } from '../../schema';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder } from '../setup';

/**
 * `@angular/platform-server/init` (bundled into the server polyfills) and
 * `@angular/platform-server` (bundled into the main server bundle) both import this file.
 */
const DOMINO_BUNDLE = 'third_party/domino/bundled-domino.mjs';

/** The export of the server polyfills bundle. The output may escape non-ASCII identifiers. */
const DOMINO_EXPORT = '(?:ɵ|\\\\u0275)domino';
const POLYFILLS_EXPORT_RE = new RegExp(`export \\{[^}]*${DOMINO_EXPORT}`);
const MAIN_IMPORT_RE = new RegExp(
  `import \\{\\s*${DOMINO_EXPORT}\\s*\\} from "\\./polyfills\\.server\\.mjs"`,
);

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  describe('Behavior: "Domino is bundled once for the server"', () => {
    beforeEach(async () => {
      await harness.modifyFile('src/tsconfig.app.json', (content) => {
        const tsConfig = JSON.parse(content);
        tsConfig.files ??= [];
        tsConfig.files.push('main.server.ts', 'server.ts');

        return JSON.stringify(tsConfig);
      });

      await harness.writeFile('src/server.ts', `console.log('Hello!');`);

      // The default template uses i18n which requires `@angular/localize` to prerender.
      await harness.writeFile('src/app/app.component.html', `<p>Hello!</p>`);
    });

    it('shares the server polyfills copy of Domino with the main server bundle', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        server: 'src/main.server.ts',
        ssr: true,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness.expectFile('dist/server/polyfills.server.mjs').content.toContain(DOMINO_BUNDLE);
      harness.expectFile('dist/server/polyfills.server.mjs').content.toMatch(POLYFILLS_EXPORT_RE);

      harness.expectFile('dist/server/main.server.mjs').content.not.toContain(DOMINO_BUNDLE);
      harness.expectFile('dist/server/main.server.mjs').content.toMatch(MAIN_IMPORT_RE);
    });

    it('shares the server polyfills copy of Domino when "outputMode" is "server"', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        server: 'src/main.server.ts',
        ssr: { entry: 'src/server.ts' },
        outputMode: OutputMode.Server,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness.expectFile('dist/server/polyfills.server.mjs').content.toContain(DOMINO_BUNDLE);
      harness.expectFile('dist/server/main.server.mjs').content.not.toContain(DOMINO_BUNDLE);
      harness.expectFile('dist/server/main.server.mjs').content.toMatch(MAIN_IMPORT_RE);
      harness.expectFile('dist/server/server.mjs').content.not.toContain(DOMINO_BUNDLE);
    });

    it('shares the server polyfills copy of Domino when "ssr.platform" is "neutral"', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        server: 'src/main.server.ts',
        ssr: { entry: 'src/server.ts', platform: Platform.Neutral },
        outputMode: OutputMode.Server,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness.expectFile('dist/server/polyfills.server.mjs').content.toContain(DOMINO_BUNDLE);
      harness.expectFile('dist/server/main.server.mjs').content.not.toContain(DOMINO_BUNDLE);
    });
  });
});
