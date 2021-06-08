/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { execute } from '../../index';
import { BASE_OPTIONS, KARMA_BUILDER_INFO, describeBuilder } from '../setup';

describeBuilder(execute, KARMA_BUILDER_INFO, (harness) => {
  describe('Option: "include"', () => {
    it(`should fail when includes doesn't match any files`, async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        include: ['abc.spec.ts', 'def.spec.ts'],
      });

      const { error } = await harness.executeOnce({
        outputLogsOnException: false,
      });
      expect(error?.message).toBe(
        'Specified patterns: "abc.spec.ts, def.spec.ts" did not match any spec files.',
      );
    });

    [
      {
        test: 'relative path from workspace to spec',
        input: ['src/app/app.component.spec.ts'],
      },
      {
        test: 'relative path from workspace to file',
        input: ['src/app/app.component.ts'],
      },
      {
        test: 'relative path from project root to spec',
        input: ['app/services/test.service.spec.ts'],
      },
      {
        test: 'relative path from project root to file',
        input: ['app/services/test.service.ts'],
      },
      {
        test: 'relative path from workspace to directory',
        input: ['src/app/services'],
      },
      {
        test: 'relative path from project root to directory',
        input: ['app/services'],
      },
      {
        test: 'glob with spec suffix',
        input: ['**/*.pipe.spec.ts', '**/*.pipe.spec.ts', '**/*test.service.spec.ts'],
      },
    ].forEach((options, index) => {
      it(`should work with ${options.test} (${index})`, async () => {
        await harness.writeFiles({
          'src/app/services/test.service.spec.ts': `
            describe('TestService', () => {
              it('should succeed', () => {
                expect(true).toBe(true);
              });
            });`,
          'src/app/failing.service.spec.ts': `
            describe('FailingService', () => {
              it('should be ignored', () => {
                expect(true).toBe(false);
              });
            });`,
          'src/app/property.pipe.spec.ts': `
            describe('PropertyPipe', () => {
              it('should succeed', () => {
                expect(true).toBe(true);
              });
            });`,
        });

        harness.useTarget('test', {
          ...BASE_OPTIONS,
          include: options.input,
        });

        const { result } = await harness.executeOnce();
        expect(result?.success).toBeTrue();
      });
    });
  });
});
