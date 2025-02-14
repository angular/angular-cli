/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { I18nOptions } from './i18n-webpack';

export function ensureOutputPaths(baseOutputPath: string, i18n: I18nOptions): Map<string, string> {
  const outputPaths: [string, string][] = i18n.shouldInline
    ? [...i18n.inlineLocales].map((l) => [
        l,
        i18n.flatOutput ? baseOutputPath : join(baseOutputPath, i18n.locales[l].subPath),
      ])
    : [['', baseOutputPath]];

  for (const [, outputPath] of outputPaths) {
    if (!existsSync(outputPath)) {
      mkdirSync(outputPath, { recursive: true });
    }
  }

  return new Map(outputPaths);
}
