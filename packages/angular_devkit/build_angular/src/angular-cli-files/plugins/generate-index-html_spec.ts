/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { tags } from '@angular-devkit/core';
import { FileInfo, GenerateIndexHtmlOptions, generateIndexHtml } from './generate-index-html';

describe('index-html-webpack-plugin', () => {
  const indexGeneratorOptions: GenerateIndexHtmlOptions = {
    input: 'index.html',
    inputContent: '<html><head></head><body></body></html>',
    baseHref: '/',
    sri: false,
    files: [],
    loadOutputFile: async (_fileName: string) => '',
    entrypoints: ['polyfills', 'main', 'styles'],
  };

  const oneLineHtml = (html: TemplateStringsArray) =>
     tags.stripIndents`${html}`.replace(/(\>\s+)/g, '>');

  it('can generate index.html', async () => {
    const source = generateIndexHtml({
      ...indexGeneratorOptions,
      files: [
        { fileName: 'styles.css', extension: '.css', name: 'styles' },
        { fileName: 'runtime.js', extension: '.js', name: 'main' },
        { fileName: 'main.js', extension: '.js', name: 'main' },
        { fileName: 'runtime.js', extension: '.js', name: 'polyfills' },
        { fileName: 'polyfills.js', extension: '.js', name: 'polyfills' },
      ],
    });

    const html = (await source).source();
    expect(html).toEqual(oneLineHtml`
      <html>
        <head><base href="/">
          <link rel="stylesheet" href="styles.css">
        </head>
        <body>
          <script src="runtime.js"></script>
          <script src="polyfills.js"></script>
          <script src="main.js"></script>
        </body>
      </html>
    `);
  });

  it('should emit correct script tags when having module and non-module js', async () => {
    const es2015JsFiles: FileInfo[] = [
      { fileName: 'runtime-es2015.js', extension: '.js', name: 'main' },
      { fileName: 'main-es2015.js', extension: '.js', name: 'main' },
      { fileName: 'runtime-es2015.js', extension: '.js', name: 'polyfills' },
      { fileName: 'polyfills-es2015.js', extension: '.js', name: 'polyfills' },
    ];

    const es5JsFiles: FileInfo[] = [
      { fileName: 'runtime-es5.js', extension: '.js', name: 'main' },
      { fileName: 'main-es5.js', extension: '.js', name: 'main' },
      { fileName: 'runtime-es5.js', extension: '.js', name: 'polyfills' },
      { fileName: 'polyfills-es5.js', extension: '.js', name: 'polyfills' },
    ];

    const source = generateIndexHtml({
      ...indexGeneratorOptions,
      files: [
        { fileName: 'styles.css', extension: '.css', name: 'styles' },
        { fileName: 'styles.css', extension: '.css', name: 'styles' },
      ],
      moduleFiles: es2015JsFiles,
      noModuleFiles: es5JsFiles,
    });

    const html = (await source).source();
    expect(html).toEqual(oneLineHtml`
      <html>
        <head>
          <base href="/">
          <link rel="stylesheet" href="styles.css">
        </head>
        <body>
          <script src="runtime-es5.js" nomodule></script>
          <script src="polyfills-es5.js" nomodule></script>
          <script src="runtime-es2015.js" type="module"></script>
          <script src="polyfills-es2015.js" type="module"></script>
          <script src="main-es5.js" nomodule></script>
          <script src="main-es2015.js" type="module"></script>
        </body>
      </html>
    `);
  });

});
