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
  describe('Behavior: "Component Stylesheets"', () => {
    it('should successfuly compile with an empty inline style', async () => {
      await harness.modifyFile('src/app/app.component.ts', (content) => {
        return content.replace('styleUrls', 'styles').replace('./app.component.css', '');
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });
  });
});
