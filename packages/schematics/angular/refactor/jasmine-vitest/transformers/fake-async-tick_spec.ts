/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { expectTransformation } from '../test-helpers';

describe('transformFakeAsyncTick', () => {
  const testCases = [
    {
      description: 'should replace `tick` with `vi.advanceTimersByTimeAsync`',
      input: `
          import { tick } from '@angular/core/testing';
          
          tick(100);
        `,
      expected: `await vi.advanceTimersByTimeAsync(100);`,
    },
    {
      description:
        'should replace `tick` with `vi.advanceTimersByTimeAsync` even if it using a non-literal argument',
      input: `
          import { tick } from '@angular/core/testing';

          const duration = 100;
          tick(duration);
        `,
      expected: `
          const duration = 100;
          await vi.advanceTimersByTimeAsync(duration);
      `,
    },
    {
      description: 'should replace `tick()` with `vi.advanceTimersByTimeAsync(0)`',
      input: `
          import { tick } from '@angular/core/testing';
          
          tick();
        `,
      expected: `await vi.advanceTimersByTimeAsync(0);`,
    },
    {
      description: 'should not replace `tick` if not imported from `@angular/core/testing`',
      input: `
          import { tick } from './my-tick';
          
          tick(100);
        `,
      expected: `
          import { tick } from './my-tick';
          
          tick(100);
        `,
    },
  ];

  testCases.forEach(({ description, input, expected }) => {
    it(description, async () => {
      await expectTransformation(input, expected);
    });
  });
});
