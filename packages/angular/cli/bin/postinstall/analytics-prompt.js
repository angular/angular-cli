/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

'use strict';
// This file is ES5 because it needs to be executed as is.

if ('NG_CLI_ANALYTICS' in process.env) {
  return;
}

try {
  var analytics = require('../../src/analytics/analytics');

  analytics
    .hasAnalyticsConfig('global')
    .then((hasGlobalConfig) => {
      if (!hasGlobalConfig) {
        return analytics.promptAnalytics(true /** global */);
      }
    })
    .catch(() => {});
} catch (_) {}
