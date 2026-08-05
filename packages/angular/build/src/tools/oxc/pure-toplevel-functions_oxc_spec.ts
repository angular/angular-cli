/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { transform } from './oxc-transform';

function cleanCode(code: string): string {
  return code
    .replace(/\s+/g, '')
    .replace(/"/g, "'")
    .replace(/;}/g, '}')
    .replace(/,([}\])])/g, '$1');
}

function testCase({
  input,
  expected,
  options,
}: {
  input: string;
  expected: string;
  options?: { topLevelSafeMode: boolean };
}): jasmine.ImplementationCallback {
  return async () => {
    const result = transform('test.js', input, {
      sourcemap: false,
      topLevelSafeMode: options?.topLevelSafeMode,
    });
    if (!result?.code) {
      fail('Expected oxc-transform to return a transform result.');
    } else {
      const actualClean = cleanCode(result.code);
      const expectedClean = cleanCode(expected);
      expect(actualClean).toEqual(expectedClean);
    }
  };
}

function testCaseNoChange(input: string): jasmine.ImplementationCallback {
  return testCase({ input, expected: input });
}

describe('pure-toplevel-functions oxc-transform implementation', () => {
  it(
    'annotates top-level new expressions',
    testCase({
      input: 'var result = new SomeClass();',
      expected: 'var result = /*#__PURE__*/ new SomeClass();',
    }),
  );

  it(
    'annotates top-level function calls',
    testCase({
      input: 'var result = someCall();',
      expected: 'var result = /*#__PURE__*/ someCall();',
    }),
  );

  it(
    'annotates top-level IIFE assignments with no arguments',
    testCase({
      input: 'var SomeClass = (function () { function SomeClass() { } return SomeClass; })();',
      expected:
        'var SomeClass = /*#__PURE__*/(function () { function SomeClass() { } return SomeClass; })();',
    }),
  );

  it(
    'annotates top-level arrow-function-based IIFE assignments with no arguments',
    testCase({
      input: 'var SomeClass = (() => { function SomeClass() { } return SomeClass; })();',
      expected:
        'var SomeClass = /*#__PURE__*/(() => { function SomeClass() { } return SomeClass; })();',
    }),
  );

  it(
    'does not annotate top-level IIFE assignments with arguments',
    testCaseNoChange(
      'var SomeClass = (function () { function SomeClass() { } return SomeClass; })(abc);',
    ),
  );

  it(
    'does not annotate top-level arrow-function-based IIFE assignments with arguments',
    testCaseNoChange(
      'var SomeClass = (() => { function SomeClass() { } return SomeClass; })(abc);',
    ),
  );

  it(
    'does not annotate call expressions inside function declarations',
    testCaseNoChange('function funcDecl() { const result = someFunction(); }'),
  );

  it(
    'does not annotate call expressions inside function expressions',
    testCaseNoChange('const foo = function funcDecl() { const result = someFunction(); }'),
  );

  it(
    'does not annotate call expressions inside arrow functions',
    testCaseNoChange('const foo = () => { const result = someFunction(); }'),
  );

  it(
    'does not annotate new expressions inside function declarations',
    testCaseNoChange('function funcDecl() { const result = new SomeClass(); }'),
  );

  it(
    'does not annotate new expressions inside function expressions',
    testCaseNoChange('const foo = function funcDecl() { const result = new SomeClass(); }'),
  );

  it(
    'does not annotate new expressions inside arrow functions',
    testCaseNoChange('const foo = () => { const result = new SomeClass(); }'),
  );

  it(
    'does not annotate TypeScript helper functions (tslib)',
    testCaseNoChange(`
      class LanguageState {}
      __decorate([
          __metadata("design:type", Function),
          __metadata("design:paramtypes", [Object]),
          __metadata("design:returntype", void 0)
      ], LanguageState.prototype, "checkLanguage", null);
    `),
  );

  it(
    'does not annotate _defineProperty function',
    testCaseNoChange(`
      class LanguageState {}
      _defineProperty(
        LanguageState,
        'property',
        'value'
      );
    `),
  );

  it(
    'does not annotate object literal methods',
    testCaseNoChange(`
      const literal = {
        method() {
          var newClazz = new Clazz();
        }
      };
    `),
  );

  it(
    'annotates helper functions with non-numeric suffixes',
    testCase({
      input: 'var result = __decorate$foo();',
      expected: 'var result = /*#__PURE__*/ __decorate$foo();',
    }),
  );

  it(
    'does not annotate helper functions with numeric suffixes',
    testCaseNoChange('var result = __decorate$1();'),
  );

  describe('topLevelSafeMode: true', () => {
    it(
      'annotates top-level `new InjectionToken` expressions',
      testCase({
        input: `const result = new InjectionToken('abc');`,
        expected: `const result = /*#__PURE__*/ new InjectionToken('abc');`,
        options: { topLevelSafeMode: true },
      }),
    );

    it(
      'does not annotate other top-level `new` expressions',
      testCase({
        input: 'const result = new SomeClass();',
        expected: 'const result = new SomeClass();',
        options: { topLevelSafeMode: true },
      }),
    );

    it(
      'does not annotate top-level function calls',
      testCase({
        input: 'const result = someCall();',
        expected: 'const result = someCall();',
        options: { topLevelSafeMode: true },
      }),
    );
  });
});
