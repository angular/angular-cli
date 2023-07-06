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
import adjustStaticClassMembers from './adjust-static-class-members';

const NO_CHANGE = Symbol('NO_CHANGE');

function testCase({
  input,
  expected,
  options,
}: {
  input: string;
  expected: string | typeof NO_CHANGE;
  options?: { wrapDecorators?: boolean };
}): jasmine.ImplementationCallback {
  return async () => {
    const result = transformSync(input, {
      configFile: false,
      babelrc: false,
      plugins: [[adjustStaticClassMembers, options]],
    });
    if (!result?.code) {
      fail('Expected babel to return a transform result.');
    } else {
      expect(await format(result.code, { parser: 'babel' })).toEqual(
        await format(expected === NO_CHANGE ? input : expected, { parser: 'babel' }),
      );
    }
  };
}

describe('adjust-static-class-members Babel plugin', () => {
  it(
    'elides empty ctorParameters function expression static field',
    testCase({
      input: `
        export class SomeClass {}
        SomeClass.ctorParameters = function () { return []; };
      `,
      expected: 'export class SomeClass {}',
    }),
  );

  it(
    'elides non-empty ctorParameters function expression static field',
    testCase({
      input: `
        export class SomeClass {}
        SomeClass.ctorParameters = function () { return [{type: Injector}]; };
      `,
      expected: 'export class SomeClass {}',
    }),
  );

  it(
    'elides empty ctorParameters arrow expression static field',
    testCase({
      input: `
        export class SomeClass {}
        SomeClass.ctorParameters = () => [];
      `,
      expected: 'export class SomeClass {}',
    }),
  );

  it(
    'elides non-empty ctorParameters arrow expression static field',
    testCase({
      input: `
        export class SomeClass {}
        SomeClass.ctorParameters = () => [{type: Injector}];
      `,
      expected: 'export class SomeClass {}',
    }),
  );

  it(
    'keeps ctorParameters static field without arrow/function expression',
    testCase({
      input: `
        export class SomeClass {}
        SomeClass.ctorParameters = 42;
      `,
      expected: `
        export let SomeClass = /*#__PURE__*/ (() => {
          class SomeClass {}
          SomeClass.ctorParameters = 42;
          return SomeClass;
        })();
      `,
    }),
  );

  it(
    'elides empty decorators static field with array literal',
    testCase({
      input: `
        export class SomeClass {}
        SomeClass.decorators = [];
      `,
      expected: 'export class SomeClass {}',
    }),
  );

  it(
    'elides non-empty decorators static field with array literal',
    testCase({
      input: `
        export class SomeClass {}
        SomeClass.decorators = [{ type: Injectable }];
      `,
      expected: 'export class SomeClass {}',
    }),
  );

  it(
    'keeps decorators static field without array literal',
    testCase({
      input: `
        export class SomeClass {}
        SomeClass.decorators = 42;
      `,
      expected: `
        export let SomeClass = /*#__PURE__*/ (() => {
          class SomeClass {}
          SomeClass.decorators = 42;
          return SomeClass;
        })();
      `,
    }),
  );

  it(
    'elides empty propDecorators static field with object literal',
    testCase({
      input: `
        export class SomeClass {}
        SomeClass.propDecorators = {};
      `,
      expected: 'export class SomeClass {}',
    }),
  );

  it(
    'elides non-empty propDecorators static field with object literal',
    testCase({
      input: `
        export class SomeClass {}
        SomeClass.propDecorators = { 'ngIf': [{ type: Input }] };
      `,
      expected: 'export class SomeClass {}',
    }),
  );

  it(
    'keeps propDecorators static field without object literal',
    testCase({
      input: `
        export class SomeClass {}
        SomeClass.propDecorators = 42;
      `,
      expected: `
        export let SomeClass = /*#__PURE__*/ (() => {
          class SomeClass {}
          SomeClass.propDecorators = 42;
          return SomeClass;
        })();
      `,
    }),
  );

  it(
    'does not wrap default exported class with no connected siblings',
    testCase({
      // NOTE: This could technically have no changes but the default export splitting detection
      // does not perform class property analysis currently.
      input: `
        export default class CustomComponentEffects {
          constructor(_actions) {
            this._actions = _actions;
            this.doThis = this._actions;
          }
        }
      `,
      expected: `
        class CustomComponentEffects {
          constructor(_actions) {
            this._actions = _actions;
            this.doThis = this._actions;
          }
        }
        export { CustomComponentEffects as default };
      `,
    }),
  );

  it(
    'does wrap not default exported class with only side effect fields',
    testCase({
      input: `
      export default class CustomComponentEffects {
        constructor(_actions) {
          this._actions = _actions;
          this.doThis = this._actions;
        }
      }
      CustomComponentEffects.someFieldWithSideEffects = console.log('foo');
    `,
      expected: NO_CHANGE,
    }),
  );

  it(
    'does not wrap class with only side effect fields',
    testCase({
      input: `
      class CustomComponentEffects {
        constructor(_actions) {
          this._actions = _actions;
          this.doThis = this._actions;
        }
      }
      CustomComponentEffects.someFieldWithSideEffects = console.log('foo');
    `,
      expected: NO_CHANGE,
    }),
  );

  it(
    'does not wrap class with only side effect native fields',
    testCase({
      input: `
      class CustomComponentEffects {
        static someFieldWithSideEffects = console.log('foo');
        constructor(_actions) {
          this._actions = _actions;
          this.doThis = this._actions;
        }
      }
    `,
      expected: NO_CHANGE,
    }),
  );

  it(
    'does not wrap class with only instance native fields',
    testCase({
      input: `
      class CustomComponentEffects {
        someFieldWithSideEffects = console.log('foo');
        constructor(_actions) {
          this._actions = _actions;
          this.doThis = this._actions;
        }
      }
    `,
      expected: NO_CHANGE,
    }),
  );

  it(
    'wraps class with pure annotated side effect fields (#__PURE__)',
    testCase({
      input: `
        class CustomComponentEffects {
          constructor(_actions) {
            this._actions = _actions;
            this.doThis = this._actions;
          }
        }
        CustomComponentEffects.someFieldWithSideEffects = /*#__PURE__*/ console.log('foo');
      `,
      expected: `
        let CustomComponentEffects = /*#__PURE__*/ (() => {
          class CustomComponentEffects {
            constructor(_actions) {
              this._actions = _actions;
              this.doThis = this._actions;
            }
          }
          CustomComponentEffects.someFieldWithSideEffects = /*#__PURE__*/ console.log('foo');
          return CustomComponentEffects;
        })();
      `,
    }),
  );

  it(
    'wraps class with pure annotated side effect native fields (#__PURE__)',
    testCase({
      input: `
        class CustomComponentEffects {
          static someFieldWithSideEffects = /*#__PURE__*/ console.log('foo');
          constructor(_actions) {
            this._actions = _actions;
            this.doThis = this._actions;
          }
        }
      `,
      expected: `
        let CustomComponentEffects = /*#__PURE__*/ (() => {
          class CustomComponentEffects {
            static someFieldWithSideEffects = /*#__PURE__*/ console.log('foo');
            constructor(_actions) {
              this._actions = _actions;
              this.doThis = this._actions;
            }
          }
          return CustomComponentEffects;
        })();
      `,
    }),
  );

  it(
    'wraps class with pure annotated side effect fields (@__PURE__)',
    testCase({
      input: `
        class CustomComponentEffects {
          constructor(_actions) {
            this._actions = _actions;
            this.doThis = this._actions;
          }
        }
        CustomComponentEffects.someFieldWithSideEffects = /*@__PURE__*/ console.log('foo');
      `,
      expected: `
        let CustomComponentEffects = /*#__PURE__*/ (() => {
          class CustomComponentEffects {
            constructor(_actions) {
              this._actions = _actions;
              this.doThis = this._actions;
            }
          }
          CustomComponentEffects.someFieldWithSideEffects = /*@__PURE__*/ console.log('foo');
          return CustomComponentEffects;
        })();
      `,
    }),
  );

  it(
    'wraps class with pure annotated side effect fields (@pureOrBreakMyCode)',
    testCase({
      input: `
        class CustomComponentEffects {
          constructor(_actions) {
            this._actions = _actions;
            this.doThis = this._actions;
          }
        }
        CustomComponentEffects.someFieldWithSideEffects = /**@pureOrBreakMyCode*/ console.log('foo');
      `,
      expected: `
        let CustomComponentEffects = /*#__PURE__*/ (() => {
          class CustomComponentEffects {
            constructor(_actions) {
              this._actions = _actions;
              this.doThis = this._actions;
            }
          }
          CustomComponentEffects.someFieldWithSideEffects =
            /**@pureOrBreakMyCode*/ console.log('foo');
          return CustomComponentEffects;
        })();
      `,
    }),
  );

  it(
    'wraps class with closure pure annotated side effect fields',
    testCase({
      input: `
        class CustomComponentEffects {
          constructor(_actions) {
            this._actions = _actions;
            this.doThis = this._actions;
          }
        }
        CustomComponentEffects.someFieldWithSideEffects = /* @pureOrBreakMyCode */ console.log('foo');
      `,
      expected: `
        let CustomComponentEffects = /*#__PURE__*/ (() => {
          class CustomComponentEffects {
            constructor(_actions) {
              this._actions = _actions;
              this.doThis = this._actions;
            }
          }
          CustomComponentEffects.someFieldWithSideEffects =
            /* @pureOrBreakMyCode */ console.log('foo');
          return CustomComponentEffects;
        })();
      `,
    }),
  );

  it(
    'wraps exported class with a pure static field',
    testCase({
      input: `
        export class CustomComponentEffects {
          constructor(_actions) {
            this._actions = _actions;
            this.doThis = this._actions;
          }
        }
        CustomComponentEffects.someField = 42;
      `,
      expected: `
        export let CustomComponentEffects = /*#__PURE__*/ (() => {
          class CustomComponentEffects {
            constructor(_actions) {
              this._actions = _actions;
              this.doThis = this._actions;
            }
          }
          CustomComponentEffects.someField = 42;
          return CustomComponentEffects;
        })();
      `,
    }),
  );

  it(
    'wraps exported class with a pure native static field',
    testCase({
      input: `
        export class CustomComponentEffects {
          static someField = 42;
          constructor(_actions) {
            this._actions = _actions;
            this.doThis = this._actions;
          }
        }
      `,
      expected: `
        export let CustomComponentEffects = /*#__PURE__*/ (() => {
          class CustomComponentEffects {
            static someField = 42;
            constructor(_actions) {
              this._actions = _actions;
              this.doThis = this._actions;
            }
          }
          return CustomComponentEffects;
        })();
      `,
    }),
  );

  it(
    'wraps class with a basic literal static field',
    testCase({
      input: `
        class CustomComponentEffects {
          constructor(_actions) {
            this._actions = _actions;
            this.doThis = this._actions;
          }
        }
        CustomComponentEffects.someField = 42;
      `,
      expected: `
        let CustomComponentEffects = /*#__PURE__*/ (() => {
          class CustomComponentEffects {
            constructor(_actions) {
              this._actions = _actions;
              this.doThis = this._actions;
            }
          }
          CustomComponentEffects.someField = 42;
          return CustomComponentEffects;
        })();
      `,
    }),
  );

  it(
    'wraps class with a pure static field',
    testCase({
      input: `
        const SWITCH_TEMPLATE_REF_FACTORY__POST_R3__ = injectTemplateRef;
        const SWITCH_TEMPLATE_REF_FACTORY = SWITCH_TEMPLATE_REF_FACTORY__POST_R3__;
        class TemplateRef {}
        TemplateRef.__NG_ELEMENT_ID__ = SWITCH_TEMPLATE_REF_FACTORY;
      `,
      expected: `
        const SWITCH_TEMPLATE_REF_FACTORY__POST_R3__ = injectTemplateRef;
        const SWITCH_TEMPLATE_REF_FACTORY = SWITCH_TEMPLATE_REF_FACTORY__POST_R3__;
        let TemplateRef = /*#__PURE__*/ (() => {
          class TemplateRef {}
          TemplateRef.__NG_ELEMENT_ID__ = SWITCH_TEMPLATE_REF_FACTORY;
          return TemplateRef;
        })();
      `,
    }),
  );

  it(
    'wraps class with multiple pure static field',
    testCase({
      input: `
        const SWITCH_TEMPLATE_REF_FACTORY__POST_R3__ = injectTemplateRef;
        const SWITCH_TEMPLATE_REF_FACTORY = SWITCH_TEMPLATE_REF_FACTORY__POST_R3__;
        class TemplateRef {}
        TemplateRef.__NG_ELEMENT_ID__ = SWITCH_TEMPLATE_REF_FACTORY;
        TemplateRef.someField = 42;
      `,
      expected: `
        const SWITCH_TEMPLATE_REF_FACTORY__POST_R3__ = injectTemplateRef;
        const SWITCH_TEMPLATE_REF_FACTORY = SWITCH_TEMPLATE_REF_FACTORY__POST_R3__;
        let TemplateRef = /*#__PURE__*/ (() => {
          class TemplateRef {}
          TemplateRef.__NG_ELEMENT_ID__ = SWITCH_TEMPLATE_REF_FACTORY;
          TemplateRef.someField = 42;
          return TemplateRef;
        })();
      `,
    }),
  );

  it(
    'does not wrap class with only some pure static fields',
    testCase({
      input: `
        class CustomComponentEffects {
          constructor(_actions) {
            this._actions = _actions;
            this.doThis = this._actions;
          }
        }
        CustomComponentEffects.someField = 42;
        CustomComponentEffects.someFieldWithSideEffects = console.log('foo');
      `,
      expected: NO_CHANGE,
    }),
  );

  it(
    'does not wrap class with only pure native static fields and some side effect static fields',
    testCase({
      input: `
        class CustomComponentEffects {
          static someField = 42;
          constructor(_actions) {
            this._actions = _actions;
            this.doThis = this._actions;
          }
        }
        CustomComponentEffects.someFieldWithSideEffects = console.log('foo');
      `,
      expected: NO_CHANGE,
    }),
  );

  it(
    'does not wrap class with only some pure native static fields',
    testCase({
      input: `
        class CustomComponentEffects {
          static someField = 42;
          static someFieldWithSideEffects = console.log('foo');
          constructor(_actions) {
            this._actions = _actions;
            this.doThis = this._actions;
          }
        }
      `,
      expected: NO_CHANGE,
    }),
  );

  it(
    'does not wrap class with class decorators when wrapDecorators is false',
    testCase({
      input: `
        let SomeClass = class SomeClass {
        };
        SomeClass = __decorate([
            Dec()
        ], SomeClass);
      `,
      expected: NO_CHANGE,
      options: { wrapDecorators: false },
    }),
  );

  it(
    'wraps class with class decorators when wrapDecorators is true',
    testCase({
      input: `
        let SomeClass = class SomeClass {
        };
        SomeClass = __decorate([
            SomeDecorator()
        ], SomeClass);
      `,
      expected: `
        let SomeClass = /*#__PURE__*/ (() => {
          let SomeClass = class SomeClass {
          };
          SomeClass = __decorate([
              SomeDecorator()
          ], SomeClass);
          return SomeClass;
        })();
      `,
      options: { wrapDecorators: true },
    }),
  );

  it(
    'does not wrap class with constructor decorators when wrapDecorators is false',
    testCase({
      input: `
        let SomeClass = class SomeClass {
          constructor(foo) { }
        };
        SomeClass = __decorate([
            __param(0, SomeDecorator)
        ], SomeClass);
      `,
      expected: NO_CHANGE,
      options: { wrapDecorators: false },
    }),
  );

  it(
    'wraps class with constructor decorators when wrapDecorators is true',
    testCase({
      input: `
        let SomeClass = class SomeClass {
          constructor(foo) { }
        };
        SomeClass = __decorate([
            __param(0, SomeDecorator)
        ], SomeClass);
      `,
      expected: `
        let SomeClass = /*#__PURE__*/ (() => {
          let SomeClass = class SomeClass {
            constructor(foo) { }
          };
          SomeClass = __decorate([
              __param(0, SomeDecorator)
          ], SomeClass);
          return SomeClass;
        })();
      `,
      options: { wrapDecorators: true },
    }),
  );

  it(
    'does not wrap class with field decorators when wrapDecorators is false',
    testCase({
      input: `
        class SomeClass {
          constructor() {
              this.foo = 42;
          }
        }
        __decorate([
            SomeDecorator
        ], SomeClass.prototype, "foo", void 0);
      `,
      expected: NO_CHANGE,
      options: { wrapDecorators: false },
    }),
  );

  it(
    'wraps class with field decorators when wrapDecorators is true',
    testCase({
      input: `
        class SomeClass {
          constructor() {
              this.foo = 42;
          }
        }
        __decorate([
            SomeDecorator
        ], SomeClass.prototype, "foo", void 0);
      `,
      expected: `
        let SomeClass = /*#__PURE__*/ (() => {
          class SomeClass {
            constructor() {
                this.foo = 42;
            }
          }
          __decorate([
              SomeDecorator
          ], SomeClass.prototype, "foo", void 0);
          return SomeClass;
        })();
      `,
      options: { wrapDecorators: true },
    }),
  );

  it(
    'wraps class with Angular ɵfac static field',
    testCase({
      input: `
        class CommonModule {
        }
        CommonModule.ɵfac = function CommonModule_Factory(t) { return new (t || CommonModule)(); };
      `,
      expected: `
        let CommonModule = /*#__PURE__*/ (() => {
          class CommonModule {
          }
          CommonModule.ɵfac = function CommonModule_Factory(t) { return new (t || CommonModule)(); };
          return CommonModule;
        })();
      `,
    }),
  );

  it(
    'wraps class with Angular ɵfac static block (ES2022 + useDefineForClassFields: false)',
    testCase({
      input: `
        class CommonModule {
          static { this.ɵfac = function CommonModule_Factory(t) { return new (t || CommonModule)(); }; }
          static { this.ɵmod = ɵngcc0.ɵɵdefineNgModule({ type: CommonModule }); }
        }
      `,
      expected: `
        let CommonModule = /*#__PURE__*/ (() => {
          class CommonModule {
            static {
              this.ɵfac = function CommonModule_Factory(t) {
                return new (t || CommonModule)();
              };
            }
            static {
              this.ɵmod = ɵngcc0.ɵɵdefineNgModule({
                type: CommonModule,
              });
            }
          }
          return CommonModule;
        })();
      `,
    }),
  );

  it(
    'does not wrap class with side effect full static block (ES2022 + useDefineForClassFields: false)',
    testCase({
      input: `
        class CommonModule {
          static { globalThis.bar = 1 }
        }
      `,
      expected: NO_CHANGE,
    }),
  );

  it(
    'wraps class with Angular ɵmod static field',
    testCase({
      input: `
        class CommonModule {
        }
        CommonModule.ɵmod = /*@__PURE__*/ ɵngcc0.ɵɵdefineNgModule({ type: CommonModule });
      `,
      expected: `
        let CommonModule = /*#__PURE__*/ (() => {
          class CommonModule {
          }
          CommonModule.ɵmod = /*@__PURE__*/ ɵngcc0.ɵɵdefineNgModule({ type: CommonModule });
          return CommonModule;
        })();
      `,
    }),
  );

  it(
    'wraps class with Angular ɵinj static field',
    testCase({
      input: `
        class CommonModule {
        }
        CommonModule.ɵinj = /*@__PURE__*/ ɵngcc0.ɵɵdefineInjector({ providers: [
              { provide: NgLocalization, useClass: NgLocaleLocalization },
          ] });
      `,
      expected: `
        let CommonModule = /*#__PURE__*/ (() => {
          class CommonModule {
          }
          CommonModule.ɵinj = /*@__PURE__*/ ɵngcc0.ɵɵdefineInjector({ providers: [
              {
                provide: NgLocalization,
                useClass: NgLocaleLocalization
              },
          ] });
          return CommonModule;
        })();
      `,
    }),
  );

  it(
    'wraps class with multiple Angular static fields',
    testCase({
      input: `
        class CommonModule {
        }
        CommonModule.ɵfac = function CommonModule_Factory(t) { return new (t || CommonModule)(); };
        CommonModule.ɵmod = /*@__PURE__*/ ɵngcc0.ɵɵdefineNgModule({ type: CommonModule });
        CommonModule.ɵinj = /*@__PURE__*/ ɵngcc0.ɵɵdefineInjector({ providers: [
                { provide: NgLocalization, useClass: NgLocaleLocalization },
            ] });
      `,
      expected: `
        let CommonModule = /*#__PURE__*/ (() => {
          class CommonModule {
          }
          CommonModule.ɵfac = function CommonModule_Factory(t) { return new (t || CommonModule)(); };
          CommonModule.ɵmod = /*@__PURE__*/ ɵngcc0.ɵɵdefineNgModule({ type: CommonModule });
          CommonModule.ɵinj = /*@__PURE__*/ ɵngcc0.ɵɵdefineInjector({ providers: [
                  {
                    provide: NgLocalization,
                    useClass: NgLocaleLocalization
                  },
              ]});
          return CommonModule;
        })();
      `,
    }),
  );

  it(
    'wraps class with multiple Angular native static fields',
    testCase({
      input: `
        class CommonModule {
          static ɵfac = function CommonModule_Factory(t) { return new (t || CommonModule)(); };
          static ɵmod = /*@__PURE__*/ ɵngcc0.ɵɵdefineNgModule({ type: CommonModule });
          static ɵinj = ɵngcc0.ɵɵdefineInjector({ providers: [
            { provide: NgLocalization, useClass: NgLocaleLocalization },
        ] });
        }
      `,
      expected: `
        let CommonModule = /*#__PURE__*/ (() => {
          class CommonModule {
            static ɵfac = function CommonModule_Factory(t) {
              return new (t || CommonModule)();
            };
            static ɵmod = /*@__PURE__*/ ɵngcc0.ɵɵdefineNgModule({
              type: CommonModule,
            });
            static ɵinj = ɵngcc0.ɵɵdefineInjector({
              providers: [
                {
                  provide: NgLocalization,
                  useClass: NgLocaleLocalization,
                },
              ],
            });
          }
          return CommonModule;
        })();
      `,
    }),
  );

  it(
    'wraps default exported class with pure static fields',
    testCase({
      input: `
        export default class CustomComponentEffects {
          constructor(_actions) {
            this._actions = _actions;
            this.doThis = this._actions;
          }
        }
        CustomComponentEffects.someField = 42;
      `,
      expected: `
        let CustomComponentEffects = /*#__PURE__*/ (() => {
          class CustomComponentEffects {
            constructor(_actions) {
              this._actions = _actions;
              this.doThis = this._actions;
            }
          }
          CustomComponentEffects.someField = 42;
          return CustomComponentEffects;
        })();
        export { CustomComponentEffects as default };
      `,
    }),
  );
});
