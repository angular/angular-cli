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
  describe('transformSpies', () => {
    const testCases = [
      {
        description: 'should transform spyOn(object, "method") to vi.spyOn(object, "method")',
        input: `spyOn(service, 'myMethod');`,
        expected: `vi.spyOn(service, 'myMethod');`,
      },
      {
        description: 'should transform .and.returnValue(...) to .mockReturnValue(...)',
        input: `spyOn(service, 'myMethod').and.returnValue(42);`,
        expected: `vi.spyOn(service, 'myMethod').mockReturnValue(42);`,
      },
      {
        description: 'should transform .and.returnValues() to chained .mockReturnValueOnce() calls',
        input: `spyOn(service, 'myMethod').and.returnValues('a', 'b', 'c');`,
        expected: `vi.spyOn(service, 'myMethod').mockReturnValueOnce('a').mockReturnValueOnce('b').mockReturnValueOnce('c');`,
      },
      {
        description: 'should transform .and.callFake(...) to .mockImplementation(...)',
        input: `spyOn(service, 'myMethod').and.callFake(() => 'fake');`,
        expected: `vi.spyOn(service, 'myMethod').mockImplementation(() => 'fake');`,
      },
      {
        description: 'should remove .and.callThrough()',
        input: `spyOn(service, 'myMethod').and.callThrough();`,
        expected: `vi.spyOn(service, 'myMethod');`,
      },
      {
        description: 'should transform jasmine.createSpy("name") to vi.fn()',
        input: `const mySpy = jasmine.createSpy('mySpy');`,
        expected: `const mySpy = vi.fn();`,
      },
      {
        description: 'should transform jasmine.createSpy("name", fn) to vi.fn(fn)',
        input: `const mySpy = jasmine.createSpy('mySpy', () => 'foo');`,
        expected: `const mySpy = vi.fn(() => 'foo');`,
      },
      {
        description: 'should transform spyOnProperty(object, "prop") to vi.spyOn(object, "prop")',
        input: `spyOnProperty(service, 'myProp');`,
        expected: `vi.spyOn(service, 'myProp');`,
      },
      {
        description: 'should transform .and.stub() to .mockImplementation(() => {})',
        input: `spyOn(service, 'myMethod').and.stub();`,
        expected: `vi.spyOn(service, 'myMethod').mockImplementation(() => {});`,
      },
      {
        description: 'should add a TODO for jasmine.spyOnAllFunctions(object)',
        input: `jasmine.spyOnAllFunctions(myObject);`,
        // eslint-disable-next-line max-len
        expected: `// TODO: vitest-migration: Vitest does not have a direct equivalent for jasmine.spyOnAllFunctions(). Please spy on individual methods manually using vi.spyOn().
          jasmine.spyOnAllFunctions(myObject);
        `,
      },
      {
        description: 'should handle chained calls on jasmine.createSpy()',
        input: `const mySpy = jasmine.createSpy('mySpy').and.returnValue(true);`,
        expected: `const mySpy = vi.fn().mockReturnValue(true);`,
      },
      {
        description: 'should handle .and.returnValues() with no arguments',
        input: `spyOn(service, 'myMethod').and.returnValues();`,
        expected: `vi.spyOn(service, 'myMethod');`,
      },
      {
        description:
          'should transform .and.throwError("message") to .mockImplementation(() => { throw new Error("message") })',
        input: `spyOn(service, 'myMethod').and.throwError('Something went wrong');`,
        expected: `vi.spyOn(service, 'myMethod').mockImplementation(() => { throw new Error('Something went wrong') });`,
      },
      {
        description:
          'should transform .and.throwError(new Error("message")) to .mockImplementation(() => { throw new Error("message") })',
        input: `spyOn(service, 'myMethod').and.throwError(new Error('Custom Error'));`,
        expected: `vi.spyOn(service, 'myMethod').mockImplementation(() => { throw new Error('Custom Error') });`,
      },
      {
        description: 'should transform .and.resolveTo(value) to .mockResolvedValue(value)',
        input: `spyOn(service, 'myMethod').and.resolveTo('some value');`,
        expected: `vi.spyOn(service, 'myMethod').mockResolvedValue('some value');`,
      },
      {
        description: 'should transform .and.rejectWith(error) to .mockRejectedValue(error)',
        input: `spyOn(service, 'myMethod').and.rejectWith('some error');`,
        expected: `vi.spyOn(service, 'myMethod').mockRejectedValue('some error');`,
      },
    ];

    testCases.forEach(({ description, input, expected }) => {
      it(description, async () => {
        await expectTransformation(input, expected);
      });
    });
  });

  describe('transformCreateSpyObj', () => {
    const testCases = [
      {
        description: 'should transform jasmine.createSpyObj with an array of methods',
        input: `const myService = jasmine.createSpyObj('MyService', ['methodA', 'methodB']);`,
        expected: `const myService = {
          methodA: vi.fn(),
          methodB: vi.fn()
        };`,
      },
      {
        description: 'should add a TODO if the second argument is not a literal',
        input: `const myService = jasmine.createSpyObj('MyService', methodNames);`,
        expected: `
          // TODO: vitest-migration: Cannot transform jasmine.createSpyObj with a dynamic variable. Please migrate this manually.
          const myService = jasmine.createSpyObj('MyService', methodNames);
        `,
      },
      {
        description: 'should transform jasmine.createSpyObj with an object of return values',
        input: `const myService = jasmine.createSpyObj('MyService', { methodA: 'foo', methodB: 42 });`,
        expected: `const myService = {
          methodA: vi.fn().mockReturnValue('foo'),
          methodB: vi.fn().mockReturnValue(42)
        };`,
      },
      {
        description:
          'should transform jasmine.createSpyObj with an object of return values containing an asymmetric matcher',
        input: `const myService = jasmine.createSpyObj('MyService', { methodA: jasmine.any(String) });`,
        expected: `const myService = {
          methodA: vi.fn().mockReturnValue(expect.any(String))
        };`,
      },
      {
        description: 'should add a TODO for jasmine.createSpyObj with only one argument',
        input: `const myService = jasmine.createSpyObj('MyService');`,
        expected: `
          // TODO: vitest-migration: jasmine.createSpyObj called with a single argument is not supported for transformation.
          const myService = jasmine.createSpyObj('MyService');
        `,
      },
      {
        description: 'should transform jasmine.createSpyObj with a property map',
        input: `const myService = jasmine.createSpyObj('MyService', ['methodA'], { propA: 'valueA' });`,
        expected: `const myService = {
          methodA: vi.fn(),
          propA: 'valueA'
        };`,
      },
      {
        description: 'should transform jasmine.createSpyObj with a method map and a property map',
        input: `const myService = jasmine.createSpyObj('MyService', { methodA: 'foo' }, { propA: 'valueA' });`,
        expected: `const myService = {
          methodA: vi.fn().mockReturnValue('foo'),
          propA: 'valueA'
        };`,
      },
      {
        description: 'should ignore non-string literals in the method array',
        input: `const myService = jasmine.createSpyObj('MyService', ['methodA', 123, someVar]);`,
        expected: `const myService = {
          methodA: vi.fn()
        };`,
      },
    ];

    testCases.forEach(({ description, input, expected }) => {
      it(description, async () => {
        await expectTransformation(input, expected);
      });
    });
  });

  describe('transformSpyReset', () => {
    const testCases = [
      {
        description: 'should transform spy.calls.reset() to spy.mockClear()',
        input: `mySpy.calls.reset();`,
        expected: `mySpy.mockClear();`,
      },
    ];

    testCases.forEach(({ description, input, expected }) => {
      it(description, async () => {
        await expectTransformation(input, expected);
      });
    });
  });

  describe('transformSpyCallInspection', () => {
    const testCases = [
      {
        description: 'should transform spy.calls.any()',
        input: `expect(mySpy.calls.any()).toBe(true);`,
        expected: `expect(vi.mocked(mySpy).mock.calls.length > 0).toBe(true);`,
      },
      {
        description: 'should transform spy.calls.count()',
        input: `expect(mySpy.calls.count()).toBe(1);`,
        expected: `expect(vi.mocked(mySpy).mock.calls.length).toBe(1);`,
      },
      {
        description: 'should transform spy.calls.argsFor(0)',
        input: `const args = mySpy.calls.argsFor(0);`,
        expected: `const args = vi.mocked(mySpy).mock.calls[0];`,
      },
      {
        description: 'should transform spy.calls.allArgs()',
        input: `const allArgs = mySpy.calls.allArgs();`,
        expected: `const allArgs = vi.mocked(mySpy).mock.calls;`,
      },
      {
        description: 'should transform spy.calls.all()',
        input: `const allCalls = mySpy.calls.all();`,
        expected: `const allCalls = vi.mocked(mySpy).mock.calls;`,
      },
      {
        description: 'should transform spy.calls.mostRecent().args',
        input: `const recentArgs = mySpy.calls.mostRecent().args;`,
        expected: `const recentArgs = vi.mocked(mySpy).mock.lastCall;`,
      },
      {
        description: 'should transform spy.calls.first()',
        input: `const firstCall = mySpy.calls.first();`,
        expected: `const firstCall = vi.mocked(mySpy).mock.calls[0];`,
      },
      {
        description: 'should add a TODO for spy.calls.mostRecent() without .args',
        input: `const mostRecent = mySpy.calls.mostRecent();`,
        // eslint-disable-next-line max-len
        expected: `// TODO: vitest-migration: Direct usage of mostRecent() is not supported. Please refactor to access .args directly or use vi.mocked(spy).mock.lastCall.
const mostRecent = mySpy.calls.mostRecent();`,
      },
    ];

    testCases.forEach(({ description, input, expected }) => {
      it(description, async () => {
        await expectTransformation(input, expected);
      });
    });
  });
});
