/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-big-function
// tslint:disable-next-line:no-implicit-dependencies
import { tags } from '@angular-devkit/core';
import { transformJavascript } from '../helpers/transform-javascript';
import { getPrefixClassesTransformer, testPrefixClasses } from './prefix-classes';


const transform = (content: string) => transformJavascript(
  { content, getTransforms: [getPrefixClassesTransformer] }).content;

describe('prefix-classes', () => {
  it('prefix TS 2.0 - 2.4 downlevel class', () => {
    const input = tags.stripIndent`
      var BasicTestCase = (function () {
        function BasicTestCase() {
        }
        return BasicTestCase;
      }());
    `;
    const output = tags.stripIndent`
      var BasicTestCase = /*@__PURE__*/ (function () {
        function BasicTestCase() {
        }
        return BasicTestCase;
      }());
    `;

    expect(testPrefixClasses(input)).toBeTruthy();
    expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
  });

  // NOTE: TS 2.1+ uses a standalone export after the variable statement
  it('prefix TS 2.0 exported downlevel class with ES2015 modules', () => {
    const input = tags.stripIndent`
      export var OuterSubscriber = (function (_super) {
        __extends(OuterSubscriber, _super);
        function OuterSubscriber() {
            _super.apply(this, arguments);
        }
        return OuterSubscriber;
      }());
    `;
    const output = tags.stripIndent`
      export var OuterSubscriber = /*@__PURE__*/ (function (_super) {
        __extends(OuterSubscriber, _super);
        function OuterSubscriber() {
            _super.apply(this, arguments);
        }
        return OuterSubscriber;
      }());
    `;

    expect(testPrefixClasses(input)).toBeTruthy();
    expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
  });

  it('prefix TS 2.0 downlevel class with extends', () => {
    const input = tags.stripIndent`
      var ExtendedClass = (function (_super) {
        __extends(ExtendedClass, _super);
        function ExtendedClass() {
            _super.apply(this, arguments);
        }
        return ExtendedClass;
      }(StaticTestCase));
    `;
    const output = tags.stripIndent`
      var ExtendedClass = /*@__PURE__*/ (function (_super) {
        __extends(ExtendedClass, _super);
        function ExtendedClass() {
            _super.apply(this, arguments);
        }
        return ExtendedClass;
      }(StaticTestCase));
    `;

    expect(testPrefixClasses(input)).toBeTruthy();
    expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
  });

  it('prefix TS 2.1 - 2.3 downlevel class with static variable', () => {
    const input = tags.stripIndent`
      var StaticTestCase = (function () {
        function StaticTestCase() {
        }
        return StaticTestCase;
      }());
      StaticTestCase.StaticTest = true;
    `;
    const output = tags.stripIndent`
      var StaticTestCase = /*@__PURE__*/ (function () {
        function StaticTestCase() {
        }
        return StaticTestCase;
      }());
      StaticTestCase.StaticTest = true;
    `;

    expect(testPrefixClasses(input)).toBeTruthy();
    expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
  });

  it('prefix TS 2.1 - 2.4 downlevel class with extends', () => {
    const input = tags.stripIndent`
      var ExtendedClass = (function (_super) {
        __extends(ExtendedClass, _super);
        function ExtendedClass() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return ExtendedClass;
      }(StaticTestCase));
    `;
    const output = tags.stripIndent`
      var ExtendedClass = /*@__PURE__*/ (function (_super) {
        __extends(ExtendedClass, _super);
        function ExtendedClass() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return ExtendedClass;
      }(StaticTestCase));
    `;

    expect(testPrefixClasses(input)).toBeTruthy();
    expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
  });

  it('prefix TS 2.0 & 2.4 downlevel class with static variable', () => {
    const input = tags.stripIndent`
      var StaticTestCase = (function () {
        function StaticTestCase() {
        }
        StaticTestCase.StaticTest = true;
        return StaticTestCase;
      }());
    `;
    const output = tags.stripIndent`
      var StaticTestCase = /*@__PURE__*/ (function () {
        function StaticTestCase() {
        }
        StaticTestCase.StaticTest = true;
        return StaticTestCase;
      }());
    `;

    expect(testPrefixClasses(input)).toBeTruthy();
    expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
  });

  it('prefix TS 2.5 - 2.6 downlevel class', () => {
    const input = tags.stripIndent`
      var BasicTestCase = /** @class */ (function () {
        function BasicTestCase() {
        }
        return BasicTestCase;
      }());
    `;
    const output = tags.stripIndent`
      var BasicTestCase = /** @class */ /*@__PURE__*/ (function () {
        function BasicTestCase() {
        }
        return BasicTestCase;
      }());
    `;

    expect(testPrefixClasses(input)).toBeTruthy();
    expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
  });

  it('prefix TS 2.5 - 2.6 renamed downlevel class', () => {
    const input = tags.stripIndent`
      var ComponentFactoryResolver$1 = /** @class */ (function () {
        function ComponentFactoryResolver$$1() {
        }
        return ComponentFactoryResolver$$1;
      }());
    `;
    const output = tags.stripIndent`
      var ComponentFactoryResolver$1 = /** @class */ /*@__PURE__*/ (function () {
        function ComponentFactoryResolver$$1() {
        }
        return ComponentFactoryResolver$$1;
      }());
    `;

    expect(testPrefixClasses(input)).toBeTruthy();
    expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
  });

  it('prefix TS 2.5 - 2.6 renamed downlevel class with extends', () => {
    const input = tags.stripIndent`
      var NgModuleFactory$1 = /** @class */ (function (_super) {
          __extends(NgModuleFactory$$1, _super);
          function NgModuleFactory$$1(moduleType) {
              var _this = _super.call(this) || this;
              _this.moduleType = moduleType;
              return _this;
          }
          NgModuleFactory$$1.prototype.create = function (parentInjector) {
              return new NgModuleRef$1(this.moduleType, parentInjector);
          };
          return NgModuleFactory$$1;
      }(NgModuleFactory));
    `;
    const output = tags.stripIndent`
      var NgModuleFactory$1 = /** @class */ /*@__PURE__*/ (function (_super) {
          __extends(NgModuleFactory$$1, _super);
          function NgModuleFactory$$1(moduleType) {
              var _this = _super.call(this) || this;
              _this.moduleType = moduleType;
              return _this;
          }
          NgModuleFactory$$1.prototype.create = function (parentInjector) {
              return new NgModuleRef$1(this.moduleType, parentInjector);
          };
          return NgModuleFactory$$1;
      }(NgModuleFactory));
    `;

    expect(testPrefixClasses(input)).toBeTruthy();
    expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
  });

  it('prefix TS 2.5 - 2.6 downlevel class with static variable', () => {
    const input = tags.stripIndent`
      var StaticTestCase = /** @class */ (function () {
        function StaticTestCase() {
        }
        StaticTestCase.StaticTest = true;
        return StaticTestCase;
      }());
    `;
    const output = tags.stripIndent`
      var StaticTestCase = /** @class */ /*@__PURE__*/ (function () {
        function StaticTestCase() {
        }
        StaticTestCase.StaticTest = true;
        return StaticTestCase;
      }());
    `;

    expect(testPrefixClasses(input)).toBeTruthy();
    expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
  });

  it('prefix TS 2.5 - 2.6 downlevel class with extends', () => {
    const input = tags.stripIndent`
      var ExtendedClass = /** @class */ (function (_super) {
        __extends(ExtendedClass, _super);
        function ExtendedClass() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return ExtendedClass;
      }(StaticTestCase));
    `;
    const output = tags.stripIndent`
      var ExtendedClass = /** @class */ /*@__PURE__*/ (function (_super) {
        __extends(ExtendedClass, _super);
        function ExtendedClass() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return ExtendedClass;
      }(StaticTestCase));
    `;

    expect(testPrefixClasses(input)).toBeTruthy();
    expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
  });

  it('works with tslib namespace import', () => {
    const input = tags.stripIndent`
      var BufferSubscriber = /** @class */ (function (_super) {
        tslib_1.__extends(BufferSubscriber, _super);
        function BufferSubscriber() {
          return _super !== null && _super.apply(this, arguments) || this;
        }
        return BufferSubscriber;
      }(OuterSubscriber));
    `;
    const output = tags.stripIndent`
      var BufferSubscriber = /** @class */ /*@__PURE__*/ (function (_super) {
        tslib_1.__extends(BufferSubscriber, _super);
        function BufferSubscriber() {
          return _super !== null && _super.apply(this, arguments) || this;
        }
        return BufferSubscriber;
      }(OuterSubscriber));
    `;

    expect(testPrefixClasses(input)).toBeTruthy();
    expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
  });

  it('fixes the RxJS use case (issue #214)', () => {
    const input = `
      var ExtendedClass = /*@__PURE__*/ (/*@__PURE__*/ function (_super) {
        __extends(ExtendedClass, _super);
        function ExtendedClass() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return ExtendedClass;
      }(StaticTestCase));

      /**
       * We need this JSDoc comment for affecting ESDoc.
       * @ignore
       * @extends {Ignored}
       */
      var zip_ZipSubscriber = /*@__PURE__*/ (/*@__PURE__*/ function (_super) {
          zip___extends(ZipSubscriber, _super);
          function ZipSubscriber(destination, project, values) {
              if (values === void 0) {
                  values = Object.create(null);
              }
              _super.call(this, destination);
              this.iterators = [];
              this.active = 0;
              this.project = (typeof project === 'function') ? project : null;
              this.values = values;
          }
          return ZipSubscriber;
      }(Subscriber));
    `;
    const output = `
      var ExtendedClass = /*@__PURE__*/ /*@__PURE__*/ ( /*@__PURE__*/function (_super) {
        __extends(ExtendedClass, _super);
        function ExtendedClass() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return ExtendedClass;
      }(StaticTestCase));

      /**
       * We need this JSDoc comment for affecting ESDoc.
       * @ignore
       * @extends {Ignored}
       */
      var zip_ZipSubscriber = /*@__PURE__*/ /*@__PURE__*/ ( /*@__PURE__*/function (_super) {
          zip___extends(ZipSubscriber, _super);
          function ZipSubscriber(destination, project, values) {
              if (values === void 0) {
                  values = Object.create(null);
              }
              _super.call(this, destination);
              this.iterators = [];
              this.active = 0;
              this.project = (typeof project === 'function') ? project : null;
              this.values = values;
          }
          return ZipSubscriber;
      }(Subscriber));
    `;
    expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
  });
});
