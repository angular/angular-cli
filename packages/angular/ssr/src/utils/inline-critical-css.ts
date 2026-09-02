/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import Beasties from '../../third_party/beasties';

export class InlineCriticalCssProcessor extends Beasties {
  constructor(
    public override readFile: (path: string) => Promise<string>,
    readonly outputPath?: string,
  ) {
    super({
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

        return cspNonce ?? undefined;
      },
      noscriptFallback: true,
      inlineFonts: true,
    });
  }
}
