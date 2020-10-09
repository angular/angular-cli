/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { InlineFontsProcessor } from './inline-fonts';

describe('InlineFontsProcessor', () => {
  const content = `
  <html>
    <head>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    </head>
    <body></body>
  </html>`;

  it('should inline supported fonts and icons in HTML', async () => {
    const inlineFontsProcessor = new InlineFontsProcessor({
      minifyInlinedCSS: false,
      WOFFSupportNeeded: false,
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

    expect(html).not.toContain('href="https://fonts.googleapis.com/css?family=Roboto:300,400,500"');
    expect(html).not.toContain('href="https://fonts.googleapis.com/icon?family=Material+Icons"');
    expect(html).toContain('href="theme.css"');
    expect(html).toContain(`font-family: 'Roboto'`);
    expect(html).toContain(`font-family: 'Material Icons'`);
  });

  it('works with http protocol', async () => {
    const inlineFontsProcessor = new InlineFontsProcessor({
      WOFFSupportNeeded: false,
      minifyInlinedCSS: false,
    });

    const html = await inlineFontsProcessor
      .process(content.replace('https://', 'http://'));
    expect(html).toContain(`format('woff2');`);
  });

  it('works with // protocol', async () => {
    const inlineFontsProcessor = new InlineFontsProcessor({
      WOFFSupportNeeded: false,
      minifyInlinedCSS: false,
    });

    const html = await inlineFontsProcessor
      .process(content.replace('https://', '//'));
    expect(html).toContain(`format('woff2');`);
  });

  it('should include WOFF1 definitions when `WOFF1SupportNeeded` is true', async () => {
    const inlineFontsProcessor = new InlineFontsProcessor({
      WOFFSupportNeeded: true,
      minifyInlinedCSS: false,
    });

    const html = await inlineFontsProcessor.process(content);
    expect(html).toContain(`format('woff2');`);
    expect(html).toContain(`format('woff');`);
  });

  it('should remove comments and line breaks when `minifyInlinedCSS` is true', async () => {
    const inlineFontsProcessor = new InlineFontsProcessor({
      WOFFSupportNeeded: false,
      minifyInlinedCSS: true,
    });

    const html = await inlineFontsProcessor.process(content);
    expect(html).not.toContain('/*');
    expect(html).toContain(';font-style:normal;');
  });
});
