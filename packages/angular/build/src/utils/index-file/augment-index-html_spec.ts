/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
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

  it(`should fallback to use language ID to set the dir attribute (en-US)`, async () => {
    const { content, warnings } = await augmentIndexHtml({
      ...indexGeneratorOptions,
      lang: 'en-US',
    });

    expect(warnings).toHaveSize(0);
    expect(content).toEqual(oneLineHtml`
        <html lang="en-US" dir="ltr">
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

  it(`should add preconnect and dns-prefetch hints when provided with cross origin`, async () => {
    const { content, warnings } = await augmentIndexHtml({
      ...indexGeneratorOptions,
      hints: [
        { mode: 'preconnect', url: 'http://example.com' },
        { mode: 'dns-prefetch', url: 'http://example.com' },
      ],
    });

    expect(warnings).toHaveSize(0);
    expect(content).toEqual(oneLineHtml`
        <html>
          <head>
            <base href="/">
            <link rel="preconnect" href="http://example.com">
            <link rel="dns-prefetch" href="http://example.com">
          </head>
          <body>
          </body>
        </html>
      `);
  });

  it(`should add preconnect and dns-prefetch hints when provided with "use-credentials" cross origin`, async () => {
    const { content, warnings } = await augmentIndexHtml({
      ...indexGeneratorOptions,
      crossOrigin: 'use-credentials',
      hints: [
        { mode: 'preconnect', url: 'http://example.com' },
        { mode: 'dns-prefetch', url: 'http://example.com' },
      ],
    });

    expect(warnings).toHaveSize(0);
    expect(content).toEqual(oneLineHtml`
        <html>
          <head>
            <base href="/">
            <link rel="preconnect" href="http://example.com" crossorigin="use-credentials">
            <link rel="dns-prefetch" href="http://example.com" crossorigin="use-credentials">
          </head>
          <body>
          </body>
        </html>
      `);
  });

  it(`should add preconnect and dns-prefetch hints when provided with "anonymous" cross origin`, async () => {
    const { content, warnings } = await augmentIndexHtml({
      ...indexGeneratorOptions,
      crossOrigin: 'anonymous',
      hints: [
        { mode: 'preconnect', url: 'http://example.com' },
        { mode: 'dns-prefetch', url: 'http://example.com' },
      ],
    });

    expect(warnings).toHaveSize(0);
    expect(content).toEqual(oneLineHtml`
        <html>
          <head>
            <base href="/">
            <link rel="preconnect" href="http://example.com" crossorigin>
            <link rel="dns-prefetch" href="http://example.com" crossorigin>
          </head>
          <body>
          </body>
        </html>
      `);
  });

  it(`should add preconnect and dns-prefetch hints when provided with "none" cross origin`, async () => {
    const { content, warnings } = await augmentIndexHtml({
      ...indexGeneratorOptions,
      crossOrigin: 'none',
      hints: [
        { mode: 'preconnect', url: 'http://example.com' },
        { mode: 'dns-prefetch', url: 'http://example.com' },
      ],
    });

    expect(warnings).toHaveSize(0);
    expect(content).toEqual(oneLineHtml`
        <html>
          <head>
            <base href="/">
            <link rel="preconnect" href="http://example.com">
            <link rel="dns-prefetch" href="http://example.com">
          </head>
          <body>
          </body>
        </html>
      `);
  });

  it(`should add preconnect and dns-prefetch hints when provided with no cross origin`, async () => {
    const { content, warnings } = await augmentIndexHtml({
      ...indexGeneratorOptions,
      hints: [
        { mode: 'preconnect', url: 'http://example.com' },
        { mode: 'dns-prefetch', url: 'http://example.com' },
      ],
    });

    expect(warnings).toHaveSize(0);
    expect(content).toEqual(oneLineHtml`
        <html>
          <head>
            <base href="/">
            <link rel="preconnect" href="http://example.com">
            <link rel="dns-prefetch" href="http://example.com">
          </head>
          <body>
          </body>
        </html>
      `);
  });

  it(`should add modulepreload hint when provided`, async () => {
    const { content, warnings } = await augmentIndexHtml({
      ...indexGeneratorOptions,
      hints: [
        { mode: 'modulepreload', url: 'x.js' },
        { mode: 'modulepreload', url: 'y/z.js' },
      ],
    });

    expect(warnings).toHaveSize(0);
    expect(content).toEqual(oneLineHtml`
        <html>
          <head>
            <base href="/">
          </head>
          <body>
            <link rel="modulepreload" href="x.js">
            <link rel="modulepreload" href="y/z.js">
          </body>
        </html>
      `);
  });

  it(`should add modulepreload hint with no crossorigin attribute when provided with cross origin set`, async () => {
    const { content, warnings } = await augmentIndexHtml({
      ...indexGeneratorOptions,
      crossOrigin: 'anonymous',
      hints: [
        { mode: 'modulepreload', url: 'x.js' },
        { mode: 'modulepreload', url: 'y/z.js' },
      ],
    });

    expect(warnings).toHaveSize(0);
    expect(content).toEqual(oneLineHtml`
        <html>
          <head>
            <base href="/">
          </head>
          <body>
            <link rel="modulepreload" href="x.js">
            <link rel="modulepreload" href="y/z.js">
          </body>
        </html>
      `);
  });

  it(`should add prefetch/preload hints with as=script when specified with a JS url`, async () => {
    const { content, warnings } = await augmentIndexHtml({
      ...indexGeneratorOptions,
      hints: [
        { mode: 'prefetch', url: 'x.js' },
        { mode: 'preload', url: 'y/z.js' },
      ],
    });

    expect(warnings).toHaveSize(0);
    expect(content).toEqual(oneLineHtml`
        <html>
          <head>
            <base href="/">
            <link rel="prefetch" href="x.js" as="script">
            <link rel="preload" href="y/z.js" as="script">
          </head>
          <body>
          </body>
        </html>
      `);
  });

  it(`should add prefetch/preload hints with as=style when specified with a CSS url`, async () => {
    const { content, warnings } = await augmentIndexHtml({
      ...indexGeneratorOptions,
      hints: [
        { mode: 'prefetch', url: 'x.css' },
        { mode: 'preload', url: 'y/z.css' },
      ],
    });

    expect(warnings).toHaveSize(0);
    expect(content).toEqual(oneLineHtml`
        <html>
          <head>
            <base href="/">
            <link rel="prefetch" href="x.css" as="style">
            <link rel="preload" href="y/z.css" as="style">
          </head>
          <body>
          </body>
        </html>
      `);
  });

  it(`should add prefetch/preload hints with as=style when specified with a URL and an 'as' option`, async () => {
    const { content, warnings } = await augmentIndexHtml({
      ...indexGeneratorOptions,
      hints: [
        { mode: 'prefetch', url: 'https://example.com/x?a=1', as: 'style' },
        { mode: 'preload', url: 'http://example.com/y?b=2', as: 'style' },
      ],
    });

    expect(warnings).toHaveSize(0);
    expect(content).toEqual(oneLineHtml`
        <html>
          <head>
            <base href="/">
            <link rel="prefetch" href="https://example.com/x?a=1" as="style">
            <link rel="preload" href="http://example.com/y?b=2" as="style">
          </head>
          <body>
          </body>
        </html>
      `);
  });

  it(`should not add deploy URL to hints with an absolute URL`, async () => {
    const { content, warnings } = await augmentIndexHtml({
      ...indexGeneratorOptions,
      deployUrl: 'https://localhost/',
      hints: [{ mode: 'preload', url: 'http://example.com/y?b=2' }],
    });

    expect(warnings).toHaveSize(0);
    expect(content).toEqual(oneLineHtml`
        <html>
          <head>
            <base href="/">
            <link rel="preload" href="http://example.com/y?b=2">
          </head>
          <body>
          </body>
        </html>
      `);
  });

  it(`should not add deploy URL to hints with a root-relative URL`, async () => {
    const { content, warnings } = await augmentIndexHtml({
      ...indexGeneratorOptions,
      deployUrl: 'https://example.com/',
      hints: [{ mode: 'preload', url: '/y?b=2' }],
    });

    expect(warnings).toHaveSize(0);
    expect(content).toEqual(oneLineHtml`
        <html>
          <head>
            <base href="/">
            <link rel="preload" href="/y?b=2">
          </head>
          <body>
          </body>
        </html>
      `);
  });

  it('should add `.mjs` script tags', async () => {
    const { content } = await augmentIndexHtml({
      ...indexGeneratorOptions,
      files: [{ file: 'main.mjs', extension: '.mjs', name: 'main' }],
      entrypoints: [['main', true /* isModule */]],
    });

    expect(content).toContain('<script src="main.mjs" type="module"></script>');
  });

  it('should reject non-module `.mjs` scripts', async () => {
    const options: AugmentIndexHtmlOptions = {
      ...indexGeneratorOptions,
      files: [{ file: 'main.mjs', extension: '.mjs', name: 'main' }],
      entrypoints: [['main', false /* isModule */]],
    };

    await expectAsync(augmentIndexHtml(options)).toBeRejectedWithError(
      '`.mjs` files *must* set `isModule` to `true`.',
    );
  });

  it('should add image domain preload tags', async () => {
    const imageDomains = ['https://www.example.com', 'https://www.example2.com'];
    const { content, warnings } = await augmentIndexHtml({
      ...indexGeneratorOptions,
      imageDomains,
    });

    expect(content).toEqual(oneLineHtml`
        <html>
          <head>
            <base href="/">
            <link rel="preconnect" href="https://www.example.com" data-ngimg>
            <link rel="preconnect" href="https://www.example2.com" data-ngimg>
          </head>
          <body>
          </body>
        </html>
      `);
  });

  it('should add no image preconnects if provided empty domain list', async () => {
    const imageDomains: Array<string> = [];
    const { content, warnings } = await augmentIndexHtml({
      ...indexGeneratorOptions,
      imageDomains,
    });

    expect(content).toEqual(oneLineHtml`
        <html>
          <head>
            <base href="/">
          </head>
          <body>
          </body>
        </html>
      `);
  });

  it('should not add duplicate preconnects', async () => {
    const imageDomains = ['https://www.example1.com', 'https://www.example2.com'];
    const { content, warnings } = await augmentIndexHtml({
      ...indexGeneratorOptions,
      html: '<html><head><link rel="preconnect" href="https://www.example1.com"></head><body></body></html>',
      imageDomains,
    });

    expect(content).toEqual(oneLineHtml`
        <html>
          <head>
            <base href="/">
            <link rel="preconnect" href="https://www.example1.com">
            <link rel="preconnect" href="https://www.example2.com" data-ngimg>
          </head>
          <body>
          </body>
        </html>
      `);
  });

  it('should add image preconnects if it encounters preconnect elements for other resources', async () => {
    const imageDomains = ['https://www.example2.com', 'https://www.example3.com'];
    const { content } = await augmentIndexHtml({
      ...indexGeneratorOptions,
      html: '<html><head><link rel="preconnect" href="https://www.example1.com"></head><body></body></html>',
      imageDomains,
    });

    expect(content).toEqual(oneLineHtml`
        <html>
          <head>
            <base href="/">
            <link rel="preconnect" href="https://www.example1.com">
            <link rel="preconnect" href="https://www.example2.com" data-ngimg>
            <link rel="preconnect" href="https://www.example3.com" data-ngimg>
          </head>
          <body>
          </body>
        </html>
      `);
  });

  describe('self-closing tags', () => {
    it('should return an error when used on a not supported element', async () => {
      const { errors } = await augmentIndexHtml({
        ...indexGeneratorOptions,
        html: `
          <html>
            <body>
              <app-root />
            </body>
          </html>'
        `,
      });

      expect(errors.length).toEqual(1);
      expect(errors).toEqual([`Invalid self-closing element in index HTML file: '<app-root />'.`]);
    });

    it('should not return an error when used on a supported element', async () => {
      const { errors } = await augmentIndexHtml({
        ...indexGeneratorOptions,
        html: `
          <html>
            <body>
              <br />
              <app-root><app-root>
            </body>
          </html>'
        `,
      });

      expect(errors.length).toEqual(0);
    });
  });
});
