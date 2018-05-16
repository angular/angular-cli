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

describe('wrap-enums', () => {
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

  it('wraps ts 2.3 - 2.6 enums in IIFE', () => {
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

  it('wraps ts 2.3 - 2.6 enums in IIFE, even if they have funny numbers', () => {
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
