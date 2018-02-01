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
import { getWrapEnumsTransformer, testWrapEnums } from './wrap-enums';


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

    expect(testWrapEnums(input)).toBeTruthy();
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

    expect(testWrapEnums(input)).toBeTruthy();
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

    expect(testWrapEnums(input)).toBeTruthy();
    expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
  });
});
