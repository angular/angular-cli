/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { NormalizedUnitTestBuilderOptions } from '../../options';
import KarmaTestRunner from './index';

describe('KarmaTestRunner', () => {
  describe('validateDependencies', () => {
    function createOptions(coverageEnabled: boolean): NormalizedUnitTestBuilderOptions {
      return {
        projectSourceRoot: '/non-existent',
        coverage: { enabled: coverageEnabled },
      } as NormalizedUnitTestBuilderOptions;
    }

    it('does not require karma-coverage when coverage is disabled', () => {
      expect(() => KarmaTestRunner.validateDependencies?.(createOptions(false))).toThrowError(
        /^(?!.*karma-coverage)/s,
      );
    });

    it('requires karma-coverage when coverage is enabled', () => {
      expect(() => KarmaTestRunner.validateDependencies?.(createOptions(true))).toThrowError(
        /karma-coverage/,
      );
    });
  });
});
