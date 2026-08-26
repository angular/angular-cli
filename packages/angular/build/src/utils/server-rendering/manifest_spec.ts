/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { Metafile } from 'esbuild';
import { BuildOutputFileType } from '../../tools/esbuild/bundler-context';
import { createOutputFile } from '../../tools/esbuild/utils';
import { generateAngularServerAppManifest } from './manifest';

describe('generateAngularServerAppManifest', () => {
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

  it('should serialize asset paths which contain JavaScript string delimiters', () => {
    const assetPath = "catalog/customer's-choice/index.html";
    const { manifestContent } = generateManifest({
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

  it('should serialize a base href which contains JavaScript string delimiters', () => {
    const { manifestContent } = generateManifest({ 'index.html': '<main></main>' }, "/o'brien/");

    expect(evaluateManifest(manifestContent)).toEqual(
      jasmine.objectContaining({
        baseHref: "/o'brien/",
      }),
    );
  });
});
