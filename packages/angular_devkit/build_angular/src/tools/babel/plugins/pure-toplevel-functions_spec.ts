/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { transform } from '@babel/core';
import { default as pureTopLevelPlugin } from './pure-toplevel-functions';

// eslint-disable-next-line import/no-extraneous-dependencies
const prettier = require('prettier');

function testCase({ input, expected }: { input: string; expected: string }): void {
  const result = transform(input, {
    configFile: false,
    babelrc: false,
    compact: true,
    plugins: [pureTopLevelPlugin],
  });
  if (!result) {
    fail('Expected babel to return a transform result.');
  } else {
    expect(prettier.format(result.code, { parser: 'babel' })).toEqual(
      prettier.format(expected, { parser: 'babel' }),
    );
  }
}

function testCaseNoChange(input: string): void {
  testCase({ input, expected: input });
}

describe('pure-toplevel-functions Babel plugin', () => {
  it('annotates top-level new expressions', () => {
    testCase({
      input: 'var result = new SomeClass();',
      expected: 'var result = /*#__PURE__*/ new SomeClass();',
    });
  });

  it('annotates top-level function calls', () => {
    testCase({
      input: 'var result = someCall();',
      expected: 'var result = /*#__PURE__*/ someCall();',
    });
  });

  it('annotates top-level IIFE assignments with no arguments', () => {
    testCase({
      input: 'var SomeClass = (function () { function SomeClass() { } return SomeClass; })();',
      expected:
        'var SomeClass = /*#__PURE__*/(function () { function SomeClass() { } return SomeClass; })();',
    });
  });

  it('does not annotate top-level IIFE assignments with arguments', () => {
    testCaseNoChange(
      'var SomeClass = (function () { function SomeClass() { } return SomeClass; })(abc);',
    );
  });

  it('does not annotate call expressions inside function declarations', () => {
    testCaseNoChange('function funcDecl() { const result = someFunction(); }');
  });

  it('does not annotate call expressions inside function expressions', () => {
    testCaseNoChange('const foo = function funcDecl() { const result = someFunction(); }');
  });

  it('does not annotate call expressions inside function expressions', () => {
    testCaseNoChange('const foo = () => { const result = someFunction(); }');
  });

  it('does not annotate new expressions inside function declarations', () => {
    testCaseNoChange('function funcDecl() { const result = new SomeClass(); }');
  });

  it('does not annotate new expressions inside function expressions', () => {
    testCaseNoChange('const foo = function funcDecl() { const result = new SomeClass(); }');
  });

  it('does not annotate new expressions inside function expressions', () => {
    testCaseNoChange('const foo = () => { const result = new SomeClass(); }');
  });

  it('does not annotate TypeScript helper functions (tslib)', () => {
    testCaseNoChange(`
      class LanguageState {}
      __decorate([
          __metadata("design:type", Function),
          __metadata("design:paramtypes", [Object]),
          __metadata("design:returntype", void 0)
      ], LanguageState.prototype, "checkLanguage", null);
    `);
  });

  it('does not annotate object literal methods', () => {
    testCaseNoChange(`
      const literal = {
        method() {
          var newClazz = new Clazz();
        }
      };
    `);
  });
});
