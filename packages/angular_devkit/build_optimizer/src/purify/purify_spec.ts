/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
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
});
