'use strict';
// This file is ES5 because it needs to be executed as is.

if (process.env['NG_CLI_ANALYTICS'] !== undefined) {
  return;
}

try {
  var analytics = require('../../models/analytics');

  if (!analytics.hasGlobalAnalyticsConfiguration()) {
    analytics.promptGlobalAnalytics().catch(function() { });
  }
} catch (_) {}
