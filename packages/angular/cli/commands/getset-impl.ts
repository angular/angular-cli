/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Command } from '../models/command';

export interface Options {
  keyword: string;
  search?: boolean;
}

export class GetSetCommand extends Command {
  public async run(_options: Options) {
    this.logger.warn('get/set have been deprecated in favor of the config command.');
  }
}
