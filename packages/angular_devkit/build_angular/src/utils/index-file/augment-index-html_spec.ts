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
    tags.stripIndents`${html}`.replace(/(\>\s+)/g, '>');

  it('can generate index.html', async () => {
    const source = augmentIndexHtml({
      ...indexGeneratorOptions,
      files: [
        { file: 'styles.css', extension: '.css', name: 'styles' },
        { file: 'runtime.js', extension: '.js', name: 'main' },
        { file: 'main.js', extension: '.js', name: 'main' },
        { file: 'runtime.js', extension: '.js', name: 'polyfills' },
        { file: 'polyfills.js', extension: '.js', name: 'polyfills' },
      ],
    });

    const html = await source;
    expect(html).toEqual(oneLineHtml`
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
    const source = augmentIndexHtml({
      ...indexGeneratorOptions,
      html: '<html><head><base href="/"></head><body></body></html>',
      baseHref: '/Apps/',
    });

    const html = await source;
    expect(html).toEqual(oneLineHtml`
      <html>
        <head><base href="/Apps/">
      </head>
        <body>
        </body>
      </html>
    `);
  });

  it('should add lang attribute', async () => {
    const source = augmentIndexHtml({
      ...indexGeneratorOptions,
      lang: 'fr',
    });

    const html = await source;
    expect(html).toEqual(oneLineHtml`
        <html lang="fr">
          <head>
            <base href="/">
          </head>
          <body>
          </body>
        </html>
      `);
  });

  it(`should add script and link tags even when body and head element doesn't exist`, async () => {
    const source = augmentIndexHtml({
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

    const html = await source;
    expect(html).toEqual(oneLineHtml`
      <link rel="stylesheet" href="styles.css">
      <script src="runtime.js" type="module"></script>
      <script src="polyfills.js" type="module"></script>
      <script src="main.js" type="module"></script>
      <app-root></app-root>
    `);
  });
});
