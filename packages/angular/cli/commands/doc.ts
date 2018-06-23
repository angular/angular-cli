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
  searchDocVersion?: boolean;
  version: string;
}

enum DocumentVersions {
  v4 = 'v4',
  v5 = 'v5',
  next = 'next',
}

export default class DocCommand extends Command {
  public readonly name = 'doc';
  public readonly description =
    'Opens the official Angular API documentation for a given keyword.';
  public static aliases = ['d'];
  public readonly arguments = ['keyword', 'version'];
  public readonly options = [
    {
      name: 'search',
      aliases: ['s'],
      type: Boolean,
      default: false,
      description: 'Search whole angular.io instead of just api.',
    },
    {
      name: 'search-doc-version',
      aliases: ['v'],
      type: Boolean,
      default: false,
      description: 'Search in specific doc version: [v4, v5, next].',
    },
  ];

  public validate(options: Options) {
    if (!options.keyword) {
      this.logger.error(`keyword argument is required.`);

      return false;
    }

    return true;
  }

  public async run(options: Options) {
    let version = '';
    let searchUrl = '';

    if (options.searchDocVersion) {
      switch (options.version) {
        case 'v4':
          version = DocumentVersions.v4;
          break;
        case 'v5':
          version = DocumentVersions.v5;
          break;
        case 'next':
          version = DocumentVersions.next;
          break;
      }
      searchUrl = `https://${version}.angular.io/api?query=${options.keyword}`;
    } else {
      searchUrl = `https://angular.io/api?query=${options.keyword}`;
    }

    if (options.search) {
      searchUrl = `https://www.google.com/search?q=site%3Aangular.io+${
        options.keyword
      }`;
    }

    return opn(searchUrl);
  }
}
