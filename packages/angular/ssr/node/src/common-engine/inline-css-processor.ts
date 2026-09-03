/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import Beasties from 'beasties';
import { readFile } from 'node:fs/promises';

export class CommonEngineInlineCriticalCssProcessor {
  private readonly resourceCache = new Map<string, string>();

  async process(html: string, outputPath: string | undefined): Promise<string> {
    const processor = new Beasties({
      logger: {
        // eslint-disable-next-line no-console
        warn: (s: string) => console.warn(s),
        // eslint-disable-next-line no-console
        error: (s: string) => console.error(s),
        info: () => {},
      },
      logLevel: 'warn',
      path: outputPath,
      publicPath: undefined,
      compress: false,
      pruneSource: false,
      reduceInlineStyles: false,
      mergeStylesheets: false,
      preload: 'media-script',
      nonce: (document) => {
        const nonceElement = document.querySelector('[ngCspNonce], [ngcspnonce]');
        const cspNonce =
          nonceElement?.getAttribute('ngCspNonce') || nonceElement?.getAttribute('ngcspnonce');

        return cspNonce;
      },
      noscriptFallback: true,
      inlineFonts: true,
    });

    processor.readFile = async (path: string) => {
      let resourceContent = this.resourceCache.get(path);
      if (resourceContent === undefined) {
        resourceContent = await readFile(path, 'utf-8');
        this.resourceCache.set(path, resourceContent);
      }

      return resourceContent;
    };

    return processor.process(html);
  }
}
