/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { EmittedFiles } from '@angular-devkit/build-webpack';
import { Path, basename, getSystemPath, join, virtualFs } from '@angular-devkit/core';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ExtraEntryPoint } from '../../../browser/schema';
import { generateEntryPoints } from '../package-chunk-sort';
import { stripBom } from '../strip-bom';
import { FileInfo, augmentIndexHtml } from './augment-index-html';

export interface WriteIndexHtmlOptions {
  host: virtualFs.Host;
  outputPath: Path;
  indexPath: Path;
  ES5BuildFiles: EmittedFiles[];
  ES2015BuildFiles: EmittedFiles[];
  baseHref?: string;
  deployUrl?: string;
  sri?: boolean;
  scripts?: ExtraEntryPoint[];
  styles?: ExtraEntryPoint[];
}

export function writeIndexHtml({
  host,
  outputPath,
  indexPath,
  ES5BuildFiles,
  ES2015BuildFiles,
  baseHref,
  deployUrl,
  sri = false,
  scripts = [],
  styles = [],
}: WriteIndexHtmlOptions): Observable<void> {

  return host.read(indexPath)
    .pipe(
      map(content => stripBom(virtualFs.fileBufferToString(content))),
      switchMap(content => augmentIndexHtml({
        input: getSystemPath(outputPath),
        inputContent: content,
        baseHref,
        deployUrl,
        sri,
        entrypoints: generateEntryPoints({ scripts, styles }),
        files: filterAndMapBuildFiles(ES5BuildFiles, '.css'),
        noModuleFiles: filterAndMapBuildFiles(ES5BuildFiles, '.js'),
        moduleFiles: filterAndMapBuildFiles(ES2015BuildFiles, '.js'),
        loadOutputFile: async filePath => {
          return host.read(join(outputPath, filePath))
            .pipe(
              map(data => virtualFs.fileBufferToString(data)),
            )
            .toPromise();
        },
      }),
      ),
      map(content => virtualFs.stringToFileBuffer(content.source())),
      switchMap(content => host.write(join(outputPath, basename(indexPath)), content)),
    );
}

function filterAndMapBuildFiles(
  files: EmittedFiles[],
  extensionFilter: '.js' | '.css',
): FileInfo[] {
  const filteredFiles: FileInfo[] = [];
  for (const { file, name, extension, initial } of files) {
    if (name && initial && extension === extensionFilter) {
      filteredFiles.push({ file, extension, name });
    }
  }

  return filteredFiles;
}
