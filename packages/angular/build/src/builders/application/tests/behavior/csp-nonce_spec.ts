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
  describe('Behavior: "CSP Nonce"', () => {
    it('should add CSP nonce to scripts when optimization is disabled', async () => {
      await harness.modifyFile('src/index.html', (content) =>
        content.replace(/<app-root/g, '<app-root ngCspNonce="{% nonce %}" '),
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        polyfills: [],
        optimization: false,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      const indexFileContent = harness.expectFile('dist/browser/index.html').content;
      indexFileContent.toContain(
        '<script src="main.js" type="module" nonce="{% nonce %}"></script>',
      );
      indexFileContent.toContain('<app-root ngcspnonce="{% nonce %}"');
    });
  });
});
