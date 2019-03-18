'use strict';
// This file is ES6 because it needs to be executed as is.

try {
  const analytics = require('../../models/analytics');

  if (analytics.getGlobalAnalytics() === undefined) {
    analytics.promptGlobalAnalytics(true);
  }
} catch (_) {}
