/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BaseException } from '@angular-devkit/core';
import { existsSync } from 'fs';
import * as path from 'path';
import { FileReplacement } from '../builders/browser/schema';

export class MissingFileReplacementException extends BaseException {
  constructor(path: String) {
    super(`The ${path} path in file replacements does not exist.`);
  }
}

export interface NormalizedFileReplacement {
  replace: string;
  with: string;
}

export function normalizeFileReplacements(
  fileReplacements: FileReplacement[],
  workspaceRoot: string,
): NormalizedFileReplacement[] {
  if (fileReplacements.length === 0) {
    return [];
  }

  const normalizedReplacement = fileReplacements.map((replacement) =>
    normalizeFileReplacement(replacement, workspaceRoot),
  );

  for (const { replace, with: replacementWith } of normalizedReplacement) {
    if (!existsSync(replacementWith)) {
      throw new MissingFileReplacementException(replacementWith);
    }

    if (!existsSync(replace)) {
      throw new MissingFileReplacementException(replace);
    }
  }

  return normalizedReplacement;
}

function normalizeFileReplacement(
  fileReplacement: FileReplacement,
  root: string,
): NormalizedFileReplacement {
  let replacePath: string;
  let withPath: string;
  if (fileReplacement.src && fileReplacement.replaceWith) {
    replacePath = fileReplacement.src;
    withPath = fileReplacement.replaceWith;
  } else if (fileReplacement.replace && fileReplacement.with) {
    replacePath = fileReplacement.replace;
    withPath = fileReplacement.with;
  } else {
    throw new Error(`Invalid file replacement: ${JSON.stringify(fileReplacement)}`);
  }

  return {
    replace: path.join(root, replacePath),
    with: path.join(root, withPath),
  };
}
