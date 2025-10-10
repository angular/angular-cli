/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { logging } from '@angular-devkit/core';
import { format } from 'prettier';
import { transformJasmineToVitest } from '../test-file-transformer';
import { RefactorReporter } from '../utils/refactor-reporter';

async function expectTransformation(input: string, expected: string): Promise<void> {
  const logger = new logging.NullLogger();
  const reporter = new RefactorReporter(logger);
  const transformed = transformJasmineToVitest('spec.ts', input, reporter);
  const formattedTransformed = await format(transformed, { parser: 'typescript' });
  const formattedExpected = await format(expected, { parser: 'typescript' });

  expect(formattedTransformed).toBe(formattedExpected);
}

describe('Jasmine to Vitest Transformer', () => {
  describe('transformAsymmetricMatchers', () => {
    const testCases = [
      {
        description: 'should transform jasmine.any(String) to expect.any(String)',
        input: `expect(foo).toEqual(jasmine.any(String));`,
        expected: `expect(foo).toEqual(expect.any(String));`,
      },
      {
        description:
          'should transform jasmine.objectContaining(...) to expect.objectContaining(...)',
        input: `expect(foo).toEqual(jasmine.objectContaining({ bar: 'baz' }));`,
        expected: `expect(foo).toEqual(expect.objectContaining({ bar: 'baz' }));`,
      },
      {
        description: 'should transform jasmine.anything() to expect.anything()',
        input: `expect(foo).toEqual(jasmine.anything());`,
        expected: `expect(foo).toEqual(expect.anything());`,
      },
      {
        description: 'should transform jasmine.stringMatching(...) to expect.stringMatching(...)',
        input: `expect(foo).toEqual(jasmine.stringMatching(/some-pattern/));`,
        expected: `expect(foo).toEqual(expect.stringMatching(/some-pattern/));`,
      },
      {
        description: 'should transform jasmine.arrayContaining(...) to expect.arrayContaining(...)',
        input: `expect(foo).toEqual(jasmine.arrayContaining(['a']));`,
        expected: `expect(foo).toEqual(expect.arrayContaining(['a']));`,
      },
      {
        description:
          'should transform jasmine.stringContaining(...) to expect.stringContaining(...)',
        input: `expect(foo).toEqual(jasmine.stringContaining('substring'));`,
        expected: `expect(foo).toEqual(expect.stringContaining('substring'));`,
      },
    ];

    testCases.forEach(({ description, input, expected }) => {
      it(description, async () => {
        await expectTransformation(input, expected);
      });
    });
  });

  describe('transformExpectAsync', () => {
    const testCases = [
      {
        description: 'should transform expectAsync(...).toBeResolved()',
        input: `await expectAsync(myPromise).toBeResolved();`,
        expected: `await expect(myPromise).resolves.not.toThrow();`,
      },
      {
        description: 'should transform expectAsync(...).toBeResolvedTo(value)',
        input: `await expectAsync(myPromise).toBeResolvedTo(42);`,
        expected: `await expect(myPromise).resolves.toEqual(42);`,
      },
      {
        description: 'should transform expectAsync(...).toBeRejected()',
        input: `await expectAsync(myPromise).toBeRejected();`,
        expected: `await expect(myPromise).rejects.toThrow();`,
      },
      {
        description: 'should transform expectAsync(...).toBeRejectedWith(error)',
        input: `await expectAsync(myPromise).toBeRejectedWith('Error');`,
        expected: `await expect(myPromise).rejects.toEqual('Error');`,
      },
      {
        description: 'should transform expectAsync(...).toBeRejectedWithError(ErrorClass, message)',
        input: `await expectAsync(myPromise).toBeRejectedWithError(TypeError, 'Failed');`,
        expected: `await expect(myPromise).rejects.toThrowError(TypeError, 'Failed');`,
      },
      {
        description: 'should add a TODO for an unknown expectAsync matcher',
        input: `await expectAsync(myPromise).toBeSomethingElse();`,
        expected: `
          // TODO: vitest-migration: Unsupported expectAsync matcher ".toBeSomethingElse()" found. Please migrate this manually.
          await expectAsync(myPromise).toBeSomethingElse();
        `,
      },
      {
        description: 'should add a specific TODO for toBePending',
        input: `await expectAsync(myPromise).toBePending();`,
        /* eslint-disable max-len */
        expected: `
          // TODO: vitest-migration: Unsupported matcher ".toBePending()" found. Vitest does not have a direct equivalent. Please migrate this manually, for example by using \`Promise.race\` to check if the promise settles within a short timeout.
          await expectAsync(myPromise).toBePending();
        `,
        /* eslint-enable max-len */
      },
    ];

    testCases.forEach(({ description, input, expected }) => {
      it(description, async () => {
        await expectTransformation(input, expected);
      });
    });
  });

  describe('transformCalledOnceWith', () => {
    const testCases = [
      {
        description: 'should transform toHaveBeenCalledOnceWith(...) into two separate calls',
        input: `expect(mySpy).toHaveBeenCalledOnceWith('foo', 'bar');`,
        expected: `
          expect(mySpy).toHaveBeenCalledTimes(1);
          expect(mySpy).toHaveBeenCalledWith('foo', 'bar');
        `,
      },
    ];

    testCases.forEach(({ description, input, expected }) => {
      it(description, async () => {
        await expectTransformation(input, expected);
      });
    });
  });

  describe('transformSyntacticSugarMatchers', () => {
    const testCases = [
      {
        description: 'should transform toBeTrue() to toBe(true)',
        input: `expect(value).toBeTrue();`,
        expected: `expect(value).toBe(true);`,
      },
      {
        description: 'should transform toBeFalse() to toBe(false)',
        input: `expect(value).toBeFalse();`,
        expected: `expect(value).toBe(false);`,
      },
      {
        description: 'should transform toBePositiveInfinity() to toBe(Infinity)',
        input: `expect(value).toBePositiveInfinity();`,
        expected: `expect(value).toBe(Infinity);`,
      },
      {
        description: 'should transform toBeNegativeInfinity() to toBe(-Infinity)',
        input: `expect(value).toBeNegativeInfinity();`,
        expected: `expect(value).toBe(-Infinity);`,
      },
      {
        description: 'should transform toHaveSize(number) to toHaveLength(number)',
        input: `expect(myArray).toHaveSize(3);`,
        expected: `expect(myArray).toHaveLength(3);`,
      },
      {
        description: 'should add a TODO for toThrowMatching',
        input: `expect(() => {}).toThrowMatching((e) => e.message === 'foo');`,
        expected: `// TODO: vitest-migration: Unsupported matcher ".toThrowMatching()" found. Please migrate this manually.
expect(() => {}).toThrowMatching((e) => e.message === 'foo');`,
      },
      {
        description: 'should add a TODO for toHaveSpyInteractions',
        input: `expect(mySpyObj).toHaveSpyInteractions();`,
        // eslint-disable-next-line max-len
        expected: `// TODO: vitest-migration: Unsupported matcher ".toHaveSpyInteractions()" found. Please migrate this manually by checking the \`mock.calls.length\` of the individual spies.
expect(mySpyObj).toHaveSpyInteractions();`,
      },
    ];

    testCases.forEach(({ description, input, expected }) => {
      it(description, async () => {
        await expectTransformation(input, expected);
      });
    });
  });

  describe('transformComplexMatchers', () => {
    const testCases = [
      {
        description: 'should transform toEqual(jasmine.truthy()) to toBeTruthy()',
        input: `expect(value).toEqual(jasmine.truthy());`,
        expected: `expect(value).toBeTruthy();`,
      },
      {
        description: 'should transform toEqual(jasmine.falsy()) to toBeFalsy()',
        input: `expect(value).toEqual(jasmine.falsy());`,
        expected: `expect(value).toBeFalsy();`,
      },
      {
        description: 'should transform toEqual(jasmine.empty()) to toHaveLength(0)',
        input: `expect([]).toEqual(jasmine.empty());`,
        expected: `expect([]).toHaveLength(0);`,
      },
      {
        description: 'should transform not.toEqual(jasmine.empty()) to not.toHaveLength(0)',
        input: `expect([1]).not.toEqual(jasmine.empty());`,
        expected: `expect([1]).not.toHaveLength(0);`,
      },
      {
        description: 'should transform toEqual(jasmine.notEmpty()) to not.toHaveLength(0)',
        input: `expect([1]).toEqual(jasmine.notEmpty());`,
        expected: `expect([1]).not.toHaveLength(0);`,
      },
      {
        description: 'should transform not.toEqual(jasmine.notEmpty()) to toHaveLength(0)',
        input: `expect([]).not.toEqual(jasmine.notEmpty());`,
        expected: `expect([]).toHaveLength(0);`,
      },
      {
        description: 'should transform toEqual(jasmine.is()) to toBe()',
        input: `expect(value).toEqual(jasmine.is(otherValue));`,
        expected: `expect(value).toBe(otherValue);`,
      },
    ];

    testCases.forEach(({ description, input, expected }) => {
      it(description, async () => {
        await expectTransformation(input, expected);
      });
    });
  });

  describe('transformArrayWithExactContents', () => {
    const testCases = [
      {
        description: 'should transform toEqual(jasmine.arrayWithExactContents()) into two calls',
        input: `expect(myArray).toEqual(jasmine.arrayWithExactContents(['a', 'b']));`,
        expected: `
          expect(myArray).toHaveLength(2);
          expect(myArray).toEqual(expect.arrayContaining(['a', 'b']));
        `,
      },
      {
        description:
          'should transform toEqual(jasmine.arrayWithExactContents()) with asymmetric matchers',
        input: `expect(myArray).toEqual(jasmine.arrayWithExactContents([jasmine.any(Number), 'a']));`,
        expected: `
          expect(myArray).toHaveLength(2);
          expect(myArray).toEqual(expect.arrayContaining([expect.any(Number), 'a']));
        `,
      },
      {
        description:
          'should add a TODO for toEqual(jasmine.arrayWithExactContents()) with a variable',
        input: `expect(myArray).toEqual(jasmine.arrayWithExactContents(someOtherArray));`,
        expected: `
          // TODO: vitest-migration: Cannot transform jasmine.arrayWithExactContents with a dynamic variable. Please migrate this manually.
          expect(myArray).toEqual(jasmine.arrayWithExactContents(someOtherArray));
        `,
      },
    ];

    testCases.forEach(({ description, input, expected }) => {
      it(description, async () => {
        await expectTransformation(input, expected);
      });
    });
  });

  describe('transformExpectNothing', () => {
    const testCases = [
      {
        description: 'should remove expect().nothing() and add a comment',
        input: `
          it('should be a passing test', () => {
            expect().nothing();
          });
        `,
        /* eslint-disable max-len */
        expected: `
          it('should be a passing test', () => {
            // TODO: vitest-migration: expect().nothing() has been removed because it is redundant in Vitest. Tests without assertions pass by default.
            // expect().nothing();
          });
        `,
        /* eslint-enable max-len */
      },
    ];

    testCases.forEach(({ description, input, expected }) => {
      it(description, async () => {
        await expectTransformation(input, expected);
      });
    });
  });

  describe('transformWithContext', () => {
    const testCases = [
      {
        description: 'should transform .withContext() to an expect message',
        input: `expect(value).withContext('It should be true').toBe(true);`,
        expected: `expect(value, 'It should be true').toBe(true);`,
      },
      {
        description: 'should handle chained matchers',
        input: `expect(value).withContext('It should not be false').not.toBe(false);`,
        expected: `expect(value, 'It should not be false').not.toBe(false);`,
      },
      {
        description: 'should handle .withContext() with no arguments by removing it',
        input: `expect(value).withContext().toBe(true);`,
        expected: `expect(value).toBe(true);`,
      },
    ];

    testCases.forEach(({ description, input, expected }) => {
      it(description, async () => {
        await expectTransformation(input, expected);
      });
    });
  });

  describe('transformtoHaveBeenCalledBefore', () => {
    const testCases = [
      {
        description: 'should transform toHaveBeenCalledBefore',
        input: `expect(spyA).toHaveBeenCalledBefore(spyB);`,
        // eslint-disable-next-line max-len
        expected: `expect(Math.min(...vi.mocked(spyA).mock.invocationCallOrder)).toBeLessThan(Math.min(...vi.mocked(spyB).mock.invocationCallOrder));`,
      },
      {
        description: 'should transform not.toHaveBeenCalledBefore',
        input: `expect(spyA).not.toHaveBeenCalledBefore(spyB);`,
        // eslint-disable-next-line max-len
        expected: `expect(Math.min(...vi.mocked(spyA).mock.invocationCallOrder)).toBeGreaterThanOrEqual(Math.min(...vi.mocked(spyB).mock.invocationCallOrder));`,
      },
    ];

    testCases.forEach(({ description, input, expected }) => {
      it(description, async () => {
        await expectTransformation(input, expected);
      });
    });
  });

  describe('transformToHaveClass', () => {
    const testCases = [
      {
        description: 'should transform toHaveClass',
        input: `expect(element).toHaveClass('my-class');`,
        expected: `expect(element.classList.contains('my-class')).toBe(true);`,
      },
      {
        description: 'should transform not.toHaveClass',
        input: `expect(element).not.toHaveClass('my-class');`,
        expected: `expect(element.classList.contains('my-class')).toBe(false);`,
      },
    ];

    testCases.forEach(({ description, input, expected }) => {
      it(description, async () => {
        await expectTransformation(input, expected);
      });
    });
  });
});
