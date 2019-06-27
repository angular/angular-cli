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

const open = require('open');

export class DocCommand extends Command<DocCommandSchema> {
  public async run(options: DocCommandSchema & Arguments) {
    if (!options.keyword) {
      this.logger.error('You should specify a keyword, for instance, `ng doc ActivatedRoute`.');

      return 0;
    }

    let domain = 'angular.io';

    if (options.version) {
      // version can either be a string containing "next"
      if (options.version == 'next') {
        domain = 'next.angular.io';
        // or a number where version must be a valid Angular version (i.e. not 0, 1 or 3)
      } else if (!isNaN(+options.version) && ![0, 1, 3].includes(+options.version)) {
        domain = `v${options.version}.angular.io`;
      } else {
        this.logger.error('Version should either be a number (2, 4, 5, 6...) or "next"');

        return 0;
      }
    } else {
      // we try to get the current Angular version of the project
      // and use it if we can find it
      try {
        /* tslint:disable-next-line:no-implicit-dependencies */
        const currentNgVersion = require('@angular/core').VERSION.major;
        domain = `v${currentNgVersion}.angular.io`;
      } catch (e) {}
    }

    let searchUrl = `https://${domain}/api?query=${options.keyword}`;

    if (options.search) {
      searchUrl = `https://www.google.com/search?q=site%3A${domain}+${options.keyword}`;
    }

    // We should wrap `open` in a new Promise because `open` is already resolved
    await new Promise(() => {
      open(searchUrl, {
        wait: false,
      });
    });
  }
}
