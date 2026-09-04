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

/**
 * Evaluates a generated manifest, which both asserts that it is syntactically valid JavaScript and
 * gives access to the values it declares. The dynamic imports it contains are never invoked.
 */
function evaluateManifest(manifestContent: string): Record<string, unknown> {
  return new Function(manifestContent.replace('export default', 'return'))() as Record<
    string,
    unknown
  >;
}

const dummyMetafile = { inputs: {}, outputs: {} } as unknown as Metafile;

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

describe('generateAngularServerAppManifest', () => {
  beforeAll(async () => {
    await initializeHash();
  });

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

  it('serializes asset paths which contain JavaScript string delimiters', async () => {
    const assetPath = "catalog/customer's-choice/index.html";
    const { manifestContent } = await generateManifest({
      [assetPath]: '<main>Featured</main>',
    });

    const assets = evaluateManifest(manifestContent)['assets'] as Record<string, unknown>;
    expect(Object.keys(assets)).toEqual([assetPath]);
  });

  it('serializes a base href which contains JavaScript string delimiters', async () => {
    const { manifestContent } = await generateManifest(
      { 'index.html': '<main></main>' },
      "/o'brien/",
    );

    expect(evaluateManifest(manifestContent)['baseHref']).toBe("/o'brien/");
  });

  it('generates chunk names which are usable as a file name and as a module specifier', async () => {
    const assetPath = "catalog/customer's#featured?ratio=50%/index.html";
    const { serverAssetsChunks } = await generateManifest({
      [assetPath]: '<main>Featured</main>',
    });

    expect(serverAssetsChunks).toHaveSize(1);
    expect(serverAssetsChunks[0].path).toMatch(/^assets-chunks\/[a-zA-Z0-9_-]+\.mjs$/);
  });

  it('generates a dynamic import which resolves back to the emitted chunk', async () => {
    // The in-memory ESM loader used while prerendering resolves the specifier as a URL and looks the
    // result up by output file path, so the two have to match exactly.
    const assetPath = "catalog/customer's#featured?ratio=50%/index.html";
    const { manifestContent, serverAssetsChunks } = await generateManifest({
      [assetPath]: '<main>Featured</main>',
    });

    const assets = evaluateManifest(manifestContent)['assets'] as Record<
      string,
      { text: () => Promise<string> }
    >;
    const specifier = /import\("(.+?)"\)/.exec(assets[assetPath].text.toString())?.[1];

    const root = 'file:///virtual/root/';
    expect(specifier).toBeDefined();
    expect(new URL(specifier as string, root).href.slice(root.length)).toBe(
      serverAssetsChunks[0].path,
    );
  });

  it('generates a distinct chunk for asset paths which map to the same name', async () => {
    const { serverAssetsChunks } = await generateManifest({
      'foo/bar/index.html': '<main>nested</main>',
      'foo_bar/index.html': '<main>flat</main>',
    });

    expect(serverAssetsChunks).toHaveSize(2);
    expect(serverAssetsChunks[0].path).not.toBe(serverAssetsChunks[1].path);
  });
});
