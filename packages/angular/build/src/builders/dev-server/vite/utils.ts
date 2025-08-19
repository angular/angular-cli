/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { ComponentStyleRecord } from '../../../tools/vite/middlewares';
import type { ResultFile } from '../../application/results';
import { BuildOutputFileType, type ExternalResultMetadata } from '../internal';

export interface OutputFileRecord {
  contents: Uint8Array;
  size: number;
  hash: string;
  updated: boolean;
  servable: boolean;
  type: BuildOutputFileType;
}

export interface OutputAssetRecord {
  source: string;
  updated: boolean;
}

export interface DevServerExternalResultMetadata extends Omit<ExternalResultMetadata, 'explicit'> {
  explicitBrowser: string[];
  explicitServer: string[];
}

export function updateResultRecord(
  outputPath: string,
  file: ResultFile,
  normalizePath: (id: string) => string,
  htmlIndexPath: string,
  generatedFiles: Map<string, OutputFileRecord>,
  assetFiles: Map<string, OutputAssetRecord>,
  componentStyles: Map<string, ComponentStyleRecord>,
  initial = false,
): void {
  if (file.origin === 'disk') {
    assetFiles.set('/' + normalizePath(outputPath), {
      source: normalizePath(file.inputPath),
      updated: !initial,
    });

    return;
  }

  let filePath;
  if (outputPath === htmlIndexPath) {
    // Convert custom index output path to standard index path for dev-server usage.
    // This mimics the Webpack dev-server behavior.
    filePath = '/index.html';
  } else {
    filePath = '/' + normalizePath(outputPath);
  }

  const servable =
    file.type === BuildOutputFileType.Browser || file.type === BuildOutputFileType.Media;

  // Skip analysis of sourcemaps
  if (filePath.endsWith('.map')) {
    generatedFiles.set(filePath, {
      contents: file.contents,
      servable,
      size: file.contents.byteLength,
      hash: file.hash,
      type: file.type,
      updated: false,
    });

    return;
  }

  // New or updated file
  generatedFiles.set(filePath, {
    contents: file.contents,
    size: file.contents.byteLength,
    hash: file.hash,
    // Consider the files updated except on the initial build result
    updated: !initial,
    type: file.type,
    servable,
  });

  // Record any external component styles
  if (filePath.endsWith('.css') && /^\/[a-f0-9]{64}\.css$/.test(filePath)) {
    const componentStyle = componentStyles.get(filePath);
    if (componentStyle) {
      componentStyle.rawContent = file.contents;
    } else {
      componentStyles.set(filePath, {
        rawContent: file.contents,
      });
    }
  }
}

/**
 * Checks if the given value is an absolute URL.
 *
 * This function helps in avoiding Vite's prebundling from processing absolute URLs (http://, https://, //) as files.
 *
 * @param value - The URL or path to check.
 * @returns `true` if the value is not an absolute URL; otherwise, `false`.
 */
export function isAbsoluteUrl(value: string): boolean {
  return /^(?:https?:)?\/\//.test(value);
}
