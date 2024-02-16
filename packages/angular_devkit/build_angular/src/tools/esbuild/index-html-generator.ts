/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import assert from 'node:assert';
import path from 'node:path';
import { NormalizedApplicationBuildOptions } from '../../builders/application/options';
import { IndexHtmlGenerator } from '../../utils/index-file/index-html-generator';
import { BuildOutputFile, BuildOutputFileType, InitialFileRecord } from './bundler-context';

export async function generateIndexHtml(
  initialFiles: Map<string, InitialFileRecord>,
  outputFiles: BuildOutputFile[],
  buildOptions: NormalizedApplicationBuildOptions,
  lang?: string,
): Promise<{
  content: string;
  contentWithoutCriticalCssInlined: string;
  warnings: string[];
  errors: string[];
}> {
  // Analyze metafile for initial link-based hints.
  // Skip if the internal externalPackages option is enabled since this option requires
  // dev server cooperation to properly resolve and fetch imports.
  const hints = [];
  const {
    indexHtmlOptions,
    externalPackages,
    optimizationOptions,
    crossOrigin,
    subresourceIntegrity,
    baseHref,
  } = buildOptions;

  assert(indexHtmlOptions, 'indexHtmlOptions cannot be undefined.');

  if (!externalPackages && indexHtmlOptions.preloadInitial) {
    for (const [key, value] of initialFiles) {
      if (value.entrypoint || value.serverFile) {
        // Entry points are already referenced in the HTML
        continue;
      }

      if (value.type === 'script') {
        hints.push({ url: key, mode: 'modulepreload' as const });
      } else if (value.type === 'style') {
        // Provide an "as" value of "style" to ensure external URLs which may not have a
        // file extension are treated as stylesheets.
        hints.push({ url: key, mode: 'preload' as const, as: 'style' });
      }
    }
  }

  /** Virtual output path to support reading in-memory files. */
  const browserOutputFiles = outputFiles.filter(({ type }) => type === BuildOutputFileType.Browser);
  const virtualOutputPath = '/';
  const readAsset = async function (filePath: string): Promise<string> {
    // Remove leading directory separator
    const relativefilePath = path.relative(virtualOutputPath, filePath);
    const file = browserOutputFiles.find((file) => file.path === relativefilePath);
    if (file) {
      return file.text;
    }

    throw new Error(`Output file does not exist: ${relativefilePath}`);
  };

  // Create an index HTML generator that reads from the in-memory output files
  const indexHtmlGenerator = new IndexHtmlGenerator({
    indexPath: indexHtmlOptions.input,
    entrypoints: indexHtmlOptions.insertionOrder,
    sri: subresourceIntegrity,
    optimization: {
      ...optimizationOptions,
      styles: {
        ...optimizationOptions.styles,
        inlineCritical: false, // Disable critical css inline as for SSR and SSG this will be done during rendering.
      },
    },
    crossOrigin: crossOrigin,
    deployUrl: buildOptions.publicPath,
    postTransform: indexHtmlOptions.transformer,
  });

  indexHtmlGenerator.readAsset = readAsset;

  const transformResult = await indexHtmlGenerator.process({
    baseHref,
    lang,
    outputPath: virtualOutputPath,
    files: [...initialFiles]
      .filter(([, file]) => !file.serverFile)
      .map(([file, record]) => ({
        name: record.name ?? '',
        file,
        extension: path.extname(file),
      })),
    hints,
  });

  const contentWithoutCriticalCssInlined = transformResult.content;
  if (!optimizationOptions.styles.inlineCritical) {
    return {
      ...transformResult,
      contentWithoutCriticalCssInlined,
    };
  }

  const { InlineCriticalCssProcessor } = await import('../../utils/index-file/inline-critical-css');

  const inlineCriticalCssProcessor = new InlineCriticalCssProcessor({
    minify: false, // CSS has already been minified during the build.
    deployUrl: buildOptions.publicPath,
    readAsset,
  });

  const { content, errors, warnings } = await inlineCriticalCssProcessor.process(
    contentWithoutCriticalCssInlined,
    {
      outputPath: virtualOutputPath,
    },
  );

  return {
    errors: [...transformResult.errors, ...errors],
    warnings: [...transformResult.warnings, ...warnings],
    content,
    contentWithoutCriticalCssInlined,
  };
}
