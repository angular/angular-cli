/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { ArchitectCommand } from '../models/architect-command';
import { Arguments } from '../models/interface';
import { Schema as ExtractI18nCommandSchema } from './extract-i18n';

export class ExtractI18nCommand extends ArchitectCommand<ExtractI18nCommandSchema> {
  public override readonly target = 'extract-i18n';

  public override async run(options: ExtractI18nCommandSchema & Arguments) {
    const version = process.version.substr(1).split('.');
    if (Number(version[0]) === 12 && Number(version[1]) === 0) {
      this.logger.error(
        'Due to a defect in Node.js 12.0, the command is not supported on this Node.js version. ' +
          'Please upgrade to Node.js 12.1 or later.',
      );

      return 1;
    }

    const commandName = process.argv[2];
    if (['xi18n', 'i18n-extract'].includes(commandName)) {
      this.logger.warn(
        `Warning: "ng ${commandName}" has been deprecated and will be removed in a future major version. ` +
          'Please use "ng extract-i18n" instead.',
      );
    }

    return this.runArchitectTarget(options);
  }
}
