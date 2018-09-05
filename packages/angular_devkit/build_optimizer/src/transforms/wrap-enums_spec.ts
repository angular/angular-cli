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

// tslint:disable-next-line:no-big-function
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
