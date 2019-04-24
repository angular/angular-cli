'use strict';
// This file is ES6 because it needs to be executed as is.

if ('NG_CLI_ANALYTICS' in process.env) {
  return;
}

try {
  const analytics = require('../../models/analytics');

  if (!analytics.hasGlobalAnalyticsConfiguration()) {
    analytics.promptGlobalAnalytics();
  }
} catch (_) {}
