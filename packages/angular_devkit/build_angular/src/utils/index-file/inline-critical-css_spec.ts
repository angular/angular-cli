/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { tags } from '@angular-devkit/core';
import { InlineCriticalCssProcessor } from './inline-critical-css';

describe('InlineCriticalCssProcessor', () => {
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

    throw new Error('Cannot read asset.');
  };

  const getContent = (deployUrl: string): string => {
    return `
      <html>
      <head>
        <link href="${deployUrl}styles.css" rel="stylesheet">
        <link href="${deployUrl}theme.css" rel="stylesheet">
      </head>
      <body></body>
    </html>`;
  };

  it('should inline critical css', async () => {
    const inlineFontsProcessor = new InlineCriticalCssProcessor({
      readAsset,
    });

    const { content } = await inlineFontsProcessor.process(getContent(''), {
      outputPath: '/dist/',
    });

    expect(content).toContain(
      `<link href="styles.css" rel="stylesheet" media="print" onload="this.media='all'">`,
    );
    expect(content).toContain(
      `<link href="theme.css" rel="stylesheet" media="print" onload="this.media='all'">`,
    );
    expect(content).not.toContain('color: blue');
    expect(tags.stripIndents`${content}`).toContain(tags.stripIndents`
    <style>body {
      margin: 0;
      }

      html {
      color: white;
      }</style>
      `);
  });

  it('should inline critical css when using deployUrl', async () => {
    const inlineFontsProcessor = new InlineCriticalCssProcessor({
      readAsset,
      deployUrl: 'http://cdn.com',
    });

    const { content } = await inlineFontsProcessor.process(getContent('http://cdn.com/'), {
      outputPath: '/dist/',
    });

    expect(content).toContain(
      `<link href="http://cdn.com/styles.css" rel="stylesheet" media="print" onload="this.media='all'">`,
    );
    expect(content).toContain(
      `<link href="http://cdn.com/theme.css" rel="stylesheet" media="print" onload="this.media='all'">`,
    );
    expect(tags.stripIndents`${content}`).toContain(tags.stripIndents`
    <style>body {
      margin: 0;
      }

      html {
      color: white;
      }</style>
      `);
  });

  it('should compress inline critical css when minify is enabled', async () => {
    const inlineFontsProcessor = new InlineCriticalCssProcessor({
      readAsset,
      minify: true,
    });

    const { content } = await inlineFontsProcessor.process(getContent(''), {
      outputPath: '/dist/',
    });

    expect(content).toContain(
      `<link href="styles.css" rel="stylesheet" media="print" onload="this.media='all'">`,
    );
    expect(content).toContain(
      `<link href="theme.css" rel="stylesheet" media="print" onload="this.media='all'">`,
    );
    expect(content).toContain('<style>body{margin:0;}html{color:white;}</style>');
  });
});
