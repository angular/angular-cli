/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { expectTransformation } from '../test-helpers';

describe('transformFakeAsyncFlushMicrotasks', () => {
  const testCases = [
    {
      description: 'should replace `flushMicrotasks` with `await vi.advanceTimersByTimeAsync(0)`',
      input: `
          import { flushMicrotasks } from '@angular/core/testing';
          
          flushMicrotasks();
        `,
      expected: `await vi.advanceTimersByTimeAsync(0);`,
    },
    {
      description:
        'should not replace `flushMicrotasks` if not imported from `@angular/core/testing`',
      input: `
          import { flushMicrotasks } from './my-flush-microtasks';
          
          flushMicrotasks();
        `,
      expected: `
          import { flushMicrotasks } from './my-flush-microtasks';
          
          flushMicrotasks();
        `,
    },
  ];

  testCases.forEach(({ description, input, expected }) => {
    it(description, async () => {
      await expectTransformation(input, expected);
    });
  });
});
