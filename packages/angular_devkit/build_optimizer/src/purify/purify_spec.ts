/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable-next-line:no-implicit-dependencies
import { tags } from '@angular-devkit/core';
import { purify } from './purify';

// tslint:disable:max-line-length
describe('purify', () => {
  it('prefixes safe imports with /*@__PURE__*/', () => {
    const input = tags.stripIndent`
      /* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_rxjs_Subject__ = __webpack_require__("EEr4");
      /* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_http__ = __webpack_require__(72);
      /** PURE_IMPORTS_START rxjs_Subject,_angular_http PURE_IMPORTS_END */
    `;
    const output = tags.stripIndent`
      /* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_rxjs_Subject__ = /*@__PURE__*/__webpack_require__("EEr4");
      /* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_http__ = /*@__PURE__*/__webpack_require__(72);
      /** PURE_IMPORTS_START rxjs_Subject,_angular_http PURE_IMPORTS_END */
    `;

    expect(tags.oneLine`${purify(input)}`).toEqual(tags.oneLine`${output}`);
  });

  it('prefixes safe default imports with /*@__PURE__*/', () => {
    const input = tags.stripIndent`
      /* harmony import */ var __WEBPACK_IMPORTED_MODULE_4_rxjs_Subject__ = __webpack_require__("rlar");
      /* harmony import */ var __WEBPACK_IMPORTED_MODULE_4_rxjs_Subject___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_4_rxjs_Subject__);
      /* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_zone_js___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_zone_js__);
      /** PURE_IMPORTS_START rxjs_Subject,zone_js PURE_IMPORTS_END */
      `;
    const output = tags.stripIndent`
      /* harmony import */ var __WEBPACK_IMPORTED_MODULE_4_rxjs_Subject__ = /*@__PURE__*/__webpack_require__("rlar");
      /* harmony import */ var __WEBPACK_IMPORTED_MODULE_4_rxjs_Subject___default = /*@__PURE__*/__webpack_require__.n(__WEBPACK_IMPORTED_MODULE_4_rxjs_Subject__);
      /* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_zone_js___default = /*@__PURE__*/__webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_zone_js__);
      /** PURE_IMPORTS_START rxjs_Subject,zone_js PURE_IMPORTS_END */
      `;

    expect(tags.oneLine`${purify(input)}`).toEqual(tags.oneLine`${output}`);
  });

  // Older versions of Purify added dots for relative imports. We should be backwards compatible.
  it('finds old matches that started with dots', () => {
    const input = tags.stripIndent`
      /* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__util_root__ = __webpack_require__(13);
      /* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__util_toSubscriber__ = __webpack_require__(67);
      /* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__symbol_observable__ = __webpack_require__(45);
      /* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__util_pipe__ = __webpack_require__(71);
      /** PURE_IMPORTS_START ._util_root,._util_toSubscriber,.._symbol_observable,._util_pipe PURE_IMPORTS_END */
    `;
    const output = tags.stripIndent`
      /* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__util_root__ = /*@__PURE__*/__webpack_require__(13);
      /* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__util_toSubscriber__ = /*@__PURE__*/__webpack_require__(67);
      /* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__symbol_observable__ = /*@__PURE__*/__webpack_require__(45);
      /* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__util_pipe__ = /*@__PURE__*/__webpack_require__(71);
      /** PURE_IMPORTS_START ._util_root,._util_toSubscriber,.._symbol_observable,._util_pipe PURE_IMPORTS_END */
    `;

    expect(tags.oneLine`${purify(input)}`).toEqual(tags.oneLine`${output}`);
  });
});
