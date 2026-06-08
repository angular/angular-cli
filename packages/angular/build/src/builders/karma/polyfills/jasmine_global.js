/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

// See: https://github.com/jasmine/jasmine/issues/2015
(function () {
  'use strict';

  // jasmine will ignore `window` unless it returns this specific (but uncommon)
  // value from toString().
  window.toString = function () {
    return '[object GjsGlobal]';
  };
})();
