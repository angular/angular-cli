/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  BuildOutputFileType,
  InitialFileRecord,
  createOutputFile,
} from '../../tools/esbuild/bundler-files';
import { generateIndexHtml } from './index-html-generator';
import { NormalizedApplicationBuildOptions } from './options';

describe('generateIndexHtml', () => {
  let tempDir: string;

  beforeEach(async () => {
    const baseTmpDir = process.env['TEST_TMPDIR'];
    assert(baseTmpDir, 'TEST_TMPDIR is not set');
    tempDir = await mkdtemp(join(baseTmpDir, 'index-html-generator-spec-'));
    await writeFile(
      join(tempDir, 'index.html'),
      '<html><head><base href="/"></head><body><app-root></app-root></body></html>',
    );
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  function createOptions(
    subresourceIntegrity: boolean,
    preloadInitial = true,
  ): NormalizedApplicationBuildOptions {
    return {
      indexHtmlOptions: {
        input: join(tempDir, 'index.html'),
        insertionOrder: [['main.js', true]],
        preloadInitial,
      },
      subresourceIntegrity,
      baseHref: '/',
      security: {},
    } as unknown as NormalizedApplicationBuildOptions;
  }

  it('should add integrity metadata for every initial chunk when there are more than the module preload limit', async () => {
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
    const outputFiles = ['main.js', ...chunks].map((path) =>
      createOutputFile(path, `console.log(${JSON.stringify(path)});`, BuildOutputFileType.Browser),
    );

    const { csrContent, errors } = await generateIndexHtml(
      initialFiles,
      outputFiles,
      createOptions(true),
    );
    expect(errors).toHaveSize(0);

    for (const chunk of chunks.slice(0, 10)) {
      expect(csrContent).toContain(`<link rel="modulepreload" href="${chunk}" integrity="sha384`);
      expect(csrContent).not.toContain(`./${chunk}`);
    }

    for (const chunk of chunks.slice(10)) {
      expect(csrContent).toContain(`./${chunk}`);
      expect(csrContent).not.toContain(`<link rel="modulepreload" href="${chunk}"`);
    }
  });

  it('should add integrity metadata for initial chunks when module preloads are disabled', async () => {
    const initialFiles = new Map<string, InitialFileRecord>([
      ['main.js', { entrypoint: true, name: 'main', type: 'script', serverFile: false, depth: 0 }],
      ['chunk-a.js', { entrypoint: false, type: 'script', serverFile: false, depth: 1 }],
    ]);
    const outputFiles = ['main.js', 'chunk-a.js'].map((path) =>
      createOutputFile(path, `console.log(${JSON.stringify(path)});`, BuildOutputFileType.Browser),
    );
    const options = createOptions(true, false);

    const { csrContent, errors } = await generateIndexHtml(initialFiles, outputFiles, options);
    expect(errors).toHaveSize(0);

    expect(csrContent).toContain(`"./${outputFiles[1].path}":`);
    expect(csrContent).not.toContain(`"./${outputFiles[0].path}":`);
    expect(csrContent).not.toContain('rel="modulepreload"');
  });
});
