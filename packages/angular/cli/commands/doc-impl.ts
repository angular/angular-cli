/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BaseCommandOptions, Command } from '../models/command';
const opn = require('opn');

export interface DocCommandOptions extends BaseCommandOptions {
  keyword: string;
  search?: boolean;
}

export class DocCommand<T extends DocCommandOptions = DocCommandOptions> extends Command<T> {
  public async run(options: T) {
    let searchUrl = `https://angular.io/api?query=${options.keyword}`;
    if (options.search) {
      searchUrl = `https://www.google.com/search?q=site%3Aangular.io+${options.keyword}`;
    }

    return opn(searchUrl, {
      wait: false,
    });
  }
}
