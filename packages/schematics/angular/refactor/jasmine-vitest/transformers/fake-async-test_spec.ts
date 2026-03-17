/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { expectTransformation } from '../test-helpers';

describe('transformFakeAsyncTest', () => {
  const testCases = [
    {
      description: 'should transform fakeAsync test to `vi.useFakeTimers()`',
      input: `
          import { fakeAsync } from '@angular/core/testing';

          it('works', fakeAsync(() => {
            expect(1).toBe(1);
          }));
        `,
      expected: `
          it('works', async () => {
            vi.useFakeTimers();
            onTestFinished(() => {
              vi.useRealTimers();
            });
            expect(1).toBe(1);
          });
        `,
    },
    {
      description: 'should not replace `fakeAsync` if not imported from `@angular/core/testing`',
      input: `
          import { fakeAsync } from './my-fake-async';

          it('works', fakeAsync(() => {
            expect(1).toBe(1);
          }));
        `,
      expected: `
          import { fakeAsync } from './my-fake-async';

          it('works', fakeAsync(() => {
            expect(1).toBe(1);
          }));
        `,
    },
  ];

  testCases.forEach(({ description, input, expected }) => {
    it(description, async () => {
      await expectTransformation(input, expected);
    });
  });
});
