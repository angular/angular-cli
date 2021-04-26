/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Path, dirname, join, normalize, resolve } from '@angular-devkit/core';
import { DirEntry, Rule } from '@angular-devkit/schematics';
import { JSONFile } from '../../utility/json-file';

function* visitExtendedJsonFiles(directory: DirEntry): IterableIterator<Path> {
  for (const path of directory.subfiles) {
    if (!path.endsWith('.json')) {
      continue;
    }

    const entry = directory.file(path);
    const content = entry?.content.toString();
    if (content?.includes('tsconfig.base.json')) {
      yield join(directory.path, path);
    }
  }

  for (const path of directory.subdirs) {
    if (path === 'node_modules' || path.startsWith('.')) {
      continue;
    }

    yield* visitExtendedJsonFiles(directory.dir(path));
  }
}

export default function (): Rule {
  return (host, context) => {
    const logger = context.logger;

    const tsConfigExists = host.exists('tsconfig.json');
    if (tsConfigExists) {
      const files = new JSONFile(host, 'tsconfig.json').get(['files']);
      if (!(Array.isArray(files) && files.length === 0)) {
        logger.info('Migration has already been executed.');

        return;
      }
    }

    if (host.exists('tsconfig.base.json')) {
      if (tsConfigExists) {
        host.overwrite('tsconfig.json', host.read('tsconfig.base.json') || '');
        host.delete('tsconfig.base.json');
      } else {
        host.rename('tsconfig.base.json', 'tsconfig.json');
      }
    }

    // Iterate over all tsconfig files and change the extends from 'tsconfig.base.json' to 'tsconfig.json'.
    const extendsJsonPath = ['extends'];
    for (const path of visitExtendedJsonFiles(host.root)) {

      try {
        const tsConfigDir = dirname(normalize(path));
        const tsConfigJson = new JSONFile(host, path);
        const extendsValue = tsConfigJson.get(extendsJsonPath);

        if (typeof extendsValue === 'string' && '/tsconfig.base.json' === resolve(tsConfigDir, normalize(extendsValue))) {
          // tsconfig extends the workspace tsconfig path.
          tsConfigJson.modify(extendsJsonPath, extendsValue.replace('tsconfig.base.json', 'tsconfig.json'));
        }
      } catch (error) {
        logger.warn(
          `${error.message || error}\n` +
          'If this is a TypeScript configuration file you will need to update the "extends" value manually.',
        );

        continue;
      }
    }
  };
}
