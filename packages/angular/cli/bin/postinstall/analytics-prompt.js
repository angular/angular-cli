'use strict';
// This file is ES6 because it needs to be executed as is.

if ('NG_CLI_ANALYTICS' in process.env) {
  return;
}

(async () => {
  try {
    const analytics = require('../../models/analytics');

    if (!analytics.hasGlobalAnalyticsConfiguration()) {
      await analytics.promptGlobalAnalytics();
    }
  } catch (_) {}
})();
