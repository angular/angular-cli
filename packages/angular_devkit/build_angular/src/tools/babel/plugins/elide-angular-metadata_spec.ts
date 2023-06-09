/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { transform } from '@babel/core';
import { default as elideAngularMetadata } from './elide-angular-metadata';

// eslint-disable-next-line import/no-extraneous-dependencies
const prettier = require('prettier');

function testCase({ input, expected }: { input: string; expected: string }): void {
  const result = transform(input, {
    configFile: false,
    babelrc: false,
    compact: true,
    plugins: [elideAngularMetadata],
  });
  if (!result) {
    fail('Expected babel to return a transform result.');
  } else {
    expect(prettier.format(result.code, { parser: 'babel' })).toEqual(
      prettier.format(expected, { parser: 'babel' }),
    );
  }
}

describe('elide-angular-metadata Babel plugin', () => {
  it('elides pure annotated ɵsetClassMetadata', () => {
    testCase({
      input: `
        import { Component } from '@angular/core';
        export class SomeClass {}
        /*@__PURE__*/ (function () { i0.ɵsetClassMetadata(Clazz, [{
            type: Component,
            args: [{
                    selector: 'app-lazy',
                    template: 'very lazy',
                    styles: []
                }]
        }], null, null); })();
      `,
      expected: `
        import { Component } from '@angular/core';
        export class SomeClass {}
        /*@__PURE__*/ (function () { void 0 })();
      `,
    });
  });

  it('elides JIT mode protected ɵsetClassMetadata', () => {
    testCase({
      input: `
        import { Component } from '@angular/core';
        export class SomeClass {}
        (function () { (typeof ngJitMode === "undefined" || ngJitMode) && i0.ɵsetClassMetadata(SomeClass, [{
            type: Component,
            args: [{
                    selector: 'app-lazy',
                    template: 'very lazy',
                    styles: []
                }]
        }], null, null); })();`,
      expected: `
        import { Component } from '@angular/core';
        export class SomeClass {}
        (function () { (typeof ngJitMode === "undefined" || ngJitMode) && void 0 })();`,
    });
  });
});
