/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable-next-line:no-implicit-dependencies
import { tags } from '@angular-devkit/core';
import { transformJavascript } from '../helpers/transform-javascript';
import { getWrapEnumsTransformer } from './wrap-enums';


const transform = (content: string) => transformJavascript(
  { content, getTransforms: [getWrapEnumsTransformer] }).content;

// tslint:disable:no-big-function
describe('wrap enums and classes transformer', () => {
  describe('wraps class declarations', () => {
    it('should wrap default exported classes', () => {
      const defaultClass = tags.stripIndent`
       export default class CustomComponentEffects {
          constructor(_actions) {
            this._actions = _actions;
            this.doThis = this._actions;
          }
        }
        CustomComponentEffects.decorators = [{ type: Injectable }];
      `;

      const namedClass = tags.stripIndent`
        class CustomComponent {
          constructor(_actions) {
            this._actions = _actions;
            this.doThis = this._actions;
          }
        }
        CustomComponent.decorators = [{ type: Injectable }];
      `;

      const output = tags.stripIndent`
        let CustomComponentEffects = /*@__PURE__*/ (() => {
          ${defaultClass.replace('export default ', '')}

          return CustomComponentEffects;
        })();
        export default CustomComponentEffects;

        let CustomComponent = /*@__PURE__*/ (() => {
          ${namedClass}

          return CustomComponent;
        })();
      `;

      const input = defaultClass + namedClass;
      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('should wrap tsickle emitted classes which followed by metadata', () => {
      const input = tags.stripIndent`
       class CustomComponentEffects {
            constructor(_actions) {
              this._actions = _actions;
              this.doThis = this._actions;
            }
        }
        CustomComponentEffects.decorators = [{ type: Injectable }];
        CustomComponentEffects.ctorParameters = () => [{ type: Actions }];
        tslib_1.__decorate([
            Effect(),
            tslib_1.__metadata("design:type", Object)
        ], CustomComponentEffects.prototype, "doThis", void 0);
        tslib_1.__decorate([
            Effect({ dispatch: false }),
            tslib_1.__metadata("design:type", Object)
        ], CustomComponentEffects.prototype, "doThat", void 0);
      `;

      const output = tags.stripIndent`
        let CustomComponentEffects = /*@__PURE__*/ (() => {
          ${input}

          return CustomComponentEffects;
        })();
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('should not wrap enum like which are inside of methods', () => {
      const input = tags.stripIndent`
        class LayoutDirective {
          constructor(elRef) { }

          applyStyleToElement(element, style, value) {
            let styles = {};
            if (typeof style === 'string') {
                styles[style] = value;
                style = styles;
            }
            styles = this.layoutConfig.disableVendorPrefixes ? style : applyCssPrefixes(style);
            this._applyMultiValueStyleToElement(styles, element);
          }
        }
        LayoutDirective.ctorParameters = () => [
          { type: ElementRef }
        ];
      `;

      const output = tags.stripIndent`
        let LayoutDirective = /*@__PURE__*/ (() => {
          ${input}

          return LayoutDirective;
        })();
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('should ClassDeclarations that are referenced with in CallExpressions', () => {
      const input = tags.stripIndent`
        class ApplicationModule {
            constructor(appRef) { }
        }
        ApplicationModule.ngModuleDef = ɵɵdefineNgModule({ type: ApplicationModule });
        /*@__PURE__*/ setClassMetadata(ApplicationModule, [{
                type: NgModule,
                args: [{ providers: APPLICATION_MODULE_PROVIDERS }]
            }], function () { return [{ type: ApplicationRef }]; }, { constructor: [] });
        ApplicationModule.ctorParameters = () => [
            { type: ApplicationRef }
        ];
      `;

      const output = tags.stripIndent`
        let ApplicationModule = /*@__PURE__*/ (() => {
          ${input}

          return ApplicationModule;
        })();
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('with nested static properties in IIFE', () => {
      const input = tags.stripIndent`
        class CommonModule { }
        CommonModule.ngModuleDef = defineNgModule({
            type: CommonModule
        }), CommonModule.ngInjectorDef = defineInjector({
            factory: function (t) {
                return new (t || CommonModule)();
            },
            providers: [{
                provide: NgLocalization,
                useClass: NgLocaleLocalization
            }]
        });
      `;

      const output = tags.stripIndent`
        let CommonModule = /*@__PURE__*/ (() => {
          ${input}

          return CommonModule;
        })();
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('with property decorators in IIFE', () => {
      const input = tags.stripIndent`
        export class Foo {
          method() {
          }
        }
        Foo.bar = 'barValue';
        __decorate([
            methodDecorator
        ], Foo.prototype, "method", null);
      `;

      const output = tags.stripIndent`
          export let Foo = /*@__PURE__*/ (() => {
            ${input.replace('export ', '')}

            return Foo;
          })();
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('folds static properties in IIFE', () => {
      const input = tags.stripIndent`
        export class TemplateRef { }
        TemplateRef.__NG_ELEMENT_ID__ = () => SWITCH_TEMPLATE_REF_FACTORY(TemplateRef, ElementRef);
      `;
      const output = tags.stripIndent`
      export let TemplateRef = /*@__PURE__*/ (() => {
        class TemplateRef { }
        TemplateRef.__NG_ELEMENT_ID__ = () => SWITCH_TEMPLATE_REF_FACTORY(TemplateRef, ElementRef);
        return TemplateRef;
      })();
    `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('folds multiple static properties into class', () => {
      const input = tags.stripIndent`
      export class TemplateRef { }
      TemplateRef.__NG_ELEMENT_ID__ = () => SWITCH_TEMPLATE_REF_FACTORY(TemplateRef, ElementRef);
      TemplateRef.somethingElse = true;
    `;
      const output = tags.stripIndent`
      export let TemplateRef = /*@__PURE__*/ (() => {
        class TemplateRef {
        }
        TemplateRef.__NG_ELEMENT_ID__ = () => SWITCH_TEMPLATE_REF_FACTORY(TemplateRef, ElementRef);
        TemplateRef.somethingElse = true;
        return TemplateRef;
      })();
    `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it(`doesn't wrap classes without static properties in IIFE`, () => {
      const input = tags.stripIndent`
      export class TemplateRef { }
    `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${input}`);
    });
  });

  describe('wrap class expressions', () => {
    it('should wrap default exported classes', () => {
      const defaultClass = tags.stripIndent`
        let Foo = class Foo {
        };
        Foo.bar = 'bar';
        Foo = __decorate([
            component()
        ], Foo);
        export default Foo;
      `;

      const namedClass = tags.stripIndent`
        let AggregateColumnDirective = class AggregateColumnDirective {
          constructor(viewContainerRef) { }
        };
        AggregateColumnDirective = __decorate([
            Directive({}),
            __metadata("design:paramtypes", [ViewContainerRef])
        ], AggregateColumnDirective);
      `;

      const output = tags.stripIndent`
        let Foo = /*@__PURE__*/ (() => {
          ${defaultClass.replace('export default Foo;', '')}

          return Foo;
        })();
        export default Foo;

        let AggregateColumnDirective = /*@__PURE__*/ (() => {
          ${namedClass}

          return AggregateColumnDirective;
        })();
      `;

      const input = defaultClass + namedClass;
      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('without property decorators in IIFE', () => {
      const input = tags.stripIndent`
          let AggregateColumnDirective = class AggregateColumnDirective {
              constructor(viewContainerRef) { }
          };
          AggregateColumnDirective = __decorate([
              Directive({}),
              __metadata("design:paramtypes", [ViewContainerRef])
          ], AggregateColumnDirective);
      `;

      const output = tags.stripIndent`
          let AggregateColumnDirective = /*@__PURE__*/ (() => {
            ${input}

            return AggregateColumnDirective;
          })();
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('with forwardRef in IIFE', () => {
      const classContent = tags.stripIndent`
        let FooDirective = FooDirective_1 = class FooDirective {
            constructor(parent) { }
        };
        FooDirective = FooDirective_1 = __decorate([
            Directive({
                selector: '[libUnshakeable2]',
            }),
            __param(0, SkipSelf()), __param(0, Inject(forwardRef(() => FooDirective_1))),
            __metadata("design:paramtypes", [FooDirective])
        ], FooDirective);
      `;

      const input = tags.stripIndent`
        var FooDirective_1;
        ${classContent}
        export { FooDirective };
      `;

      const output = tags.stripIndent`
        var FooDirective_1;
        let FooDirective = /*@__PURE__*/ (() => {
            ${classContent}

            return FooDirective;
        })();
        export { FooDirective };
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('with property decorators in IIFE', () => {
      const input = tags.stripIndent`
          let ChipList = class ChipList extends Component {
            constructor(options, element) {
              super(options, element);
            }
          };
          __decorate$4([Property([])], ChipList.prototype, "chips", void 0);
          ChipList = __decorate$4([NotifyPropertyChanges], ChipList);
      `;

      const output = tags.stripIndent`
          let ChipList = /*@__PURE__*/ (() => {
            ${input}
            return ChipList;
          })();`;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('should not wrap without decorators', () => {
      const input = tags.stripIndent`
          let ChipList = class ChipList extends Component {
            constructor(options, element) {
              super(options, element);
            }
          };
          fooBar();
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${input}`);
    });

    it('should wrap ClassExpression with property decorators and static property in IIFE', () => {
      const input = tags.stripIndent`
          let ChipList = class ChipList extends Component {
            constructor(options, element) {
              super(options, element);
            }
          };
          ChipList.prop = 1;
          __decorate$4([Property([])], ChipList.prototype, "chips", void 0);
          ChipList = __decorate$4([NotifyPropertyChanges], ChipList);`;

      const output = tags.stripIndent`
          let ChipList = /*@__PURE__*/ (() => {
            ${input}
            return ChipList;
          })();`;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('should wrap multiple ClassExpression in IIFE', () => {
      const firstClass = `
        let AggregateColumnDirective = class AggregateColumnDirective {
          constructor(viewContainerRef) { }
        };
        AggregateColumnDirective = __decorate([
            Directive({}),
            __metadata("design:paramtypes", [ViewContainerRef])
        ], AggregateColumnDirective);
      `;

      const secondClass = `
        let ChipList = class ChipList extends Component {
          constructor(options, element) {
            super(options, element);
          }
        };
        __decorate$4([Property([])], ChipList.prototype, "chips", void 0);
        ChipList = __decorate$4([NotifyPropertyChanges], ChipList);
      `;

      const input = tags.stripIndent`
          const minutesMilliSeconds = 60000;

          ${firstClass}

          const CSS = 'e-css';
          const PRIMARY = 'e-primary';

          ${secondClass}

          const chipList = new ChipList({}, {});
      `;

      const output = tags.stripIndent`
          const minutesMilliSeconds = 60000;

          let AggregateColumnDirective = /*@__PURE__*/ (() => {
            ${firstClass}

            return AggregateColumnDirective;
          })();

          const CSS = 'e-css';
          const PRIMARY = 'e-primary';

          let ChipList = /*@__PURE__*/ (() => {
            ${secondClass}

            return ChipList;
          })();

          const chipList = new ChipList({}, {});
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });
  });

  describe('wrap enums', () => {
    it('wraps ts 2.2 enums in IIFE', () => {
      const input = tags.stripIndent`
        export var ChangeDetectionStrategy = {};
        ChangeDetectionStrategy.OnPush = 0;
        ChangeDetectionStrategy.Default = 1;
        ChangeDetectionStrategy[ChangeDetectionStrategy.OnPush] = "OnPush";
        ChangeDetectionStrategy[ChangeDetectionStrategy.Default] = "Default";
      `;
      const output = tags.stripIndent`
        export var ChangeDetectionStrategy = /*@__PURE__*/ (function () {
          var ChangeDetectionStrategy = {};
          ChangeDetectionStrategy.OnPush = 0;
          ChangeDetectionStrategy.Default = 1;
          ChangeDetectionStrategy[ChangeDetectionStrategy.OnPush] = "OnPush";
          ChangeDetectionStrategy[ChangeDetectionStrategy.Default] = "Default";
          return ChangeDetectionStrategy;
        }());
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('should not wrap enum like object literal declarations', () => {
      const input = tags.stripIndent`
        const RendererStyleFlags3 = {
            Important: 1,
            DashCase: 2,
        };
        if (typeof RendererStyleFlags3 === 'object') {
          RendererStyleFlags3[RendererStyleFlags3.Important] = 'DashCase';
        }
        RendererStyleFlags3[RendererStyleFlags3.Important] = 'Important';
      `;
      const output = input;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('wraps ES2015 tsickle enums in IIFE', () => {
      const input = tags.stripIndent`
        const ChangeDetectionStrategy = {
            OnPush: 0,
            Default: 1,
        };
        export { ChangeDetectionStrategy };
        ChangeDetectionStrategy[ChangeDetectionStrategy.OnPush] = 'OnPush';
        ChangeDetectionStrategy[ChangeDetectionStrategy.Default] = 'Default';
      `;

      const output = tags.stripIndent`
        export const ChangeDetectionStrategy = /*@__PURE__*/ (function () {
            var ChangeDetectionStrategy = { OnPush: 0, Default: 1, };

            ChangeDetectionStrategy[ChangeDetectionStrategy.OnPush] = 'OnPush';
            ChangeDetectionStrategy[ChangeDetectionStrategy.Default] = 'Default';
            return ChangeDetectionStrategy;
        }());
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('wraps only ES2015 tsickle enums in IIFE', () => {
      const input = tags.stripIndent`
        const RendererStyleFlags3 = {
            Important: 1,
            DashCase: 2,
        };
        export { RendererStyleFlags3 };
        RendererStyleFlags3[RendererStyleFlags3.Important] = 'Important';
        RendererStyleFlags3[RendererStyleFlags3.DashCase] = 'DashCase';

        export const domRendererFactory3 = {
            createRenderer: (hostElement, rendererType) => { return document; }
        };

        export const unusedValueExportToPlacateAjd = 1;
      `;
      const output = tags.stripIndent`
        export const RendererStyleFlags3 = /*@__PURE__*/ (function () {
          var RendererStyleFlags3 = { Important: 1, DashCase: 2, };
          RendererStyleFlags3[RendererStyleFlags3.Important] = 'Important';
          RendererStyleFlags3[RendererStyleFlags3.DashCase] = 'DashCase';
          return RendererStyleFlags3;
        }());

        export const domRendererFactory3 = {
          createRenderer: (hostElement, rendererType) => { return document; }
        };

        export const unusedValueExportToPlacateAjd = 1;
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('wraps ts >2.3 enums in IIFE', () => {
      const input = tags.stripIndent`
        export var ChangeDetectionStrategy;
        (function (ChangeDetectionStrategy) {
            ChangeDetectionStrategy[ChangeDetectionStrategy["OnPush"] = 0] = "OnPush";
            ChangeDetectionStrategy[ChangeDetectionStrategy["Default"] = 1] = "Default";
        })(ChangeDetectionStrategy || (ChangeDetectionStrategy = {}));
      `;
      const output = tags.stripIndent`
        export var ChangeDetectionStrategy = /*@__PURE__*/ (function (ChangeDetectionStrategy) {
          ChangeDetectionStrategy[ChangeDetectionStrategy["OnPush"] = 0] = "OnPush";
          ChangeDetectionStrategy[ChangeDetectionStrategy["Default"] = 1] = "Default";
          return ChangeDetectionStrategy;
        })({});
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('wraps ts >2.3 enums in IIFE, even if they have funny numbers', () => {
      const input = tags.stripIndent`
        export var AnimatorControlState;
        (function (AnimatorControlState) {
            AnimatorControlState[AnimatorControlState["INITIALIZED"] = 1] = "INITIALIZED";
            AnimatorControlState[AnimatorControlState["STARTED"] = 2] = "STARTED";
            AnimatorControlState[AnimatorControlState["FINISHED"] = 3] = "FINISHED";
            AnimatorControlState[AnimatorControlState["DESTROYED"] = 4] = "DESTROYED";
        })(AnimatorControlState || (AnimatorControlState = {}));
      `;
      const output = tags.stripIndent`
        export var AnimatorControlState = /*@__PURE__*/ (function (AnimatorControlState) {
            AnimatorControlState[AnimatorControlState["INITIALIZED"] = 1] = "INITIALIZED";
            AnimatorControlState[AnimatorControlState["STARTED"] = 2] = "STARTED";
            AnimatorControlState[AnimatorControlState["FINISHED"] = 3] = "FINISHED";
            AnimatorControlState[AnimatorControlState["DESTROYED"] = 4] = "DESTROYED";
            return AnimatorControlState;
        })({});
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('wraps ts >2.3 enums in IIFE, even if they were renamed due to scope hoisting', () => {
      const input = tags.stripIndent`
        var TokenType$1;
        (function (TokenType) {
          TokenType[TokenType["TAG_OPEN_START"] = 0] = "TAG_OPEN_START";
          TokenType[TokenType["TAG_OPEN_END"] = 1] = "TAG_OPEN_END";
          TokenType[TokenType["TAG_OPEN_END_VOID"] = 2] = "TAG_OPEN_END_VOID";
          TokenType[TokenType["TAG_CLOSE"] = 3] = "TAG_CLOSE";
          TokenType[TokenType["TEXT"] = 4] = "TEXT";
          TokenType[TokenType["ESCAPABLE_RAW_TEXT"] = 5] = "ESCAPABLE_RAW_TEXT";
          TokenType[TokenType["RAW_TEXT"] = 6] = "RAW_TEXT";
          TokenType[TokenType["COMMENT_START"] = 7] = "COMMENT_START";
          TokenType[TokenType["COMMENT_END"] = 8] = "COMMENT_END";
          TokenType[TokenType["CDATA_START"] = 9] = "CDATA_START";
          TokenType[TokenType["CDATA_END"] = 10] = "CDATA_END";
          TokenType[TokenType["ATTR_NAME"] = 11] = "ATTR_NAME";
          TokenType[TokenType["ATTR_VALUE"] = 12] = "ATTR_VALUE";
          TokenType[TokenType["DOC_TYPE"] = 13] = "DOC_TYPE";
          TokenType[TokenType["EXPANSION_FORM_START"] = 14] = "EXPANSION_FORM_START";
          TokenType[TokenType["EXPANSION_CASE_VALUE"] = 15] = "EXPANSION_CASE_VALUE";
          TokenType[TokenType["EXPANSION_CASE_EXP_START"] = 16] = "EXPANSION_CASE_EXP_START";
          TokenType[TokenType["EXPANSION_CASE_EXP_END"] = 17] = "EXPANSION_CASE_EXP_END";
          TokenType[TokenType["EXPANSION_FORM_END"] = 18] = "EXPANSION_FORM_END";
          TokenType[TokenType["EOF"] = 19] = "EOF";
        })(TokenType$1 || (TokenType$1 = {}));
      `;
      const output = tags.stripIndent`
        var TokenType$1 = /*@__PURE__*/ (function (TokenType) {
          TokenType[TokenType["TAG_OPEN_START"] = 0] = "TAG_OPEN_START";
          TokenType[TokenType["TAG_OPEN_END"] = 1] = "TAG_OPEN_END";
          TokenType[TokenType["TAG_OPEN_END_VOID"] = 2] = "TAG_OPEN_END_VOID";
          TokenType[TokenType["TAG_CLOSE"] = 3] = "TAG_CLOSE";
          TokenType[TokenType["TEXT"] = 4] = "TEXT";
          TokenType[TokenType["ESCAPABLE_RAW_TEXT"] = 5] = "ESCAPABLE_RAW_TEXT";
          TokenType[TokenType["RAW_TEXT"] = 6] = "RAW_TEXT";
          TokenType[TokenType["COMMENT_START"] = 7] = "COMMENT_START";
          TokenType[TokenType["COMMENT_END"] = 8] = "COMMENT_END";
          TokenType[TokenType["CDATA_START"] = 9] = "CDATA_START";
          TokenType[TokenType["CDATA_END"] = 10] = "CDATA_END";
          TokenType[TokenType["ATTR_NAME"] = 11] = "ATTR_NAME";
          TokenType[TokenType["ATTR_VALUE"] = 12] = "ATTR_VALUE";
          TokenType[TokenType["DOC_TYPE"] = 13] = "DOC_TYPE";
          TokenType[TokenType["EXPANSION_FORM_START"] = 14] = "EXPANSION_FORM_START";
          TokenType[TokenType["EXPANSION_CASE_VALUE"] = 15] = "EXPANSION_CASE_VALUE";
          TokenType[TokenType["EXPANSION_CASE_EXP_START"] = 16] = "EXPANSION_CASE_EXP_START";
          TokenType[TokenType["EXPANSION_CASE_EXP_END"] = 17] = "EXPANSION_CASE_EXP_END";
          TokenType[TokenType["EXPANSION_FORM_END"] = 18] = "EXPANSION_FORM_END";
          TokenType[TokenType["EOF"] = 19] = "EOF";
          return TokenType;
        })({});
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('wraps TS string enums in IIFE', () => {
      const input = tags.stripIndent`
        export var NotificationKind;
        (function (NotificationKind) {
            NotificationKind["NEXT"] = "N";
            NotificationKind["ERROR"] = "E";
            NotificationKind["COMPLETE"] = "C";
        })(NotificationKind || (NotificationKind = {}));
      `;
      const output = tags.stripIndent`
        export var NotificationKind = /*@__PURE__*/ (function (NotificationKind) {
            NotificationKind["NEXT"] = "N";
            NotificationKind["ERROR"] = "E";
            NotificationKind["COMPLETE"] = "C";
            return NotificationKind;
        })({});
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('wraps tsickle enums in IIFE', () => {
      const input = tags.stripIndent`
        /** @enum {number} */
        var FormatWidth = {
          Short: 0,
          Medium: 1,
          Long: 2,
          Full: 3,
        };
        FormatWidth[FormatWidth.Short] = "Short";
        FormatWidth[FormatWidth.Medium] = "Medium";
        FormatWidth[FormatWidth.Long] = "Long";
        FormatWidth[FormatWidth.Full] = "Full";
      `;
      const output = tags.stripIndent`
        /** @enum {number} */ var FormatWidth = /*@__PURE__*/ (function () {
          var FormatWidth = {
            Short: 0,
            Medium: 1,
            Long: 2,
            Full: 3,
          };
          FormatWidth[FormatWidth.Short] = "Short";
          FormatWidth[FormatWidth.Medium] = "Medium";
          FormatWidth[FormatWidth.Long] = "Long";
          FormatWidth[FormatWidth.Full] = "Full";
          return FormatWidth;
        }());
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('wraps enums with multi-line comments in IIFE', () => {
      const input = tags.stripIndent`
        /**
         * Supported http methods.
         * @deprecated use @angular/common/http instead
         */
        var RequestMethod;
        /**
         * Supported http methods.
         * @deprecated use @angular/common/http instead
         */
        (function (RequestMethod) {
            RequestMethod[RequestMethod["Get"] = 0] = "Get";
            RequestMethod[RequestMethod["Post"] = 1] = "Post";
            RequestMethod[RequestMethod["Put"] = 2] = "Put";
            RequestMethod[RequestMethod["Delete"] = 3] = "Delete";
            RequestMethod[RequestMethod["Options"] = 4] = "Options";
            RequestMethod[RequestMethod["Head"] = 5] = "Head";
            RequestMethod[RequestMethod["Patch"] = 6] = "Patch";
        })(RequestMethod || (RequestMethod = {}));
      `;
      // We need to interpolate this space because our editorconfig automatically strips
      // trailing whitespace.
      const space = ' ';
      const output = tags.stripIndent`
        /**
         * Supported http methods.
         * @deprecated use @angular/common/http instead
         */
        var RequestMethod =${space}
         /**
         * Supported http methods.
         * @deprecated use @angular/common/http instead
         */
        /*@__PURE__*/ (function (RequestMethod) {
            RequestMethod[RequestMethod["Get"] = 0] = "Get";
            RequestMethod[RequestMethod["Post"] = 1] = "Post";
            RequestMethod[RequestMethod["Put"] = 2] = "Put";
            RequestMethod[RequestMethod["Delete"] = 3] = "Delete";
            RequestMethod[RequestMethod["Options"] = 4] = "Options";
            RequestMethod[RequestMethod["Head"] = 5] = "Head";
            RequestMethod[RequestMethod["Patch"] = 6] = "Patch";
            return RequestMethod;
        })({});
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('wraps exported enums in IIFE', () => {
      const input = tags.stripIndent`
        var ExportEnum;
        (function (ExportEnum) {
          ExportEnum[ExportEnum["A"] = 0] = "A";
          ExportEnum[ExportEnum["B"] = 1] = "B";
          ExportEnum[ExportEnum["C"] = 2] = "C";
        })(ExportEnum = exports.ExportEnum || (exports.ExportEnum = {}));
      `;
      const output = tags.stripIndent`
        var ExportEnum = exports.ExportEnum = /*@__PURE__*/ (function (ExportEnum) {
          ExportEnum[ExportEnum["A"] = 0] = "A";
          ExportEnum[ExportEnum["B"] = 1] = "B";
          ExportEnum[ExportEnum["C"] = 2] = "C";
          return ExportEnum;
        })(exports.ExportEnum || {});
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });
  });
});
