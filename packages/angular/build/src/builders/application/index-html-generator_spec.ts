/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  BuildOutputFile,
  BuildOutputFileType,
  InitialFileRecord,
} from '../../tools/esbuild/bundler-files';
import { generateIndexHtml } from './index-html-generator';
import { NormalizedApplicationBuildOptions } from './options';

describe('generateIndexHtml', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'index-html-generator-spec-'));
    await writeFile(
      join(tempDir, 'index.html'),
      '<html><head><base href="/"></head><body><app-root></app-root></body></html>',
    );
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  function createOutputFile(path: string): BuildOutputFile {
    const text = `console.log(${JSON.stringify(path)});`;

    return {
      path,
      text,
      contents: Buffer.from(text),
      type: BuildOutputFileType.Browser,
    } as unknown as BuildOutputFile;
  }

  function createOptions(subresourceIntegrity: boolean): NormalizedApplicationBuildOptions {
    return {
      indexHtmlOptions: {
        input: join(tempDir, 'index.html'),
        insertionOrder: [['main.js', true]],
        preloadInitial: true,
      },
      subresourceIntegrity,
      baseHref: '/',
      security: {},
    } as unknown as NormalizedApplicationBuildOptions;
  }

  it('adds integrity metadata for every initial chunk when there are more than the module preload limit', async () => {
    const chunkCount = 15;
    const chunks = Array.from({ length: chunkCount }, (_, i) => `chunk-${i}.js`);
    const initialFiles = new Map<string, InitialFileRecord>([
      ['main.js', { entrypoint: true, name: 'main', type: 'script', serverFile: false, depth: 0 }],
      ...chunks.map(
        (chunk, i) =>
          [chunk, { entrypoint: false, type: 'script', serverFile: false, depth: i + 1 }] as [
            string,
            InitialFileRecord,
          ],
      ),
    ]);
    const outputFiles = ['main.js', ...chunks].map(createOutputFile);

    const { csrContent, errors } = await generateIndexHtml(
      initialFiles,
      outputFiles,
      createOptions(true),
    );
    expect(errors).toEqual([]);

    const importMapMatch = /<script type="importmap">(.*?)<\/script>/.exec(csrContent);
    const importMapIntegrity: Record<string, string> = importMapMatch
      ? JSON.parse(importMapMatch[1]).integrity
      : {};

    for (const chunk of chunks) {
      const hasPreloadIntegrity = new RegExp(
        `<link rel="modulepreload" href="${chunk}" integrity="sha384-[^"]+"`,
      ).test(csrContent);

      expect(hasPreloadIntegrity || `./${chunk}` in importMapIntegrity)
        .withContext(`Expected integrity metadata for ${chunk}`)
        .toBeTrue();
    }
  });

  it('adds integrity metadata for initial chunks when module preloads are disabled', async () => {
    const initialFiles = new Map<string, InitialFileRecord>([
      ['main.js', { entrypoint: true, name: 'main', type: 'script', serverFile: false, depth: 0 }],
      ['chunk-a.js', { entrypoint: false, type: 'script', serverFile: false, depth: 1 }],
    ]);
    const outputFiles = ['main.js', 'chunk-a.js'].map(createOutputFile);
    const options = createOptions(true);
    options.indexHtmlOptions!.preloadInitial = false;

    const { csrContent, errors } = await generateIndexHtml(initialFiles, outputFiles, options);
    expect(errors).toEqual([]);

    const importMapMatch = /<script type="importmap">(.*?)<\/script>/.exec(csrContent);
    const importMapIntegrity: Record<string, string> = JSON.parse(importMapMatch![1]).integrity;

    expect(Object.keys(importMapIntegrity)).toEqual(['./chunk-a.js']);
  });
});
