/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { transformSync } from '@babel/core';
// eslint-disable-next-line import/no-extraneous-dependencies
import { format } from 'prettier';
import elideAngularMetadata from './elide-angular-metadata';

function testCase({
  input,
  expected,
}: {
  input: string;
  expected: string;
}): jasmine.ImplementationCallback {
  return async () => {
    const result = transformSync(input, {
      configFile: false,
      babelrc: false,
      compact: true,
      plugins: [elideAngularMetadata],
    });
    if (!result?.code) {
      fail('Expected babel to return a transform result.');
    } else {
      expect(await format(result.code, { parser: 'babel' })).toEqual(
        await format(expected, { parser: 'babel' }),
      );
    }
  };
}

describe('elide-angular-metadata Babel plugin', () => {
  it(
    'elides pure annotated ɵsetClassMetadata',
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
    }),
  );

  it(
    'elides JIT mode protected ɵsetClassMetadata',
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
    }),
  );
});
