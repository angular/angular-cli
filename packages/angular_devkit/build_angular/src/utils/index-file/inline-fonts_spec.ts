/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { InlineFontsOptions, InlineFontsProcessor } from './inline-fonts';

describe('InlineFontsProcessor', () => {
  const inlineFontsOptions: InlineFontsOptions = {
    content: `
    <html>
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
      </head>
      <body></body>
    </html>`,
    minifyInlinedCSS: false,
    WOFF1SupportNeeded: false,
  };

  it('should inline supported fonts and icons in HTML', async () => {
    const source = new InlineFontsProcessor().process({
      ...inlineFontsOptions,
      content: `
        <html>
        <head>
          <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
          <link href="theme.css" rel="stylesheet">
          <link href="https://fonts.googleapis.com/css?family=Roboto:300,400,500" rel="stylesheet">
        </head>
        <body></body>
      </html>`,
      WOFF1SupportNeeded: false,
    });

    const html = await source;
    expect(html).not.toContain('href="https://fonts.googleapis.com/css?family=Roboto:300,400,500"');
    expect(html).not.toContain('href="https://fonts.googleapis.com/icon?family=Material+Icons"');
    expect(html).toContain('href="theme.css"');
    expect(html).toContain(`font-family: 'Roboto'`);
    expect(html).toContain(`font-family: 'Material Icons'`);
  });

  it('works with http protocol', async () => {
    const source = new InlineFontsProcessor().process({
      ...inlineFontsOptions,
      content: inlineFontsOptions.content.replace('https://', 'http://'),
      WOFF1SupportNeeded: false,
    });

    expect(await source).toContain(`format('woff2');`);
  });


  it('works with // protocol', async () => {
    const source = new InlineFontsProcessor().process({
      ...inlineFontsOptions,
      content: inlineFontsOptions.content.replace('https://', '//'),
      WOFF1SupportNeeded: false,
    });

    expect(await source).toContain(`format('woff2');`);
  });

  it('should include WOFF1 definitions when `WOFF1SupportNeeded` is true', async () => {
    const source = new InlineFontsProcessor().process({
      ...inlineFontsOptions,
      WOFF1SupportNeeded: true,
    });

    const html = await source;
    expect(html).toContain(`format('woff2');`);
    expect(html).toContain(`format('woff');`);
  });

  it('should remove comments and line breaks when `minifyInlinedCSS` is true', async () => {
    const source = new InlineFontsProcessor().process({
      ...inlineFontsOptions,
      minifyInlinedCSS: true,
    });

    const html = await source;
    expect(html).not.toContain('/*');
    expect(html).toContain(';font-style:normal;');
  });
});
