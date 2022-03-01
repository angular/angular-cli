/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { analytics, logging } from '@angular-devkit/core';
import { AngularWorkspace } from '../src/utilities/config';

/**
 * A command runner context.
 */
export interface CommandContext {
  currentDirectory: string;
  root: string;

  workspace?: AngularWorkspace;

  // This property is optional for backward compatibility.
  analytics?: analytics.Analytics;

  logger: logging.Logger;
}
