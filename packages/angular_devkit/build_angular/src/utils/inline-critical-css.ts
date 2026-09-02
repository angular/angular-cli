/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { readFile } from 'node:fs/promises';

export interface InlineCriticalCssProcessorOptions {
  minify?: boolean;
  deployUrl?: string;
  readAsset?: (path: string) => Promise<string>;
  autoCsp?: boolean;
  outputPath?: string;
}

export class InlineCriticalCssProcessor {
  constructor(protected readonly options: InlineCriticalCssProcessorOptions) {}

  async process(html: string): Promise<{ content: string; warnings: string[]; errors: string[] }> {
    const warnings: string[] = [];
    const errors: string[] = [];
    const { outputPath, deployUrl, minify = false, readAsset } = this.options;

    const { default: Beasties } = await import('beasties');

    const beasties = new Beasties({
      logger: {
        warn: (s: string) => warnings.push(s),
        error: (s: string) => errors.push(s),
        info: () => {},
      },
      logLevel: 'warn',
      path: outputPath,
      publicPath: deployUrl,
      compress: minify,
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

    beasties.readFile = (path) => {
      return readAsset ? readAsset(path) : readFile(path, 'utf-8');
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const beastiesInternal = beasties as any;
    const initialEmbedLinkedStylesheet =
      beastiesInternal.embedLinkedStylesheet.bind(beastiesInternal);
    beastiesInternal.embedLinkedStylesheet = async (link: unknown, document: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const linkEl = link as any;
      const beastiesMedia = linkEl.getAttribute('data-beasties-media');
      if (beastiesMedia) {
        linkEl.removeAttribute('data-beasties-media');
        linkEl.setAttribute('media', beastiesMedia);
        if (linkEl.next?.name === 'noscript') {
          linkEl.next.remove();
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (document as any).querySelectorAll('script').forEach((script: any) => {
          if (script.textContent?.includes('data-beasties-media')) {
            script.remove();
          }
        });
      }

      return initialEmbedLinkedStylesheet(link, document);
    };
    const content = await beasties.process(html);

    return {
      // Clean up value from value less attributes.
      // This is caused because parse5 always requires attributes to have a string value.
      // nomodule="" defer="" -> nomodule defer.
      content: content.replace(/(\s(?:defer|nomodule))=""/g, '$1'),
      errors,
      warnings,
    };
  }
}
