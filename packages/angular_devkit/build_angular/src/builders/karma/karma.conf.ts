/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import karma from 'karma';
import { getBuiltInKarmaConfig } from '.';

module.exports = function (config: karma.Config) {
  config.set(getBuiltInKarmaConfig(karma, process.cwd(), ''));
};
