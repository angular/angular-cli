/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { EmittedFiles } from '@angular-devkit/build-webpack';
import { dirname, join } from 'path';
import { ExtraEntryPoint } from '../../browser/schema';
import { mkdir, readFile, writeFile } from '../fs';
import { generateEntryPoints } from '../package-chunk-sort';
import { stripBom } from '../strip-bom';
import { CrossOriginValue, FileInfo, augmentIndexHtml } from './augment-index-html';

type ExtensionFilter = '.js' | '.css';

export interface WriteIndexHtmlOptions {
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
  let content = await augmentIndexHtml({
    input: outputPath,
    inputContent: stripBom(await readFile(indexPath, 'utf-8')),
    baseHref,
    deployUrl,
    crossOrigin,
    sri,
    lang,
    entrypoints: generateEntryPoints({ scripts, styles }),
    files: filterAndMapBuildFiles(files, ['.js', '.css']),
    noModuleFiles: filterAndMapBuildFiles(noModuleFiles, '.js'),
    moduleFiles: filterAndMapBuildFiles(moduleFiles, '.js'),
    loadOutputFile: filePath => readFile(join(dirname(outputPath), filePath), 'utf-8'),
  });

  for (const transform of postTransforms) {
    content = await transform(content);
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, content);
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
