/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Command, Option } from '../models/command';

export interface Options {
  keyword: string;
  search?: boolean;
}

export default class GetSetCommand extends Command {
  public readonly name = 'getset';
  public readonly description = 'Deprecated in favor of config command.';
  public readonly arguments: string[] = [];
  public readonly options: Option[] = [];
  public readonly hidden = true;

  public async run(_options: Options) {
    this.logger.warn('get/set have been deprecated in favor of the config command.');
  }
}
