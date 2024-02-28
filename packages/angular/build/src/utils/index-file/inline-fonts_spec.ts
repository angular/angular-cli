/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { InlineFontsProcessor } from './inline-fonts';

describe('InlineFontsProcessor', () => {
  describe('Google fonts', () => {
    const content = `
  <html>
    <head>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    </head>
    <body></body>
  </html>`;

    it('works with // protocol', async () => {
      const inlineFontsProcessor = new InlineFontsProcessor({
        minify: false,
      });

      const html = await inlineFontsProcessor.process(content.replace('https://', '//'));
      expect(html).toContain(`format('woff2');`);
    });

    it('should inline supported fonts and icons in HTML', async () => {
      const inlineFontsProcessor = new InlineFontsProcessor({
        minify: false,
      });

      const html = await inlineFontsProcessor.process(`
      <html>
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
        <link href="theme.css" rel="stylesheet">
        <link href="https://fonts.googleapis.com/css?family=Roboto:300,400,500" rel="stylesheet">
      </head>
      <body></body>
    </html>`);

      expect(html).not.toContain(
        'href="https://fonts.googleapis.com/css?family=Roboto:300,400,500"',
      );
      expect(html).not.toContain('href="https://fonts.googleapis.com/icon?family=Material+Icons"');
      expect(html).toContain('href="theme.css"');
      expect(html).toContain(`font-family: 'Roboto'`);
      expect(html).toContain(`font-family: 'Material Icons'`);
    });

    it('should inline multiple fonts from a single request with minification enabled', async () => {
      const inlineFontsProcessor = new InlineFontsProcessor({
        minify: true,
      });

      const html = await inlineFontsProcessor.process(`
      <html>
      <head>
        <link href="https://fonts.googleapis.com/css?family=Roboto:300,400,500%7CGoogle+Sans:400,500%7CRoboto+Mono:400,500%7CMaterial+Icons&display=swap" rel="stylesheet">
        <link href="theme.css" rel="stylesheet">
      </head>
      <body></body>
    </html>`);

      expect(html).toContain(`'Google Sans'`);
      expect(html).toContain(`'Roboto'`);
      expect(html).toContain(`'Roboto Mono'`);
      expect(html).toContain(`'Material Icons'`);
    });

    it('works with http protocol', async () => {
      const inlineFontsProcessor = new InlineFontsProcessor({
        minify: false,
      });

      const html = await inlineFontsProcessor.process(content.replace('https://', 'http://'));
      expect(html).toContain(`format('woff2');`);
    });

    it('should remove comments and line breaks when `minifyInlinedCSS` is true', async () => {
      const inlineFontsProcessor = new InlineFontsProcessor({
        minify: true,
      });

      const html = await inlineFontsProcessor.process(content);
      expect(html).not.toContain('/*');
      expect(html).toContain(';font-style:normal;');
    });

    it('should add preconnect hint', async () => {
      const inlineFontsProcessor = new InlineFontsProcessor({
        minify: false,
      });

      const html = await inlineFontsProcessor.process(content);
      expect(html).toContain(
        `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`,
      );
    });
  });

  describe('Adobe Typekit fonts', () => {
    const content = `
  <html>
    <head>
      <link href="https://use.typekit.net/plm1izr.css" rel="stylesheet">
    </head>
    <body></body>
  </html>`;

    it('should add preconnect hint', async () => {
      const inlineFontsProcessor = new InlineFontsProcessor({
        minify: false,
      });

      const html = await inlineFontsProcessor.process(content);
      expect(html).toContain(`<link rel="preconnect" href="https://use.typekit.net" crossorigin>`);
    });
  });
});
