/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { Metafile } from 'esbuild';
import { BuildOutputFileType, createOutputFile } from '../../tools/esbuild/bundler-files';
import { initializeHash } from '../hash';
import { generateAngularServerAppManifest } from './manifest';

describe('generateAngularServerAppManifest', () => {
  beforeAll(async () => {
    await initializeHash();
  });

  const dummyMetafile = { inputs: {}, outputs: {} } as unknown as Metafile;

  /**
   * Evaluates a generated manifest, which both asserts that it is syntactically valid JavaScript and
   * gives access to the values it declares. The dynamic imports it contains are never invoked.
   */
  function evaluateManifest(manifestContent: string): unknown {
    return new Function(manifestContent.replace('export default', 'return'))();
  }

  function generateManifest(
    htmlOutputFiles: Record<string, string>,
    baseHref = '/',
  ): ReturnType<typeof generateAngularServerAppManifest> {
    const additionalHtmlOutputFiles = new Map(
      Object.entries(htmlOutputFiles).map(([path, content]) => [
        path,
        createOutputFile(path, content, BuildOutputFileType.Browser),
      ]),
    );

    return generateAngularServerAppManifest(
      additionalHtmlOutputFiles,
      [],
      false,
      undefined,
      undefined,
      baseHref,
      new Set(),
      dummyMetafile,
      undefined,
    );
  }

  it('should include criticalCssPlans when inlineCriticalCss is true', async () => {
    const additionalHtml = new Map([
      [
        'index.server.html',
        createOutputFile(
          'index.server.html',
          '<html><body><app-root></app-root></body></html>',
          BuildOutputFileType.ServerApplication,
        ),
      ],
    ]);
    const outputFiles = [
      createOutputFile('styles.css', 'h1 { color: blue; }', BuildOutputFileType.Browser),
    ];

    const { manifestContent } = await generateAngularServerAppManifest(
      additionalHtml,
      outputFiles,
      true,
      undefined,
      undefined,
      '/',
      new Set(),
      dummyMetafile,
      undefined,
    );

    expect(manifestContent).toContain('criticalCssPlans: [');
    expect(manifestContent).toContain('styles.css');
    expect(manifestContent).not.toContain('nonce:');
  });

  it('should not include criticalCssPlans when inlineCriticalCss is false', async () => {
    const additionalHtml = new Map([
      [
        'index.server.html',
        createOutputFile(
          'index.server.html',
          '<html><body><app-root></app-root></body></html>',
          BuildOutputFileType.ServerApplication,
        ),
      ],
    ]);
    const outputFiles = [
      createOutputFile('styles.css', 'h1 { color: blue; }', BuildOutputFileType.Browser),
    ];

    const { manifestContent } = await generateAngularServerAppManifest(
      additionalHtml,
      outputFiles,
      false,
      undefined,
      undefined,
      '/',
      new Set(),
      dummyMetafile,
      undefined,
    );

    expect(manifestContent).not.toContain('criticalCssPlans:');
  });

  it('should extract template nonce from index HTML when present', async () => {
    const additionalHtml = new Map([
      [
        'index.server.html',
        createOutputFile(
          'index.server.html',
          '<html><body><app-root ngCspNonce="{% nonce %}"></app-root></body></html>',
          BuildOutputFileType.ServerApplication,
        ),
      ],
    ]);
    const outputFiles = [
      createOutputFile('styles.css', 'h1 { color: blue; }', BuildOutputFileType.Browser),
    ];

    const { manifestContent } = await generateAngularServerAppManifest(
      additionalHtml,
      outputFiles,
      true,
      undefined,
      undefined,
      '/',
      new Set(),
      dummyMetafile,
      undefined,
    );

    expect(manifestContent).toContain('nonce: "{% nonce %}"');
  });

  it('should not include css files in serverAssetsChunks or assets', async () => {
    const additionalHtml = new Map([
      [
        'index.server.html',
        createOutputFile(
          'index.server.html',
          '<html><body></body></html>',
          BuildOutputFileType.ServerApplication,
        ),
      ],
    ]);
    const outputFiles = [
      createOutputFile('styles.css', 'h1 { color: blue; }', BuildOutputFileType.Browser),
    ];

    const { manifestContent, serverAssetsChunks } = await generateAngularServerAppManifest(
      additionalHtml,
      outputFiles,
      true,
      undefined,
      undefined,
      '/',
      new Set(),
      dummyMetafile,
      undefined,
    );

    expect(serverAssetsChunks.some((chunk) => chunk.path.includes('styles'))).toBeFalse();
    expect(manifestContent).not.toContain('"styles.css":');
  });

  it('should serialize asset paths which contain JavaScript string delimiters', async () => {
    const assetPath = "catalog/customer's-choice/index.html";
    const { manifestContent } = await generateManifest({
      [assetPath]: '<main>Featured</main>',
    });

    expect(evaluateManifest(manifestContent)).toEqual(
      jasmine.objectContaining({
        assets: {
          [assetPath]: jasmine.objectContaining({
            size: 21,
            hash: jasmine.any(String),
            text: jasmine.any(Function),
          }),
        },
      }),
    );
  });

  it('should serialize a base href which contains JavaScript string delimiters', async () => {
    const { manifestContent } = await generateManifest(
      { 'index.html': '<main></main>' },
      "/o'brien/",
    );

    expect(evaluateManifest(manifestContent)).toEqual(
      jasmine.objectContaining({
        baseHref: "/o'brien/",
      }),
    );
  });
});
