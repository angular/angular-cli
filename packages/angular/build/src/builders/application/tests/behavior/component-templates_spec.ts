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
  describe('Behavior: "Component Templates"', () => {
    it('should generate an error for a missing template', async () => {
      await harness.modifyFile('src/app/app.component.ts', (content) => {
        return content.replace('./app.component.html', './not-present.html');
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result, logs } = await harness.executeOnce({ outputLogsOnFailure: false });
      expect(result?.success).toBeFalse();
      expect(logs).toContain(
        jasmine.objectContaining({
          level: 'error',
          message: jasmine.stringContaining(`Could not find template file './not-present.html'`),
        }),
      );
    });
  });
});
