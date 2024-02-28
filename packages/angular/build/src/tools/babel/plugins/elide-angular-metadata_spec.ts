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

  it(
    'elides ɵsetClassMetadata inside an arrow-function-based IIFE',
    testCase({
      input: `
        import { Component } from '@angular/core';
        export class SomeClass {}
        /*@__PURE__*/ (() => { i0.ɵsetClassMetadata(Clazz, [{
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
        /*@__PURE__*/ (() => { void 0 })();
      `,
    }),
  );

  it(
    'elides pure annotated ɵsetClassMetadataAsync',
    testCase({
      input: `
        import { Component } from '@angular/core';
        export class SomeClass {}
        /*@__PURE__*/ (function () {
          i0.ɵsetClassMetadataAsync(SomeClass,
            function () { return [import("./cmp-a").then(function (m) { return m.CmpA; })]; },
            function (CmpA) { i0.ɵsetClassMetadata(SomeClass, [{
                type: Component,
                args: [{
                        selector: 'test-cmp',
                        standalone: true,
                        imports: [CmpA, LocalDep],
                        template: '{#defer}<cmp-a/>{/defer}',
                    }]
              }], null, null); });
            })();
      `,
      expected: `
        import { Component } from '@angular/core';
        export class SomeClass {}
        /*@__PURE__*/ (function () { void 0 })();
      `,
    }),
  );

  it(
    'elides JIT mode protected ɵsetClassMetadataAsync',
    testCase({
      input: `
        import { Component } from '@angular/core';
        export class SomeClass {}
        (function () {
          (typeof ngJitMode === "undefined" || ngJitMode) && i0.ɵsetClassMetadataAsync(SomeClass,
            function () { return [import("./cmp-a").then(function (m) { return m.CmpA; })]; },
            function (CmpA) { i0.ɵsetClassMetadata(SomeClass, [{
                type: Component,
                args: [{
                        selector: 'test-cmp',
                        standalone: true,
                        imports: [CmpA, LocalDep],
                        template: '{#defer}<cmp-a/>{/defer}',
                    }]
              }], null, null); });
            })();
      `,
      expected: `
        import { Component } from '@angular/core';
        export class SomeClass {}
        (function () { (typeof ngJitMode === "undefined" || ngJitMode) && void 0 })();
      `,
    }),
  );

  it(
    'elides arrow-function-based ɵsetClassMetadataAsync',
    testCase({
      input: `
        import { Component } from '@angular/core';
        export class SomeClass {}
        /*@__PURE__*/ (() => {
          i0.ɵsetClassMetadataAsync(SomeClass,
            () => [import("./cmp-a").then(m => m.CmpA)],
            (CmpA) => { i0.ɵsetClassMetadata(SomeClass, [{
                type: Component,
                args: [{
                        selector: 'test-cmp',
                        standalone: true,
                        imports: [CmpA, LocalDep],
                        template: '{#defer}<cmp-a/>{/defer}',
                    }]
              }], null, null); });
            })();
      `,
      expected: `
        import { Component } from '@angular/core';
        export class SomeClass {}
        /*@__PURE__*/ (() => { void 0 })();
      `,
    }),
  );

  it(
    'elides arrow-function-based ɵsetClassMetadataAsync',
    testCase({
      input: `
        import { Component } from '@angular/core';
        class SomeClass {}
        (() => {
          (typeof ngDevMode === 'undefined' || ngDevMode) &&
            i0.ɵsetClassDebugInfo(SomeClass, { className: 'SomeClass' });
        })();
      `,
      expected: `
        import { Component } from "@angular/core";
        class SomeClass {}
        (() => {
          (typeof ngDevMode === "undefined" || ngDevMode) && void 0;
        })();
      `,
    }),
  );
});
