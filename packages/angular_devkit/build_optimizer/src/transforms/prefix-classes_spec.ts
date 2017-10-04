/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
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

  it('prefix TS 2.5 downlevel class', () => {
    const input = tags.stripIndent`
      var BasicTestCase = /** @class */ (function () {
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

  it('prefix TS 2.5 downlevel class with static variable', () => {
    const input = tags.stripIndent`
      var StaticTestCase = /** @class */ (function () {
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

  it('prefix TS 2.5 downlevel class with extends', () => {
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

});
