/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Command } from '../models/command';
import { Schema as DeprecatedCommandSchema } from './deprecated';

export class DeprecatedCommand extends Command<DeprecatedCommandSchema> {
  public async run() {
    let message = 'The "${this.description.name}" command has been deprecated.';
    if (this.description.name == 'get' || this.description.name == 'set') {
      message = 'get/set have been deprecated in favor of the config command.';
    }

    this.logger.error(message);

    return 0;
  }
}
