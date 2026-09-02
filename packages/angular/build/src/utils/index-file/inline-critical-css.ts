/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * Generates a stylesheet containing the critical CSS for the given HTML content.
 *
 * @param html - The HTML content to process.
 * @param outputPath - The output path for the generated stylesheet.
 * @param deployUrl - The deploy URL for the generated stylesheet.
 * @param minify - Whether to minify the generated stylesheet.
 * @param readAsset - A function that reads an asset from the given file path.
 * @returns A promise that resolves to an object containing the generated stylesheet content,
 * warnings, and errors.
 */
export async function inlineCriticalCss(
  html: string,
  outputPath: string,
  deployUrl: string | undefined,
  minify: boolean,
  readAsset: (file: string) => Promise<string>,
): Promise<{
  content: string;
  warnings: string[];
  errors: string[];
}> {
  const { default: Beasties } = await import('beasties');

  const warnings: string[] = [];
  const errors: string[] = [];

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

  beasties.readFile = (path) => readAsset(path);

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
