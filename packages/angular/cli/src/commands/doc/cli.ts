/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import open from 'open';
import { Argv } from 'yargs';
import {
  CommandModule,
  CommandModuleImplementation,
  Options,
} from '../../command-builder/command-module';

interface DocCommandArgs {
  keyword: string;
  search?: boolean;
  version?: string;
}

export class DocCommandModule
  extends CommandModule<DocCommandArgs>
  implements CommandModuleImplementation<DocCommandArgs>
{
  command = 'doc <keyword>';
  aliases = ['d'];
  describe =
    'Opens the official Angular documentation (angular.io) in a browser, and searches for a given keyword.';
  longDescriptionPath?: string;

  builder(localYargs: Argv): Argv<DocCommandArgs> {
    return localYargs
      .positional('keyword', {
        description: 'The keyword to search for, as provided in the search bar in angular.io.',
        type: 'string',
        demandOption: true,
      })
      .option('search', {
        description: `Search all of angular.io. Otherwise, searches only API reference documentation.`,
        alias: ['s'],
        type: 'boolean',
        default: false,
      })
      .option('version', {
        description:
          'Contains the version of Angular to use for the documentation. ' +
          'If not provided, the command uses your current Angular core version.',
        type: 'string',
      })
      .strict();
  }

  async run(options: Options<DocCommandArgs>): Promise<number | void> {
    let domain = 'angular.io';

    if (options.version) {
      // version can either be a string containing "next"
      if (options.version === 'next') {
        domain = 'next.angular.io';
      } else if (options.version === 'rc') {
        domain = 'rc.angular.io';
        // or a number where version must be a valid Angular version (i.e. not 0, 1 or 3)
      } else if (!isNaN(+options.version) && ![0, 1, 3].includes(+options.version)) {
        domain = `v${options.version}.angular.io`;
      } else {
        this.context.logger.error(
          'Version should either be a number (2, 4, 5, 6...), "rc" or "next"',
        );

        return 1;
      }
    } else {
      // we try to get the current Angular version of the project
      // and use it if we can find it
      try {
        /* eslint-disable-next-line import/no-extraneous-dependencies */
        const currentNgVersion = (await import('@angular/core')).VERSION.major;
        domain = `v${currentNgVersion}.angular.io`;
      } catch {}
    }

    await open(
      options.search
        ? `https://${domain}/docs?search=${options.keyword}`
        : `https://${domain}/api?query=${options.keyword}`,
    );
  }
}
