/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { tags } from '@angular-devkit/core';
import { Command } from '../models/command';
import { Schema as EjectCommandSchema } from './eject';

export class EjectCommand extends Command<EjectCommandSchema> {
  async run() {
    this.logger.error(tags.stripIndents`
      The 'eject' command has been disabled and will be removed completely in 8.0.
      The new configuration format provides increased flexibility to modify the
      configuration of your workspace without ejecting.

      There are several projects that can be used in conjuction with the new
      configuration format that provide the benefits of ejecting without the maintenance
      overhead.  One such project is ngx-build-plus found here:
      https://github.com/manfredsteyer/ngx-build-plus
    `);

    return 1;
  }
}
