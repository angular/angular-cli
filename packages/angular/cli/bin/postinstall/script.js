#!/usr/bin/env node
'use strict';

// These should not fail but if they do they should not block installation of the package
try {
  require('./analytics-prompt');
} catch (_) {}
