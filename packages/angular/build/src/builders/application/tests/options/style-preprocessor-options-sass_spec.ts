/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { buildApplication } from '../../index';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder, expectNoLog } from '../setup';

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  describe('Option: "stylePreprocessorOptions.sass"', () => {
    it('should cause the build to fail when using `fatalDeprecations` in global styles', async () => {
      await harness.writeFile('src/styles.scss', 'p { color: darken(red, 10%) }');

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        styles: ['src/styles.scss'],
        stylePreprocessorOptions: {
          sass: {
            fatalDeprecations: ['color-functions'],
          },
        },
      });

      const { result, logs } = await harness.executeOnce({ outputLogsOnFailure: false });

      expect(result?.success).toBeFalse();
      expectNoLog(logs, 'darken() is deprecated');
    });

    it('should succeed without `fatalDeprecations` despite using deprecated color functions', async () => {
      await harness.writeFiles({
        'src/styles.scss': 'p { color: darken(red, 10%) }',
        'src/app/app.component.scss': 'p { color: darken(red, 10%) }',
      });

      await harness.modifyFile('src/app/app.component.ts', (content) => {
        return content.replace('./app.component.css', 'app.component.scss');
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        styles: ['src/styles.scss'],
        stylePreprocessorOptions: {
          sass: {},
        },
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBeTrue();
    });

    it('should cause the build to fail when using `fatalDeprecations` in component styles', async () => {
      await harness.modifyFile('src/app/app.component.ts', (content) => {
        return content.replace('./app.component.css', 'app.component.scss');
      });

      await harness.writeFile('src/app/app.component.scss', 'p { color: darken(red, 10%) }');

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        stylePreprocessorOptions: {
          sass: {
            fatalDeprecations: ['color-functions'],
          },
        },
      });

      const { result, logs } = await harness.executeOnce({
        outputLogsOnFailure: false,
      });

      expect(result?.success).toBeFalse();
      expectNoLog(logs, 'darken() is deprecated');
    });
  });
});
