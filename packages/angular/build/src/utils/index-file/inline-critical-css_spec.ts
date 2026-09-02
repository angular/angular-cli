/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { tags } from '@angular-devkit/core';
import { inlineCriticalCss } from './inline-critical-css';

describe('inlineCriticalCss', () => {
  const styles: Record<string, string> = {
    '/dist/styles.css': `
      body { margin: 0; }
      html { color: white; }
    `,
    '/dist/theme.css': `
      span { color: blue; }
      p { color: blue; }
    `,
  };

  const readAsset = async (file: string): Promise<string> => {
    const content = styles[file];
    if (content) {
      return content;
    }

    throw new Error(`Cannot read asset: ${file}`);
  };

  const getContent = (deployUrl: string, bodyContent = ''): string => {
    return `
      <html>
      <head>
        <link href="${deployUrl}styles.css" rel="stylesheet">
        <link href="${deployUrl}theme.css" rel="stylesheet">
      </head>
      <body>${bodyContent}</body>
    </html>`;
  };

  it('should inline critical css', async () => {
    const { content, errors, warnings } = await inlineCriticalCss(
      getContent(''),
      '/dist/',
      undefined,
      false,
      readAsset,
    );

    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
    expect(content).toContain(
      '<link href="styles.css" rel="stylesheet" media="print" data-beasties-media="all">',
    );
    expect(content).toContain(
      '<link href="theme.css" rel="stylesheet" media="print" data-beasties-media="all">',
    );
    expect(content).not.toContain('color: blue');
    expect(tags.stripIndents`${content}`).toContain(tags.stripIndents`
    <style>
    body { margin: 0; }
    html { color: white; }
    </style>`);
  });

  it('should inline critical css when using deployUrl', async () => {
    const { content, errors, warnings } = await inlineCriticalCss(
      getContent('http://cdn.com/'),
      '/dist/',
      'http://cdn.com',
      false,
      readAsset,
    );

    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
    expect(content).toContain(
      '<link href="http://cdn.com/styles.css" rel="stylesheet" media="print" data-beasties-media="all">',
    );
    expect(content).toContain(
      '<link href="http://cdn.com/theme.css" rel="stylesheet" media="print" data-beasties-media="all">',
    );
    expect(tags.stripIndents`${content}`).toContain(tags.stripIndents`
    <style>
    body { margin: 0; }
    html { color: white; }
    </style>`);
  });

  it('should compress inline critical css when minify is enabled', async () => {
    const { content, errors, warnings } = await inlineCriticalCss(
      getContent(''),
      '/dist/',
      undefined,
      true,
      readAsset,
    );

    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
    expect(content).toContain(
      '<link href="styles.css" rel="stylesheet" media="print" data-beasties-media="all">',
    );
    expect(content).toContain(
      '<link href="theme.css" rel="stylesheet" media="print" data-beasties-media="all">',
    );
    expect(content).toContain('<style>body{margin:0}html{color:white}</style>');
  });

  it('should process the inline onload handlers and style tag when ngCspNonce is specified', async () => {
    const { content, errors, warnings } = await inlineCriticalCss(
      getContent('', '<app ngCspNonce="{% nonce %}"></app>'),
      '/dist/',
      undefined,
      false,
      readAsset,
    );

    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
    expect(content).toContain(
      '<link href="styles.css" rel="stylesheet" media="print" data-beasties-media="all">',
    );
    expect(content).toContain(
      '<link href="theme.css" rel="stylesheet" media="print" data-beasties-media="all">',
    );
    // Nonces shouldn't be added inside the `noscript` tags.
    expect(content).toContain('<noscript><link href="theme.css" rel="stylesheet"></noscript>');
    expect(content).toContain('<script nonce="{% nonce %}">');
    expect(tags.stripIndents`${content}`).toContain(tags.stripIndents`
    <style nonce="{% nonce %}">
    body { margin: 0; }
    html { color: white; }
    </style>`);
  });

  it('should process the inline onload handlers and style tag when ngcspnonce is lowercase', async () => {
    const { content, errors, warnings } = await inlineCriticalCss(
      getContent('', '<app ngcspnonce="{% nonce %}"></app>'),
      '/dist/',
      undefined,
      false,
      readAsset,
    );

    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
    expect(content).toContain('<script nonce="{% nonce %}">');
    expect(tags.stripIndents`${content}`).toContain(tags.stripIndents`
    <style nonce="{% nonce %}">
    body { margin: 0; }
    html { color: white; }
    </style>`);
  });

  it('should not modify the document for external stylesheets', async () => {
    const initialContent = `
      <!doctype html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <link rel="stylesheet" href="https://google.com/styles.css" />
      </head>
      <body>
        <app ngCspNonce="{% nonce %}"></app>
      </body>
      </html>
    `;

    const { content, errors, warnings } = await inlineCriticalCss(
      initialContent,
      '/dist/',
      undefined,
      false,
      readAsset,
    );

    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
    expect(tags.stripIndents`${content}`).toContain(tags.stripIndents`
      <head>
        <meta charset="utf-8">
        <link rel="stylesheet" href="https://google.com/styles.css">
      </head>
    `);
  });

  it('should clean up empty values from valueless attributes like defer and nomodule', async () => {
    const initialContent = `
      <!doctype html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <link rel="stylesheet" href="styles.css">
        <script src="main.js" defer="" nomodule=""></script>
      </head>
      <body>
      </body>
      </html>
    `;

    const { content } = await inlineCriticalCss(
      initialContent,
      '/dist/',
      undefined,
      false,
      readAsset,
    );

    expect(content).toContain('<script src="main.js" defer nomodule></script>');
  });

  it('should capture warnings from beasties', async () => {
    const initialContent = `
      <html>
      <head>
        <link href="missing.css" rel="stylesheet">
      </head>
      <body></body>
    </html>`;

    const { warnings } = await inlineCriticalCss(
      initialContent,
      '/dist/',
      undefined,
      false,
      readAsset,
    );

    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain('missing.css');
  });
});
