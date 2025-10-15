/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { expectTransformation } from '../test-helpers';

describe('Jasmine to Vitest Transformer', () => {
  describe('transformTimerMocks', () => {
    const testCases = [
      {
        description: 'should transform jasmine.clock().install() to vi.useFakeTimers()',
        input: `jasmine.clock().install();`,
        expected: `vi.useFakeTimers();`,
      },
      {
        description: 'should transform jasmine.clock().tick(100) to vi.advanceTimersByTime(100)',
        input: `jasmine.clock().tick(100);`,
        expected: `vi.advanceTimersByTime(100);`,
      },
      {
        description: 'should transform jasmine.clock().uninstall() to vi.useRealTimers()',
        input: `jasmine.clock().uninstall();`,
        expected: `vi.useRealTimers();`,
      },
      {
        description: 'should transform jasmine.clock().mockDate(date) to vi.setSystemTime(date)',
        input: `jasmine.clock().mockDate(new Date('2025-01-01'));`,
        expected: `vi.setSystemTime(new Date('2025-01-01'));`,
      },
    ];

    testCases.forEach(({ description, input, expected }) => {
      it(description, async () => {
        await expectTransformation(input, expected);
      });
    });
  });

  describe('transformFail', () => {
    const testCases = [
      {
        description: 'should transform fail() to throw new Error()',
        input: `fail('This should not happen');`,
        expected: `throw new Error('This should not happen');`,
      },
      {
        description: 'should transform fail() without a message to throw new Error()',
        input: `fail();`,
        expected: `throw new Error();`,
      },
    ];

    testCases.forEach(({ description, input, expected }) => {
      it(description, async () => {
        await expectTransformation(input, expected);
      });
    });
  });

  describe('transformDefaultTimeoutInterval', () => {
    const testCases = [
      {
        description: 'should transform jasmine.DEFAULT_TIMEOUT_INTERVAL',
        input: `jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;`,
        expected: `vi.setConfig({ testTimeout: 10000 });`,
      },
    ];

    testCases.forEach(({ description, input, expected }) => {
      it(description, async () => {
        await expectTransformation(input, expected);
      });
    });
  });

  describe('transformAddMatchers', () => {
    const testCases = [
      {
        description: 'should add a TODO for jasmine.addMatchers',
        input: `
          jasmine.addMatchers({
            toBeDivisibleByTwo: function() {
              return {
                compare: function(actual) {
                  return {
                    pass: actual % 2 === 0
                  };
                }
              };
            }
          });
        `,
        expected: `
          // TODO: vitest-migration: jasmine.addMatchers is not supported. Please manually migrate to expect.extend(). See: https://vitest.dev/api/expect.html#expect-extend
          jasmine.addMatchers({
            toBeDivisibleByTwo: function () {
              return {
                compare: function (actual) {
                  return {
                    pass: actual % 2 === 0,
                  };
                },
              };
            },
          });
        `,
      },
    ];

    testCases.forEach(({ description, input, expected }) => {
      it(description, async () => {
        await expectTransformation(input, expected);
      });
    });
  });

  describe('transformAddCustomEqualityTester', () => {
    const testCases = [
      {
        description: 'should add a TODO for jasmine.addCustomEqualityTester',
        input: `
          jasmine.addCustomEqualityTester((a, b) => {
            return a.toString() === b.toString();
          });
        `,
        // eslint-disable-next-line max-len
        expected: `// TODO: vitest-migration: jasmine.addCustomEqualityTester is not supported. Please manually migrate to expect.addEqualityTesters(). See: https://vitest.dev/api/expect.html#expect-addequalitytesters
          jasmine.addCustomEqualityTester((a, b) => {
            return a.toString() === b.toString();
          });
        `,
      },
    ];

    testCases.forEach(({ description, input, expected }) => {
      it(description, async () => {
        await expectTransformation(input, expected);
      });
    });
  });

  describe('transformUnknownJasmineProperties', () => {
    const testCases = [
      {
        description: 'should add a TODO for an unknown jasmine property',
        input: `const env = jasmine.getEnv();`,
        expected: `// TODO: vitest-migration: Unsupported jasmine property "getEnv" found. Please migrate this manually.
const env = jasmine.getEnv();`,
      },
      {
        description: 'should not add a TODO for a known jasmine property',
        input: `const spy = jasmine.createSpy();`,
        expected: `const spy = vi.fn();`,
      },
    ];

    testCases.forEach(({ description, input, expected }) => {
      it(description, async () => {
        await expectTransformation(input, expected);
      });
    });
  });

  describe('transformGlobalFunctions', () => {
    const testCases = [
      {
        description: 'should add a TODO for setSpecProperty',
        input: `setSpecProperty('myKey', 'myValue');`,
        // eslint-disable-next-line max-len
        expected: `// TODO: vitest-migration: Unsupported global function \`setSpecProperty\` found. This function is used for custom reporters in Jasmine and has no direct equivalent in Vitest.
setSpecProperty('myKey', 'myValue');`,
      },
      {
        description: 'should add a TODO for setSuiteProperty',
        input: `setSuiteProperty('myKey', 'myValue');`,
        // eslint-disable-next-line max-len
        expected: `// TODO: vitest-migration: Unsupported global function \`setSuiteProperty\` found. This function is used for custom reporters in Jasmine and has no direct equivalent in Vitest.
setSuiteProperty('myKey', 'myValue');`,
      },
    ];

    testCases.forEach(({ description, input, expected }) => {
      it(description, async () => {
        await expectTransformation(input, expected);
      });
    });
  });

  describe('transformUnsupportedJasmineCalls', () => {
    const testCases = [
      {
        description: 'should add a TODO for jasmine.mapContaining',
        input: `expect(myMap).toEqual(jasmine.mapContaining(new Map()));`,
        // eslint-disable-next-line max-len
        expected: `// TODO: vitest-migration: jasmine.mapContaining is not supported. Vitest does not have a built-in matcher for Maps. Please manually assert the contents of the Map.
expect(myMap).toEqual(jasmine.mapContaining(new Map()));`,
      },
      {
        description: 'should add a TODO for jasmine.setContaining',
        input: `expect(mySet).toEqual(jasmine.setContaining(new Set()));`,
        // eslint-disable-next-line max-len
        expected: `// TODO: vitest-migration: jasmine.setContaining is not supported. Vitest does not have a built-in matcher for Sets. Please manually assert the contents of the Set.
expect(mySet).toEqual(jasmine.setContaining(new Set()));`,
      },
    ];

    testCases.forEach(({ description, input, expected }) => {
      it(description, async () => {
        await expectTransformation(input, expected);
      });
    });
  });
});
