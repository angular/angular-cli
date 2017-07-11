import { oneLine, stripIndent } from 'common-tags';

import { purify } from './purify';

// tslint:disable:max-line-length
describe('purify', () => {
  it('prefix downleveled classes with /*@__PURE__*/', () => {
    const input = stripIndent`
      var ReplayEvent = (function () {
          function ReplayEvent(time, value) {
              this.time = time;
              this.value = value;
          }
          return ReplayEvent;
      }());
    `;
    const output = stripIndent`
      var ReplayEvent = /*@__PURE__*/(function () {
          function ReplayEvent(time, value) {
              this.time = time;
              this.value = value;
          }
          return ReplayEvent;
      }());
    `;

    expect(oneLine`${purify(input)}`).toEqual(oneLine`${output}`);
  });

  it('prefix downleveled classes that extend another class with /*@__PURE__*/', () => {
    const input = stripIndent`
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
    const output = stripIndent`
      var TakeUntilSubscriber = /*@__PURE__*/(function (_super) {
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

    expect(oneLine`${purify(input)}`).toEqual(oneLine`${output}`);
  });

  it('wraps ts 2.2 enums in IIFE', () => {
    const input = stripIndent`
      var ChangeDetectionStrategy = {};
      ChangeDetectionStrategy.OnPush = 0;
      ChangeDetectionStrategy.Default = 1;
      ChangeDetectionStrategy[ChangeDetectionStrategy.OnPush] = "OnPush";
      ChangeDetectionStrategy[ChangeDetectionStrategy.Default] = "Default";
    `;
    const output = stripIndent`
      var ChangeDetectionStrategy = /*@__PURE__*/(function() {
      var ChangeDetectionStrategy = {};
      ChangeDetectionStrategy.OnPush = 0;
      ChangeDetectionStrategy.Default = 1;
      ChangeDetectionStrategy[ChangeDetectionStrategy.OnPush] = "OnPush";
      ChangeDetectionStrategy[ChangeDetectionStrategy.Default] = "Default";;
      return ChangeDetectionStrategy;})();
    `;

    expect(oneLine`${purify(input)}`).toEqual(oneLine`${output}`);
  });

  it('wraps ts 2.3 enums in IIFE', () => {
    const input = stripIndent`
      var ChangeDetectionStrategy;
      (function (ChangeDetectionStrategy) {
        ChangeDetectionStrategy[ChangeDetectionStrategy["OnPush"] = 0] = "OnPush";
        ChangeDetectionStrategy[ChangeDetectionStrategy["Default"] = 1] = "Default";
      })(ChangeDetectionStrategy || (ChangeDetectionStrategy = {}));
    `;
    const output = stripIndent`
      var ChangeDetectionStrategy = /*@__PURE__*/(function() {
          var ChangeDetectionStrategy = {};
          ChangeDetectionStrategy[ChangeDetectionStrategy["OnPush"] = 0] = "OnPush";
          ChangeDetectionStrategy[ChangeDetectionStrategy["Default"] = 1] = "Default";
          return ChangeDetectionStrategy;
      })();
    `;

    expect(oneLine`${purify(input)}`).toEqual(oneLine`${output}`);
  });

  it('prefixes safe imports with /*@__PURE__*/', () => {
    const input = stripIndent`
      /* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_rxjs_Subject__ = __webpack_require__("EEr4");
      /* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_http__ = __webpack_require__(72);
      /** PURE_IMPORTS_START rxjs_Subject,_angular_http PURE_IMPORTS_END */
    `;
    const output = stripIndent`
      /* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_rxjs_Subject__ = /*@__PURE__*/__webpack_require__("EEr4");
      /* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_http__ = /*@__PURE__*/__webpack_require__(72);
      /** PURE_IMPORTS_START rxjs_Subject,_angular_http PURE_IMPORTS_END */
    `;

    expect(oneLine`${purify(input)}`).toEqual(oneLine`${output}`);
  });

  it('prefixes safe default imports with /*@__PURE__*/', () => {
    const input = stripIndent`
      /* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_zone_js___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_zone_js__);
      /** PURE_IMPORTS_START zone_js PURE_IMPORTS_END */
    `;
    const output = stripIndent`
      /* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_zone_js___default = /*@__PURE__*/__webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_zone_js__);
      /** PURE_IMPORTS_START zone_js PURE_IMPORTS_END */
    `;

    expect(oneLine`${purify(input)}`).toEqual(oneLine`${output}`);
  });

  it('prefix CCF and CMF statements', () => {
    const input = stripIndent`
      var AppComponentNgFactory = __WEBPACK_IMPORTED_MODULE_1__angular_core__["I" /* ɵccf */]('app-root');
      var AppModuleNgFactory = __WEBPACK_IMPORTED_MODULE_1__angular_core__["I" /* ɵcmf */]('app-root');
      var SelectComponentNgFactory = select_component_ngfactory___WEBPACK_IMPORTED_MODULE_0__angular_core__["U" /* ɵccf */]('aio-select');
    `;
    const output = stripIndent`
      var AppComponentNgFactory = /*@__PURE__*/__WEBPACK_IMPORTED_MODULE_1__angular_core__["I" /* ɵccf */]('app-root');
      var AppModuleNgFactory = /*@__PURE__*/__WEBPACK_IMPORTED_MODULE_1__angular_core__["I" /* ɵcmf */]('app-root');
      var SelectComponentNgFactory = /*@__PURE__*/select_component_ngfactory___WEBPACK_IMPORTED_MODULE_0__angular_core__["U" /* ɵccf */]('aio-select');
    `;

    expect(oneLine`${purify(input)}`).toEqual(oneLine`${output}`);
  });

  it('prefix module statements', () => {
    const input = stripIndent`
      var AppModuleNgFactory = new __WEBPACK_IMPORTED_MODULE_1__angular_core__["I" /* NgModuleFactory */];
    `;
    const output = stripIndent`
      var AppModuleNgFactory = /*@__PURE__*/new __WEBPACK_IMPORTED_MODULE_1__angular_core__["I" /* NgModuleFactory */];
    `;

    expect(oneLine`${purify(input)}`).toEqual(oneLine`${output}`);
  });
});
