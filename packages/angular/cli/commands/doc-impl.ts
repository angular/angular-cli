/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Command } from '../models/command';
import { Arguments } from '../models/interface';
import { Schema as DocCommandSchema } from './doc';

const opn = require('opn');

export class DocCommand extends Command<DocCommandSchema> {
  public async run(options: DocCommandSchema & Arguments) {
    let searchUrl = `https://angular.io/api?query=${options.keyword}`;
    if (options.search) {
      searchUrl = `https://www.google.com/search?q=site%3Aangular.io+${options.keyword}`;
    }

    return opn(searchUrl, {
      wait: false,
    });
  }
}
