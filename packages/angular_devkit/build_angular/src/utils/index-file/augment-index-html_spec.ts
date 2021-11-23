/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { tags } from '@angular-devkit/core';
import { AugmentIndexHtmlOptions, augmentIndexHtml } from './augment-index-html';

describe('augment-index-html', () => {
  const indexGeneratorOptions: AugmentIndexHtmlOptions = {
    html: '<html><head></head><body></body></html>',
    baseHref: '/',
    sri: false,
    files: [],
    loadOutputFile: async (_fileName: string) => '',
    entrypoints: [
      ['scripts', false],
      ['polyfills', true],
      ['main', true],
      ['styles', false],
    ],
  };

  const oneLineHtml = (html: TemplateStringsArray) =>
    tags.stripIndents`${html}`.replace(/(>\s+)/g, '>');

  it('can generate index.html', async () => {
    const { content } = await augmentIndexHtml({
      ...indexGeneratorOptions,
      files: [
        { file: 'styles.css', extension: '.css', name: 'styles' },
        { file: 'runtime.js', extension: '.js', name: 'main' },
        { file: 'main.js', extension: '.js', name: 'main' },
        { file: 'runtime.js', extension: '.js', name: 'polyfills' },
        { file: 'polyfills.js', extension: '.js', name: 'polyfills' },
      ],
    });

    expect(content).toEqual(oneLineHtml`
      <html>
        <head><base href="/">
          <link rel="stylesheet" href="styles.css">
        </head>
        <body>
          <script src="runtime.js" type="module"></script>
          <script src="polyfills.js" type="module"></script>
          <script src="main.js" type="module"></script>
        </body>
      </html>
    `);
  });

  it('should replace base href value', async () => {
    const { content } = await augmentIndexHtml({
      ...indexGeneratorOptions,
      html: '<html><head><base href="/"></head><body></body></html>',
      baseHref: '/Apps/',
    });

    expect(content).toEqual(oneLineHtml`
      <html>
        <head><base href="/Apps/">
      </head>
        <body>
        </body>
      </html>
    `);
  });

  it('should add lang and dir LTR attribute for French (fr)', async () => {
    const { content } = await augmentIndexHtml({
      ...indexGeneratorOptions,
      lang: 'fr',
    });

    expect(content).toEqual(oneLineHtml`
        <html lang="fr" dir="ltr">
          <head>
            <base href="/">
          </head>
          <body>
          </body>
        </html>
      `);
  });

  it('should add lang and dir RTL attribute for Pashto (ps)', async () => {
    const { content } = await augmentIndexHtml({
      ...indexGeneratorOptions,
      lang: 'ps',
    });

    expect(content).toEqual(oneLineHtml`
        <html lang="ps" dir="rtl">
          <head>
            <base href="/">
          </head>
          <body>
          </body>
        </html>
      `);
  });

  it(`should work when lang (locale) is not provided by '@angular/common'`, async () => {
    const { content, warnings } = await augmentIndexHtml({
      ...indexGeneratorOptions,
      lang: 'xx-XX',
    });

    expect(warnings).toEqual([
      `Locale data for 'xx-XX' cannot be found. 'dir' attribute will not be set for this locale.`,
    ]);
    expect(content).toEqual(oneLineHtml`
        <html lang="xx-XX">
          <head>
            <base href="/">
          </head>
          <body>
          </body>
        </html>
      `);
  });

  it(`should add script and link tags even when body and head element doesn't exist`, async () => {
    const { content } = await augmentIndexHtml({
      ...indexGeneratorOptions,
      html: `<app-root></app-root>`,
      files: [
        { file: 'styles.css', extension: '.css', name: 'styles' },
        { file: 'runtime.js', extension: '.js', name: 'main' },
        { file: 'main.js', extension: '.js', name: 'main' },
        { file: 'runtime.js', extension: '.js', name: 'polyfills' },
        { file: 'polyfills.js', extension: '.js', name: 'polyfills' },
      ],
    });

    expect(content).toEqual(oneLineHtml`
      <link rel="stylesheet" href="styles.css">
      <script src="runtime.js" type="module"></script>
      <script src="polyfills.js" type="module"></script>
      <script src="main.js" type="module"></script>
      <app-root></app-root>
    `);
  });
});
