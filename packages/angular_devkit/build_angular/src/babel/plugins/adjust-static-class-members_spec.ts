/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { transform } from '@babel/core';
import { default as adjustStaticClassMembers } from './adjust-static-class-members';

// eslint-disable-next-line import/no-extraneous-dependencies
const prettier = require('prettier');

function testCase({
  input,
  expected,
  options,
}: {
  input: string;
  expected: string;
  options?: { wrapDecorators?: boolean };
}): void {
  const result = transform(input, {
    configFile: false,
    babelrc: false,
    plugins: [[adjustStaticClassMembers, options]],
  });
  if (!result) {
    fail('Expected babel to return a transform result.');
  } else {
    expect(prettier.format(result.code, { parser: 'babel' })).toEqual(
      prettier.format(expected, { parser: 'babel' }),
    );
  }
}

function testCaseNoChange(input: string, options?: { wrapDecorators?: boolean }): void {
  testCase({ input, expected: input, options });
}

describe('adjust-static-class-members Babel plugin', () => {
  it('elides empty ctorParameters function expression static field', () => {
    testCase({
      input: `
        export class SomeClass {}
        SomeClass.ctorParameters = function () { return []; };
      `,
      expected: 'export class SomeClass {}',
    });
  });

  it('elides non-empty ctorParameters function expression static field', () => {
    testCase({
      input: `
        export class SomeClass {}
        SomeClass.ctorParameters = function () { return [{type: Injector}]; };
      `,
      expected: 'export class SomeClass {}',
    });
  });

  it('elides empty ctorParameters arrow expression static field', () => {
    testCase({
      input: `
        export class SomeClass {}
        SomeClass.ctorParameters = () => [];
      `,
      expected: 'export class SomeClass {}',
    });
  });

  it('elides non-empty ctorParameters arrow expression static field', () => {
    testCase({
      input: `
        export class SomeClass {}
        SomeClass.ctorParameters = () => [{type: Injector}];
      `,
      expected: 'export class SomeClass {}',
    });
  });

  it('keeps ctorParameters static field without arrow/function expression', () => {
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
    });
  });

  it('elides empty decorators static field with array literal', () => {
    testCase({
      input: `
        export class SomeClass {}
        SomeClass.decorators = [];
      `,
      expected: 'export class SomeClass {}',
    });
  });

  it('elides non-empty decorators static field with array literal', () => {
    testCase({
      input: `
        export class SomeClass {}
        SomeClass.decorators = [{ type: Injectable }];
      `,
      expected: 'export class SomeClass {}',
    });
  });

  it('keeps decorators static field without array literal', () => {
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
    });
  });

  it('elides empty propDecorators static field with object literal', () => {
    testCase({
      input: `
        export class SomeClass {}
        SomeClass.propDecorators = {};
      `,
      expected: 'export class SomeClass {}',
    });
  });

  it('elides non-empty propDecorators static field with object literal', () => {
    testCase({
      input: `
        export class SomeClass {}
        SomeClass.propDecorators = { 'ngIf': [{ type: Input }] };
      `,
      expected: 'export class SomeClass {}',
    });
  });

  it('keeps propDecorators static field without object literal', () => {
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
    });
  });

  it('does not wrap default exported class with no connected siblings', () => {
    testCaseNoChange(`
      export default class CustomComponentEffects {
        constructor(_actions) {
          this._actions = _actions;
          this.doThis = this._actions;
        }
      }
    `);
  });

  it('does wrap not default exported class with only side effect fields', () => {
    testCaseNoChange(`
      export default class CustomComponentEffects {
        constructor(_actions) {
          this._actions = _actions;
          this.doThis = this._actions;
        }
      }
      CustomComponentEffects.someFieldWithSideEffects = console.log('foo');
    `);
  });

  it('does wrap not class with only side effect fields', () => {
    testCaseNoChange(`
      class CustomComponentEffects {
        constructor(_actions) {
          this._actions = _actions;
          this.doThis = this._actions;
        }
      }

      CustomComponentEffects.someFieldWithSideEffects = console.log('foo');
    `);
  });

  it('wraps class with pure annotated side effect fields', () => {
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
    });
  });

  it('wraps class with closure pure annotated side effect fields', () => {
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
            /* @pureOrBreakMyCode */
            console.log('foo');
          return CustomComponentEffects;
        })();
      `,
    });
  });

  it('wraps exported class with a pure static field', () => {
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
    });
  });

  it('wraps class with a basic literal static field', () => {
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
    });
  });

  it('wraps class with a pure static field', () => {
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
    });
  });

  it('wraps class with multiple pure static field', () => {
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
    });
  });

  it('does not wrap class with only some pure static fields', () => {
    testCaseNoChange(`
      class CustomComponentEffects {
        constructor(_actions) {
          this._actions = _actions;
          this.doThis = this._actions;
        }
      }

      CustomComponentEffects.someField = 42;
      CustomComponentEffects.someFieldWithSideEffects = console.log('foo');
    `);
  });

  it('does not wrap class with class decorators when wrapDecorators is false', () => {
    testCaseNoChange(
      `
        let SomeClass = class SomeClass {
        };
        SomeClass = __decorate([
            Dec()
        ], SomeClass);
      `,
      { wrapDecorators: false },
    );
  });

  it('wraps class with class decorators when wrapDecorators is true', () => {
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
    });
  });

  it('does not wrap class with constructor decorators when wrapDecorators is false', () => {
    testCaseNoChange(
      `
        let SomeClass = class SomeClass {
          constructor(foo) { }
        };
        SomeClass = __decorate([
            __param(0, SomeDecorator)
        ], SomeClass);
      `,
      { wrapDecorators: false },
    );
  });

  it('wraps class with constructor decorators when wrapDecorators is true', () => {
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
    });
  });

  it('does not wrap class with field decorators when wrapDecorators is false', () => {
    testCaseNoChange(
      `
        class SomeClass {
          constructor() {
              this.foo = 42;
          }
        }

        __decorate([
            SomeDecorator
        ], SomeClass.prototype, "foo", void 0);
      `,
      { wrapDecorators: false },
    );
  });

  it('wraps class with field decorators when wrapDecorators is true', () => {
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
    });
  });

  it('wraps class with Angular ɵfac static field', () => {
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
    });
  });

  it('wraps class with Angular ɵmod static field', () => {
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
    });
  });

  it('wraps class with Angular ɵinj static field', () => {
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
    });
  });

  it('wraps class with multiple Angular static field', () => {
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
              ] });
          return CommonModule;
        })();
      `,
    });
  });

  it('wraps default exported class with pure static fields', () => {
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
    });
  });
});
