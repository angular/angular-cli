/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { logging, tags } from '@angular-devkit/core';
import { getOptions } from 'loader-utils';
import { extname } from 'path';

export interface SingleTestTransformLoaderOptions {
  /* list of paths relative to the entry-point */
  files?: string[];
  logger?: logging.Logger;
}

export const SingleTestTransformLoader = __filename;

/**
 * This loader transforms the default test file to only run tests
 * for some specs instead of all specs.
 * It works by replacing the known content of the auto-generated test file:
 *   const context = require.context('./', true, /\.spec\.ts$/);
 *   context.keys().map(context);
 * with:
 *   const context = { keys: () => ({ map: (_a) => { } }) };
 *   context.keys().map(context);
 * So that it does nothing.
 * Then it adds import statements for each file in the files options
 * array to import them directly, and thus run the tests there.
 */
// tslint:disable-next-line: no-any
export default function loader(this: any, source: string): string {
  const { files = [], logger = console } = getOptions(this) as SingleTestTransformLoaderOptions;
  // signal the user that expected content is not present.
  if (!source.includes('require.context(')) {
    logger.error(tags.stripIndent
      `The 'include' option requires that the 'main' file for tests includes the below line:
      const context = require.context('./', true, /\.spec\.ts$/);
      Arguments passed to require.context are not strict and can be changed.`);

    return source;
  }

  const targettedImports = files
    .map(path => `require('./${path.replace('.' + extname(path), '')}');`)
    .join('\n');

  const mockedRequireContext = 'Object.assign(() => { }, { keys: () => [], resolve: () => undefined });\n';
  source = source.replace(/require\.context\(.*/, mockedRequireContext + targettedImports);

  return source;
}
