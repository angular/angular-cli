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
  it('prefix downleveled classes with /*@__PURE__*/', () => {
    const input = tags.stripIndent`
      var ReplayEvent = (function () {
          function ReplayEvent(time, value) {
              this.time = time;
              this.value = value;
          }
          return ReplayEvent;
      }());
    `;
    const output = tags.stripIndent`
      var ReplayEvent = /*@__PURE__*/ (function () {
          function ReplayEvent(time, value) {
              this.time = time;
              this.value = value;
          }
          return ReplayEvent;
      }());
    `;

    expect(testPrefixClasses(input)).toBeTruthy();
    expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
  });

  // tslint:disable:max-line-length
  it('prefix downleveled classes that extend another class with /*@__PURE__*/', () => {
    const input = tags.stripIndent`
      var TakeUntilSubscriber = (function (_super) {
          __extends(TakeUntilSubscriber, _super);
          function TakeUntilSubscriber(destination, notifier) {
              _super.call(this, destination);
              this.notifier = notifier;
              this.add(subscribeToResult_1.subscribeToResult(this, notifier));
          }
          TakeUntilSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
              this.complete();
          };
          TakeUntilSubscriber.prototype.notifyComplete = function () {
              // noop
          };
          return TakeUntilSubscriber;
      }(OuterSubscriber_1.OuterSubscriber));
    `;
    const output = tags.stripIndent`
      var TakeUntilSubscriber = /*@__PURE__*/ (function (_super) {
          __extends(TakeUntilSubscriber, _super);
          function TakeUntilSubscriber(destination, notifier) {
              _super.call(this, destination);
              this.notifier = notifier;
              this.add(subscribeToResult_1.subscribeToResult(this, notifier));
          }
          TakeUntilSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
              this.complete();
          };
          TakeUntilSubscriber.prototype.notifyComplete = function () {
              // noop
          };
          return TakeUntilSubscriber;
      }(OuterSubscriber_1.OuterSubscriber));
    `;

    expect(testPrefixClasses(input)).toBeTruthy();
    expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
  });
  // tslint:enable:max-line-length
});
