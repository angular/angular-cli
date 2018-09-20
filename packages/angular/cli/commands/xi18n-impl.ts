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
    return this.runArchitectTarget(options);
  }
}
