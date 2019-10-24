/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { I18nOptions } from './i18n-options';

export function ensureOutputPaths(baseOutputPath: string, i18n: I18nOptions): string[] {
    const outputPaths = i18n.shouldInline && !i18n.flatOutput
        ? [...i18n.inlineLocales].map(l => join(baseOutputPath, l))
        : [baseOutputPath];

    for (const outputPath of outputPaths) {
        if (!existsSync(outputPath)) {
            mkdirSync(outputPath, { recursive: true });
        }
    }

    return outputPaths;
}
