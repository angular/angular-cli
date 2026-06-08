/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { ɵInlineCriticalCssProcessor as InlineCriticalCssProcessor } from '@angular/ssr';
import { readFile } from 'node:fs/promises';

export class CommonEngineInlineCriticalCssProcessor {
  private readonly resourceCache = new Map<string, string>();

  async process(html: string, outputPath: string | undefined): Promise<string> {
    const beasties = new InlineCriticalCssProcessor(async (path) => {
      let resourceContent = this.resourceCache.get(path);
      if (resourceContent === undefined) {
        resourceContent = await readFile(path, 'utf-8');
        this.resourceCache.set(path, resourceContent);
      }

      return resourceContent;
    }, outputPath);

    return beasties.process(html);
  }
}
