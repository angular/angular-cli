'use strict';
// This file is ES6 because it needs to be executed as is.

if ('NG_CLI_ANALYTICS' in process.env) {
  return;
}

try {
  var analytics = require('../../models/analytics');

  analytics
    .hasGlobalAnalyticsConfiguration()
    .then(hasGlobalConfig => {
      if (!hasGlobalConfig) {
        return analytics.promptGlobalAnalytics();
      }
    })
    .catch(() => {});
} catch (_) {}
