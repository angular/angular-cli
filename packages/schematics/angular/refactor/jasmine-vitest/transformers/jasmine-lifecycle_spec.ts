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
  describe('transformDoneCallback', () => {
    const testCases = [
      {
        description: 'should transform an `it` block with a done callback to an async function',
        input: `
          it('should do something async', (done) => {
            setTimeout(() => {
              expect(true).toBe(true);
              done();
            }, 100);
          });
        `,
        expected: `
          it('should do something async', async () => {
            setTimeout(() => {
              expect(true).toBe(true);
            }, 100);
          });
        `,
      },
      {
        description: 'should transform a promise chain with a done callback to await',
        input: `
          beforeEach((done) => {
            service.init().then(() => done());
          });
        `,
        expected: `
          beforeEach(async () => {
            await service.init().then(() => {});
          });
        `,
      },
      {
        description: 'should transform done.fail() to throw new Error()',
        input: `
          it('should fail', (done) => {
            done.fail('it failed');
          });
        `,
        expected: `
          it('should fail', async () => {
            throw new Error('it failed');
          });
        `,
      },
      {
        description: 'should transform an `afterEach` block with a done callback',
        input: 'afterEach((done) => { promise.then(done); });',
        expected: 'afterEach(async () => { await promise; });',
      },
      {
        description: 'should transform a test with a function(done) signature',
        input: `
          it('should work with a function expression', function(done) {
            done();
          });
        `,
        expected: `
          it('should work with a function expression', async function() {});
        `,
      },
      {
        description: 'should transform done.fail() without a message',
        input: `it('fails', (done) => { done.fail(); });`,
        expected: `it('fails', async () => { throw new Error(); });`,
      },
      {
        description: 'should handle promise rejections via catch',
        input: `
          it('should handle promise rejections via catch', (done) => {
            myPromise.catch(done.fail);
          });
        `,
        expected: `
          it('should handle promise rejections via catch', async () => {
            await myPromise;
          });
        `,
      },
      {
        description: 'should work with a custom done name',
        input: `
          it('should work with a custom done name', (finish) => {
            setTimeout(() => {
              finish();
            }, 100);
          });
        `,
        expected: `
          it('should work with a custom done name', async () => {
            setTimeout(() => {
            }, 100);
          });
        `,
      },
      {
        description: 'should handle done in a finally block',
        input: `
          it('should handle done in a finally block', (done) => {
            try {
              // some logic
            } finally {
              done();
            }
          });
        `,
        expected: `
          it('should handle done in a finally block', async () => {
            try {
              // some logic
            } finally {}
          });
        `,
      },
      {
        description: 'should not transform a function with a parameter that is not a done callback',
        input: `
          it('should not transform a function with a parameter that is not a done callback', (value) => {
            expect(value).toBe(true);
          });
        `,
        expected: `
          it('should not transform a function with a parameter that is not a done callback', (value) => {
            expect(value).toBe(true);
          });
        `,
      },
      {
        description: 'should handle a .then() call with a multi-statement body',
        input: `
          it('should handle a complex then', (done) => {
            let myValue = false;
            myPromise.then(() => {
              myValue = true;
              done();
            });
          });
        `,
        expected: `
          it('should handle a complex then', async () => {
            let myValue = false;
            await myPromise.then(() => {
              myValue = true;
            });
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

  describe('transformPending', () => {
    const testCases = [
      {
        description: 'should transform a test with pending() to it.skip()',
        input: `
          it('is a work in progress', () => {
            pending('Not yet implemented');
          });
        `,
        expected: `
          it.skip('is a work in progress', () => {
              // TODO: vitest-migration: The pending() function was converted to a skipped test (\`it.skip\`).
              // pending('Not yet implemented');
          });
        `,
      },
      {
        description: 'should transform a test with pending() using function keyword',
        input: `
          it('is a work in progress', function() {
            pending('Not yet implemented');
          });
        `,
        expected: `
          it.skip('is a work in progress', function() {
              // TODO: vitest-migration: The pending() function was converted to a skipped test (\`it.skip\`).
              // pending('Not yet implemented');
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

  describe('transformFocusedAndSkippedTests', () => {
    const testCases = [
      {
        description: 'should transform fdescribe to describe.only',
        input: `fdescribe('My Suite', () => {});`,
        expected: `describe.only('My Suite', () => {});`,
      },
      {
        description: 'should transform fit to it.only',
        input: `fit('My Test', () => {});`,
        expected: `it.only('My Test', () => {});`,
      },
      {
        description: 'should transform xdescribe to describe.skip',
        input: `xdescribe('My Suite', () => {});`,
        expected: `describe.skip('My Suite', () => {});`,
      },
      {
        description: 'should transform xit to it.skip',
        input: `xit('My Test', () => {});`,
        expected: `it.skip('My Test', () => {});`,
      },
    ];

    testCases.forEach(({ description, input, expected }) => {
      it(description, async () => {
        await expectTransformation(input, expected);
      });
    });
  });
});
