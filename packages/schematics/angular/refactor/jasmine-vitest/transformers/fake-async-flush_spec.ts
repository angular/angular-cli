/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { expectTransformation } from '../test-helpers';

describe('transformFakeAsyncFlush', () => {
  const testCases = [
    {
      description: 'should replace `flush` with `await vi.runAllTimersAsync()`',
      input: `
          import { flush } from '@angular/core/testing';
          
          flush();
        `,
      expected: `await vi.runAllTimersAsync();`,
    },
    {
      description: 'should add TODO comment when flush is called with maxTurns',
      input: `
          import { flush } from '@angular/core/testing';

          flush(42);
        `,
      expected: `
          // TODO: vitest-migration: flush(maxTurns) was called but maxTurns parameter is not migrated. Please migrate manually.
          await vi.runAllTimersAsync();
        `,
    },
    {
      description: 'should add TODO comment when flush return value is used',
      input: `
          import { flush } from '@angular/core/testing';
          
          const turns = flush();
        `,
      expected: `
          // TODO: vitest-migration: flush() return value is not migrated. Please migrate manually.
          const turns = await vi.runAllTimersAsync() ?? 0;
        `,
    },
    {
      description: 'should add TODO comment when flush return value is used in a return statement',
      input: `
          import { flush } from '@angular/core/testing';
          
          async function myFlushWrapper() {
            return flush();
          }
        `,
      expected: `
         async function myFlushWrapper() {
            // TODO: vitest-migration: flush() return value is not migrated. Please migrate manually.
            return await vi.runAllTimersAsync() ?? 0;
          }
        `,
    },
    {
      description: 'should not replace `flush` if not imported from `@angular/core/testing`',
      input: `
          import { flush } from './my-flush';
          
          flush();
        `,
      expected: `
          import { flush } from './my-flush';
          
          flush();
        `,
    },
    {
      description: 'should keep other imported symbols from `@angular/core/testing`',
      input: `
          import { TestBed, flush } from '@angular/core/testing';
          
          flush();
        `,
      expected: `
          import { TestBed } from '@angular/core/testing';
          
          await vi.runAllTimersAsync();
        `,
    },
    {
      description: 'should keep imported types from `@angular/core/testing`',
      input: `
          import { flush, type ComponentFixture } from '@angular/core/testing';
          
          flush();
        `,
      expected: `
          import { type ComponentFixture } from '@angular/core/testing';
          
          await vi.runAllTimersAsync();
        `,
    },
  ];

  testCases.forEach(({ description, input, expected }) => {
    it(description, async () => {
      await expectTransformation(input, expected);
    });
  });
});
