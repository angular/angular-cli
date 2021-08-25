#!/usr/bin/env node
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

'use strict';

// These should not fail but if they do they should not block installation of the package
try {
  // eslint-disable-next-line import/no-unassigned-import
  require('./analytics-prompt');
} catch (_) {}
