/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { ArchitectCommand } from '../models/architect-command';
import { Arguments } from '../models/interface';
import { Schema as Xi18nCommandSchema } from './xi18n';

export class Xi18nCommand extends ArchitectCommand<Xi18nCommandSchema> {
  public readonly target = 'extract-i18n';
  public readonly multiTarget: true;

  public async run(options: Xi18nCommandSchema & Arguments) {
    const version = process.version.substr(1).split('.');
    if (Number(version[0]) === 12 && Number(version[1]) === 0) {
      this.logger.error(
        'Due to a defect in Node.js 12.0, the command is not supported on this Node.js version. '
        + 'Please upgrade to Node.js 12.1 or later.');

      return 1;
    }

    return this.runArchitectTarget(options);
  }
}
