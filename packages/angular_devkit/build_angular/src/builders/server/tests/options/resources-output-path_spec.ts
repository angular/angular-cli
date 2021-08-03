/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { execute } from '../../index';
import { BASE_OPTIONS, SERVER_BUILDER_INFO, describeBuilder } from '../setup';

describeBuilder(execute, SERVER_BUILDER_INFO, (harness) => {
  describe('Option: "resourcesOutputPath"', () => {
    beforeEach(async () => {
      const img = await harness.readFile('src/spectrum.png');

      await harness.writeFiles({
        'src/assets/component-img-relative.png': img,
        'src/assets/component-img-absolute.png': img,
        'src/app/app.component.css': `
            h3 { background: url('/assets/component-img-absolute.png'); }
            h4 { background: url('../assets/component-img-relative.png'); }
          `,
      });
    });

    it(`should prepend value of "resourcesOutputPath" as part of the resource urls`, async () => {
      harness.useTarget('server', {
        ...BASE_OPTIONS,
        resourcesOutputPath: 'out-assets',
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);

      harness
        .expectFile('dist/main.js')
        .content.toContain(`url(/assets/component-img-absolute.png)`);
      harness
        .expectFile('dist/main.js')
        .content.toContain(`url(out-assets/component-img-relative.png)`);

      // Assets are not emitted during a server builds.
      harness.expectFile('dist/out-assets/component-img-relative.png').toNotExist();
    });

    it(`should not prepend anything when value of "resourcesOutputPath" is unset.`, async () => {
      harness.useTarget('server', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);

      harness
        .expectFile('dist/main.js')
        .content.toContain(`url(/assets/component-img-absolute.png)`);
      harness.expectFile('dist/main.js').content.toContain(`url(component-img-relative.png)`);

      // Assets are not emitted during a server builds.
      harness.expectFile('dist/component-img-relative.png').toNotExist();
    });
  });
});
