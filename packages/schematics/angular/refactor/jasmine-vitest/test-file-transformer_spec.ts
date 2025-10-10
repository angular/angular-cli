/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { logging } from '@angular-devkit/core';
import { format } from 'prettier';
import { transformJasmineToVitest } from './test-file-transformer';
import { RefactorReporter } from './utils/refactor-reporter';

async function expectTransformation(input: string, expected: string): Promise<void> {
  const logger = new logging.NullLogger();
  const reporter = new RefactorReporter(logger);
  const transformed = transformJasmineToVitest('spec.ts', input, reporter);
  const formattedTransformed = await format(transformed, { parser: 'typescript' });
  const formattedExpected = await format(expected, { parser: 'typescript' });

  expect(formattedTransformed).toBe(formattedExpected);
}

describe('Jasmine to Vitest Transformer', () => {
  describe('Nested Transformations', () => {
    const testCases = [
      {
        description: 'should handle nested transforms like a spy returning an asymmetric matcher',
        input: `spyOn(service, 'getValue').and.returnValue(jasmine.any(Number));`,
        expected: `vi.spyOn(service, 'getValue').mockReturnValue(expect.any(Number));`,
      },
      {
        description: 'should handle expectAsync resolving to an asymmetric matcher',
        input: `await expectAsync(myPromise).toBeResolvedTo(jasmine.any(Number));`,
        expected: `await expect(myPromise).resolves.toEqual(expect.any(Number));`,
      },
      {
        description:
          'should handle spying on a property that returns a promise and using expectAsync',
        input: `
          spyOnProperty(service, 'myProp', 'get').and.returnValue(Promise.resolve(42));
          await expectAsync(service.myProp).toBeResolvedTo(42);
        `,
        expected: `
          vi.spyOn(service, 'myProp', 'get').mockReturnValue(Promise.resolve(42));
          await expect(service.myProp).resolves.toEqual(42);
        `,
      },
      {
        description: 'should handle a done callback that also uses timer mocks',
        input: `
          it('should handle timers and async', (done) => {
            jasmine.clock().install();
            setTimeout(() => {
              expect(true).toBe(true);
              jasmine.clock().uninstall();
              done();
            }, 100);
            jasmine.clock().tick(100);
          });
        `,
        expected: `
          it('should handle timers and async', async () => {
            vi.useFakeTimers();
            setTimeout(() => {
              expect(true).toBe(true);
              vi.useRealTimers();
            }, 100);
            vi.advanceTimersByTime(100);
          });
        `,
      },
      {
        description: 'should handle toHaveBeenCalledOnceWith using an asymmetric matcher',
        input: `expect(mySpy).toHaveBeenCalledOnceWith(jasmine.objectContaining({ id: 1 }));`,
        expected: `
          expect(mySpy).toHaveBeenCalledTimes(1);
          expect(mySpy).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
        `,
      },
      {
        description: 'should handle withContext combined with a multi-statement matcher',
        input: `expect(mySpy).withContext('custom message').toHaveBeenCalledOnceWith('foo');`,
        expected: `
          expect(mySpy, 'custom message').toHaveBeenCalledTimes(1);
          expect(mySpy, 'custom message').toHaveBeenCalledWith('foo');
        `,
      },
      {
        description: 'should handle createSpyObj with complex return values',
        input: `const spy = jasmine.createSpyObj('MyService', { getPromise: Promise.resolve(jasmine.any(String)) });`,
        expected: `
          const spy = {
            getPromise: vi.fn().mockReturnValue(Promise.resolve(expect.any(String))),
          };
        `,
      },
      {
        description: 'should handle arrayWithExactContents containing nested asymmetric matchers',
        input: `expect(myArray).toEqual(jasmine.arrayWithExactContents([jasmine.objectContaining({ id: 1 })]));`,
        expected: `
          expect(myArray).toHaveLength(1);
          expect(myArray).toEqual(expect.arrayContaining([expect.objectContaining({ id: 1 })]));
        `,
      },
      {
        description: 'should handle a spy rejecting with an asymmetric matcher',
        input: `spyOn(service, 'myMethod').and.rejectWith(jasmine.objectContaining({ code: 'ERROR' }));`,
        expected: `vi.spyOn(service, 'myMethod').mockRejectedValue(expect.objectContaining({ code: 'ERROR' }));`,
      },
      {
        description: 'should handle a complex spy object with a property map and subsequent spyOn',
        input: `
          const myService = jasmine.createSpyObj('MyService', ['methodA'], { propA: 'valueA' });
          spyOn(myService, 'methodA').and.returnValue('mocked value');
          myService.methodA('test');
          expect(myService.methodA).toHaveBeenCalledWith('test');
        `,
        expected: `
          const myService = {
            methodA: vi.fn(),
            propA: 'valueA'
          };
          vi.spyOn(myService, 'methodA').mockReturnValue('mocked value');
          myService.methodA('test');
          expect(myService.methodA).toHaveBeenCalledWith('test');
        `,
      },
    ];

    testCases.forEach(({ description, input, expected }) => {
      it(description, async () => {
        await expectTransformation(input, expected);
      });
    });
  });

  describe('Comment Preservation', () => {
    const testCases = [
      {
        description: 'should preserve a comment before a spy',
        input: `
          // This is an important spy
          spyOn(service, 'myMethod').and.returnValue(true);
        `,
        expected: `
          // This is an important spy
          vi.spyOn(service, 'myMethod').mockReturnValue(true);
        `,
      },
      {
        description: 'should preserve a multi-line comment between chained calls',
        input: `
          spyOn(service, 'myMethod')
            /*
             * This spy needs to return a specific value.
             */
            .and.returnValue(true);
        `,
        expected: `
          vi.spyOn(service, 'myMethod')
            /*
             * This spy needs to return a specific value.
             */
            .mockReturnValue(true);
        `,
        skipped: true,
      },
      {
        description: 'should preserve a trailing comment on a matcher line',
        input: `
          expect(mySpy).toHaveBeenCalledWith('foo'); // Trailing comment
        `,
        expected: `
          expect(mySpy).toHaveBeenCalledWith('foo'); // Trailing comment
        `,
      },
      {
        description: 'should preserve comments inside a done callback function',
        input: `
          it('should do something async', (done) => {
            // Start the async operation
            setTimeout(() => {
              // It's done now
              done();
            }, 100);
          });
        `,
        expected: `
          it('should do something async', async () => {
            // Start the async operation
            setTimeout(() => {
              // It's done now
            }, 100);
          });
        `,
      },
      {
        description: 'should preserve comments around a multi-statement transformation',
        input: `
          // Check if the spy was called correctly
          expect(mySpy).toHaveBeenCalledOnceWith('foo');
        `,
        expected: `
          // Check if the spy was called correctly
          expect(mySpy).toHaveBeenCalledTimes(1);
          expect(mySpy).toHaveBeenCalledWith('foo');
        `,
        skipped: true,
      },
    ];

    testCases.forEach(({ description, input, expected, skipped }) => {
      (skipped ? xit : it)(description, async () => {
        await expectTransformation(input, expected);
      });
    });
  });
});
