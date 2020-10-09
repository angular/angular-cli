/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { EmittedFiles } from '@angular-devkit/build-webpack';
import { normalize, virtualFs } from '@angular-devkit/core';
import { dirname, join } from 'path';
import { ExtraEntryPoint } from '../../browser/schema';
import { generateEntryPoints } from '../package-chunk-sort';
import { stripBom } from '../strip-bom';
import { CrossOriginValue, FileInfo, augmentIndexHtml } from './augment-index-html';

type ExtensionFilter = '.js' | '.css';

export interface WriteIndexHtmlOptions {
  host: virtualFs.Host;
  outputPath: string;
  indexPath: string;
  files?: EmittedFiles[];
  noModuleFiles?: EmittedFiles[];
  moduleFiles?: EmittedFiles[];
  baseHref?: string;
  deployUrl?: string;
  sri?: boolean;
  scripts?: ExtraEntryPoint[];
  styles?: ExtraEntryPoint[];
  postTransforms: IndexHtmlTransform[];
  crossOrigin?: CrossOriginValue;
  lang?: string;
}

export type IndexHtmlTransform = (content: string) => Promise<string>;

export async function writeIndexHtml({
  host,
  outputPath,
  indexPath,
  files = [],
  noModuleFiles = [],
  moduleFiles = [],
  baseHref,
  deployUrl,
  sri = false,
  scripts = [],
  styles = [],
  postTransforms,
  crossOrigin,
  lang,
}: WriteIndexHtmlOptions): Promise<void> {
  const readFile = async (filePath: string) =>
    virtualFs.fileBufferToString(await host.read(normalize(filePath)).toPromise());

  let content = await augmentIndexHtml({
    input: outputPath,
    inputContent: stripBom(await readFile(indexPath)),
    baseHref,
    deployUrl,
    crossOrigin,
    sri,
    lang,
    entrypoints: generateEntryPoints({ scripts, styles }),
    files: filterAndMapBuildFiles(files, ['.js', '.css']),
    noModuleFiles: filterAndMapBuildFiles(noModuleFiles, '.js'),
    moduleFiles: filterAndMapBuildFiles(moduleFiles, '.js'),
    loadOutputFile: filePath => readFile(join(dirname(outputPath), filePath)),
  });

  for (const transform of postTransforms) {
    content = await transform(content);
  }

  await host.write(normalize(outputPath), virtualFs.stringToFileBuffer(content)).toPromise();
}

function filterAndMapBuildFiles(
  files: EmittedFiles[],
  extensionFilter: ExtensionFilter | ExtensionFilter[],
): FileInfo[] {
  const filteredFiles: FileInfo[] = [];
  const validExtensions: string[] = Array.isArray(extensionFilter)
    ? extensionFilter
    : [extensionFilter];

  for (const { file, name, extension, initial } of files) {
    if (name && initial && validExtensions.includes(extension)) {
      filteredFiles.push({ file, extension, name });
    }
  }

  return filteredFiles;
}
