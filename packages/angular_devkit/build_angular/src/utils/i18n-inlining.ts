/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { EmittedFiles } from '@angular-devkit/build-webpack';
import * as fs from 'fs';
import * as path from 'path';
import { InlineOptions } from './process-bundle';

export function emittedFilesToInlineOptions(
  emittedFiles: EmittedFiles[],
  scriptsEntryPointName: string[],
  emittedPath: string,
  outputPath: string,
  es5: boolean,
  missingTranslation: 'error' | 'warning' | 'ignore' | undefined,
): { options: InlineOptions[]; originalFiles: string[] }  {
  const options: InlineOptions[] = [];
  const originalFiles: string[] = [];
  for (const emittedFile of emittedFiles) {
    if (
      emittedFile.asset ||
      emittedFile.extension !== '.js' ||
      (emittedFile.name && scriptsEntryPointName.includes(emittedFile.name))
    ) {
      continue;
    }

    const originalPath = path.join(emittedPath, emittedFile.file);
    const action: InlineOptions = {
      filename: emittedFile.file,
      code: fs.readFileSync(originalPath, 'utf8'),
      es5,
      outputPath,
      missingTranslation,
    };
    originalFiles.push(originalPath);

    try {
      const originalMapPath = originalPath + '.map';
      action.map = fs.readFileSync(originalMapPath, 'utf8');
      originalFiles.push(originalMapPath);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }

    options.push(action);
  }

  return { options, originalFiles };
}
