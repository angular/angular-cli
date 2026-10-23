/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { expectTransformation } from '../test-helpers';

describe('Jasmine to Vitest Transformer - transformSpies', () => {
  const testCases = [
    {
      description:
        'should transform spyOn(object, "method") to vi.spyOn(object, "method").mockReturnValue(undefined)',
      input: `spyOn(service, 'myMethod');`,
      expected: `vi.spyOn(service, 'myMethod').mockReturnValue(undefined);`,
    },
    {
      description: 'should transform .and.returnValue(...) to .mockReturnValue(...)',
      input: `spyOn(service, 'myMethod').and.returnValue(42);`,
      expected: `vi.spyOn(service, 'myMethod').mockReturnValue(42);`,
    },
    {
      description:
        'should transform .and.returnValue(Promise.resolve(...)) to .mockResolvedValue(...)',
      input: `spyOn(service, 'myMethod').and.returnValue(Promise.resolve(42));`,
      expected: `vi.spyOn(service, 'myMethod').mockResolvedValue(42);`,
    },
    {
      description:
        'should transform .and.returnValue(Promise.reject(...)) to .mockRejectedValue(...)',
      input: `spyOn(service, 'myMethod').and.returnValue(Promise.reject(42));`,
      expected: `vi.spyOn(service, 'myMethod').mockRejectedValue(42);`,
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
      description: 'should remove .and.callThrough() on a wrapped spyOn call',
      input: `(spyOn(service, 'myMethod')!).and.callThrough();`,
      expected: `(vi.spyOn(service, 'myMethod')!);`,
    },
    {
      description: 'should add a TODO for .and.callThrough() on an existing spy',
      input: `mySpy.and.callThrough();`,
      expected: `// TODO: vitest-migration: Vitest does not have a direct equivalent for .and.callThrough() on an existing spy. Please migrate this manually, for example with spy.mockReset(), which restores the original implementation but also clears the recorded calls. See: https://vitest.dev/api/mock.html#mockreset
mySpy.and.callThrough();`,
    },
    {
      description: 'should transform jasmine.createSpy("name") to vi.fn().mockName("name")',
      input: `const mySpy = jasmine.createSpy('mySpy');`,
      expected: `const mySpy = vi.fn().mockName('mySpy');`,
    },
    {
      description: 'should transform jasmine.createSpy("name", fn) to vi.fn(fn).mockName("name")',
      input: `const mySpy = jasmine.createSpy('mySpy', () => 'foo');`,
      expected: `const mySpy = vi.fn(() => 'foo').mockName('mySpy');`,
    },
    {
      description:
        'should transform spyOnProperty(object, "prop") to vi.spyOn(object, "prop", "get").mockReturnValue(undefined)',
      input: `spyOnProperty(service, 'myProp');`,
      expected: `vi.spyOn(service, 'myProp', 'get').mockReturnValue(undefined);`,
    },
    {
      description: 'should default the access type of a chained spyOnProperty to "get"',
      input: `spyOnProperty(service, 'myProp').and.returnValue(42);`,
      expected: `vi.spyOn(service, 'myProp', 'get').mockReturnValue(42);`,
    },
    {
      description: 'should keep an explicit spyOnProperty access type',
      input: `spyOnProperty(service, 'myProp', 'set');`,
      expected: `vi.spyOn(service, 'myProp', 'set').mockReturnValue(undefined);`,
    },
    {
      description: 'should transform .and.stub() to .mockImplementation(() => {})',
      input: `spyOn(service, 'myMethod').and.stub();`,
      expected: `vi.spyOn(service, 'myMethod').mockImplementation(() => {});`,
    },
    {
      description: 'should add a TODO for jasmine.spyOnAllFunctions(object)',
      input: `jasmine.spyOnAllFunctions(myObject);`,
      expected: `// TODO: vitest-migration: Vitest does not have a direct equivalent for jasmine.spyOnAllFunctions(). Please spy on individual methods manually using vi.spyOn(). See: https://vitest.dev/api/vi.html#vi-spyon
          jasmine.spyOnAllFunctions(myObject);
        `,
    },
    {
      description: 'should handle chained calls on jasmine.createSpy()',
      input: `const mySpy = jasmine.createSpy('mySpy').and.returnValue(true);`,
      expected: `const mySpy = vi.fn().mockName('mySpy').mockReturnValue(true);`,
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
    {
      description: 'should transform .and.identity() to .getMockName()',
      input: `spyOn(service, 'myMethod').and.identity();`,
      expected: `vi.spyOn(service, 'myMethod').getMockName();`,
    },
    {
      description: 'should add a TODO for an unsupported spy strategy',
      input: `spyOn(service, 'myMethod').and.unknownStrategy();`,
      expected: `// TODO: vitest-migration: Unsupported spy strategy ".and.unknownStrategy()" found. Please migrate this manually. See: https://vitest.dev/api/mocked.html#mock
vi.spyOn(service, 'myMethod').and.unknownStrategy();`,
    },
    {
      description: 'should correctly identify chained spies with element access (bracket notation)',
      input: `spyOn(service, 'myMethod')['and'].returnValue(42);`,
      expected: `vi.spyOn(service, 'myMethod').mockReturnValue(42);`,
    },
    {
      description: 'should correctly identify chained spies with non-null assertion',
      input: `(spyOn(service, 'myMethod')!).and.returnValue(42);`,
      expected: `(vi.spyOn(service, 'myMethod')!).mockReturnValue(42);`,
    },
    {
      description: 'should correctly identify chained spies with type assertion',
      input: `(<any>spyOn(service, 'myMethod')).and.returnValue(42);`,
      expected: `(<any>vi.spyOn(service, 'myMethod')).mockReturnValue(42);`,
    },
    {
      description: 'should correctly identify chained spies with satisfies expression',
      input: `(spyOn(service, 'myMethod') satisfies any).and.returnValue(42);`,
      expected: `(vi.spyOn(service, 'myMethod') satisfies any).mockReturnValue(42);`,
    },
    {
      description: 'should handle and.returnValue() without arguments defensively',
      input: `spyOn(service, 'myMethod').and.returnValue();`,
      expected: `vi.spyOn(service, 'myMethod').mockReturnValue();`,
    },
    {
      description: 'should handle and.throwError() without arguments defensively',
      input: `spyOn(service, 'myMethod').and.throwError();`,
      expected: `vi.spyOn(service, 'myMethod').mockImplementation(() => { throw new Error() });`,
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
          methodA: vi.fn().mockName("MyService.methodA"),
          methodB: vi.fn().mockName("MyService.methodB"),
        };`,
    },
    {
      description:
        'should transform jasmine.createSpyObj with an array of methods without base name',
      input: `const myService = jasmine.createSpyObj(['methodA', 'methodB']);`,
      expected: `const myService = {
          methodA: vi.fn(),
          methodB: vi.fn(),
        };`,
    },
    {
      description: 'should add a TODO if the second argument is not a literal',
      input: `const myService = jasmine.createSpyObj('MyService', methodNames);`,
      expected: `
          // TODO: vitest-migration: Cannot transform jasmine.createSpyObj with a dynamic variable. Please migrate this manually. See: https://vitest.dev/api/vi.html#vi-fn
          const myService = jasmine.createSpyObj('MyService', methodNames);
        `,
    },
    {
      description: 'should transform jasmine.createSpyObj with an object of return values',
      input: `const myService = jasmine.createSpyObj('MyService', { methodA: 'foo', methodB: 42 });`,
      expected: `const myService = {
          methodA: vi.fn().mockName("MyService.methodA").mockReturnValue('foo'),
          methodB: vi.fn().mockName("MyService.methodB").mockReturnValue(42),
        };`,
    },
    {
      description:
        'should transform jasmine.createSpyObj with an object of return values without base name',
      input: `const myService = jasmine.createSpyObj({ methodA: 'foo', methodB: 42 });`,
      expected: `const myService = {
          methodA: vi.fn().mockReturnValue('foo'),
          methodB: vi.fn().mockReturnValue(42),
        };`,
    },
    {
      description:
        'should transform jasmine.createSpyObj with an object of return values containing an asymmetric matcher',
      input: `const myService = jasmine.createSpyObj('MyService', { methodA: jasmine.any(String) });`,
      expected: `const myService = {
          methodA: vi.fn().mockName("MyService.methodA").mockReturnValue(expect.any(String)),
        };`,
    },
    {
      description: 'should add a TODO for jasmine.createSpyObj with only base name argument',
      input: `const myService = jasmine.createSpyObj('MyService');`,
      expected: `
          // TODO: vitest-migration: jasmine.createSpyObj called with a single argument is not supported for transformation. See: https://vitest.dev/api/vi.html#vi-fn
          const myService = jasmine.createSpyObj('MyService');
        `,
    },
    {
      description: 'should transform jasmine.createSpyObj with a property map',
      input: `const myService = jasmine.createSpyObj('MyService', ['methodA'], { propA: 'valueA' });`,
      expected: `const myService = {
          methodA: vi.fn().mockName("MyService.methodA"),
          propA: 'valueA',
        };`,
    },
    {
      description: 'should transform jasmine.createSpyObj with a method map and a property map',
      input: `const myService = jasmine.createSpyObj('MyService', { methodA: 'foo' }, { propA: 'valueA' });`,
      expected: `const myService = {
          methodA: vi.fn().mockName("MyService.methodA").mockReturnValue('foo'),
          propA: 'valueA',
        };`,
    },
    {
      description:
        'should transform jasmine.createSpyObj with a method map and a property map without base name',
      input: `const myService = jasmine.createSpyObj({ methodA: 'foo' }, { propA: 'valueA' });`,
      expected: `const myService = {
          methodA: vi.fn().mockReturnValue('foo'),
          propA: 'valueA',
        };`,
    },
    {
      description: 'should ignore non-string literals in the method array',
      input: `const myService = jasmine.createSpyObj('MyService', ['methodA', 123, someVar]);`,
      expected: `const myService = {
          methodA: vi.fn().mockName("MyService.methodA"),
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
      description: 'should transform spy.calls.all()[i].args',
      input: `expect(mySpy.calls.all()[2].args[0]).toBeInstanceOf(RemoveShareUrlAction);`,
      expected: `expect(vi.mocked(mySpy).mock.calls[2][0]).toBeInstanceOf(RemoveShareUrlAction);`,
    },
    {
      description: 'should transform spy.calls.mostRecent().args',
      input: `const recentArgs = mySpy.calls.mostRecent().args;`,
      expected: `const recentArgs = vi.mocked(mySpy).mock.lastCall;`,
    },
    {
      description: 'should transform spy.calls.thisFor(index)',
      input: `const context = mySpy.calls.thisFor(1337);`,
      expected: `const context = vi.mocked(mySpy).mock.contexts[1337];`,
    },
    {
      description: 'should transform spy.calls.first()',
      input: `const firstCall = mySpy.calls.first();`,
      expected: `const firstCall = vi.mocked(mySpy).mock.calls[0];`,
    },
    {
      description: 'should transform spy.calls.first().args',
      input: `const firstArgs = mySpy.calls.first().args;`,
      expected: `const firstArgs = vi.mocked(mySpy).mock.calls[0];`,
    },
    {
      description: 'should transform spy.calls.first().args[i]',
      input: `expect(mySpy.calls.first().args[0]).toBe(1);`,
      expected: `expect(vi.mocked(mySpy).mock.calls[0][0]).toBe(1);`,
    },
    {
      description: 'should transform spy.calls.first().returnValue',
      input: `const firstResult = mySpy.calls.first().returnValue;`,
      expected: `const firstResult = vi.mocked(mySpy).mock.results[0].value;`,
    },
    {
      description: 'should transform spy.calls.first().object',
      input: `const firstThis = mySpy.calls.first().object;`,
      expected: `const firstThis = vi.mocked(mySpy).mock.contexts[0];`,
    },
    {
      description: 'should transform spy.calls.mostRecent().returnValue',
      input: `const recentResult = mySpy.calls.mostRecent().returnValue;`,
      expected: `const recentResult = vi.mocked(mySpy).mock.results.at(-1)?.value;`,
    },
    {
      description: 'should transform spy.calls.mostRecent().object',
      input: `const recentThis = mySpy.calls.mostRecent().object;`,
      expected: `const recentThis = vi.mocked(mySpy).mock.contexts.at(-1);`,
    },
    {
      description: 'should transform spy.calls.all()[i].returnValue',
      input: `expect(mySpy.calls.all()[1].returnValue).toBe(42);`,
      expected: `expect(vi.mocked(mySpy).mock.results[1].value).toBe(42);`,
    },
    {
      description: 'should transform spy.calls.all()[i].object',
      input: `expect(mySpy.calls.all()[1].object).toBe(service);`,
      expected: `expect(vi.mocked(mySpy).mock.contexts[1]).toBe(service);`,
    },
    {
      description: 'should transform CallInfo properties with non-null assertions',
      input: `
        const recentArgs = mySpy.calls.mostRecent()!.args;
        const firstResult = mySpy.calls.first()!.returnValue;
        const indexedThis = mySpy.calls.all()[1]!.object;
      `,
      expected: `
        const recentArgs = vi.mocked(mySpy).mock.lastCall;
        const firstResult = vi.mocked(mySpy).mock.results[0].value;
        const indexedThis = vi.mocked(mySpy).mock.contexts[1];
      `,
    },
    {
      description: 'should transform CallInfo properties with parenthesized expressions',
      input: `const firstResult = (mySpy.calls.first()).returnValue;`,
      expected: `const firstResult = vi.mocked(mySpy).mock.results[0].value;`,
    },
    {
      description: 'should transform CallInfo properties with type assertions',
      input: `
        const recentArgs = (mySpy.calls.mostRecent() as jasmine.CallInfo).args;
        const firstResult = (<jasmine.CallInfo>mySpy.calls.first()).returnValue;
        const indexedThis = (mySpy.calls.all()[1] satisfies jasmine.CallInfo).object;
      `,
      expected: `
        const recentArgs = vi.mocked(mySpy).mock.lastCall;
        const firstResult = vi.mocked(mySpy).mock.results[0].value;
        const indexedThis = vi.mocked(mySpy).mock.contexts[1];
      `,
    },
    {
      description: 'should transform spy.calls.all()[i] properties when the all() call is wrapped',
      input: `
        const parenthesizedArgs = (mySpy.calls.all())[1].args;
        const assertedArgs = mySpy.calls.all()![1].args;
      `,
      expected: `
        const parenthesizedArgs = vi.mocked(mySpy).mock.calls[1];
        const assertedArgs = vi.mocked(mySpy).mock.calls[1];
      `,
    },
    {
      description: 'should preserve optional chaining on CallInfo returnValue accesses',
      input: `
        const firstResult = mySpy.calls.first()?.returnValue;
        const indexedResult = mySpy.calls.all()[1]?.returnValue;
        const recentResult = mySpy.calls.mostRecent()?.returnValue;
      `,
      expected: `
        const firstResult = vi.mocked(mySpy).mock.results[0]?.value;
        const indexedResult = vi.mocked(mySpy).mock.results[1]?.value;
        const recentResult = vi.mocked(mySpy).mock.results.at(-1)?.value;
      `,
    },
    {
      description: 'should add a TODO for spy.calls.mostRecent() without .args',
      input: `const mostRecent = mySpy.calls.mostRecent();`,
      expected: `// TODO: vitest-migration: Direct usage of mostRecent() is not supported. Please refactor to access .args, .returnValue, or .object directly or use vi.mocked(spy).mock.lastCall. See: https://vitest.dev/api/mocked.html#mock-lastcall
const mostRecent = mySpy.calls.mostRecent();`,
    },
    {
      description: 'should add a TODO for spy.calls.saveArgumentsByValue()',
      input: `const saveArgs = mySpy.calls.saveArgumentsByValue();`,
      expected:
        '// TODO: vitest-migration: Vitest does not have a direct equivalent for spy.calls.saveArgumentsByValue().' +
        ' Please migrate this manually by cloning and storing the arguments in a local variable.' +
        '\nconst saveArgs = mySpy.calls.saveArgumentsByValue();',
    },
  ];

  testCases.forEach(({ description, input, expected }) => {
    it(description, async () => {
      await expectTransformation(input, expected);
    });
  });
});
