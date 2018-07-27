/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Command } from '../models/command';
const opn = require('opn');

export interface Options {
  keyword: string;
  search?: boolean;
}

export class DocCommand extends Command {
  public validate(options: Options) {
    if (!options.keyword) {
      this.logger.error(`keyword argument is required.`);

      return false;
    }

    return true;
  }

  public async run(options: Options) {
    let searchUrl = `https://angular.io/api?query=${options.keyword}`;
    if (options.search) {
      searchUrl = `https://www.google.com/search?q=site%3Aangular.io+${options.keyword}`;
    }

    return opn(searchUrl);
  }
}
