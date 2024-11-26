/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import path from 'node:path';
import { NormalizedApplicationBuildOptions } from '../../builders/application/options';
import { IndexHtmlGenerator } from '../../utils/index-file/index-html-generator';
import { BuildOutputFile, BuildOutputFileType, InitialFileRecord } from './bundler-context';

/**
 * The maximum number of module preload link elements that should be added for
 * initial scripts.
 */
const MODULE_PRELOAD_MAX = 10;

export async function generateIndexHtml(
  initialFiles: Map<string, InitialFileRecord>,
  outputFiles: BuildOutputFile[],
  buildOptions: NormalizedApplicationBuildOptions,
  lang?: string,
): Promise<{
  csrContent: string;
  ssrContent?: string;
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
    hashFuncNames,
    baseHref,
  } = buildOptions;

  assert(indexHtmlOptions, 'indexHtmlOptions cannot be undefined.');

  if (!externalPackages && indexHtmlOptions.preloadInitial) {
    const modulePreloads = [];
    for (const [key, value] of initialFiles) {
      if (value.entrypoint || value.serverFile) {
        // Entry points are already referenced in the HTML
        continue;
      }

      if (value.type === 'script') {
        modulePreloads.push({ url: key, mode: 'modulepreload' as const, depth: value.depth });
      } else if (value.type === 'style') {
        // Provide an "as" value of "style" to ensure external URLs which may not have a
        // file extension are treated as stylesheets.
        hints.push({ url: key, mode: 'preload' as const, as: 'style' });
      }
    }

    // Limit the number of module preloads with smallest depth given priority
    modulePreloads.sort((a, b) => a.depth - b.depth);
    hints.push(...modulePreloads.slice(0, MODULE_PRELOAD_MAX));
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

  // Read the Auto CSP options.
  const autoCsp = buildOptions.security?.autoCsp;
  const autoCspOptions =
    autoCsp === true
      ? { unsafeEval: false }
      : autoCsp
        ? { unsafeEval: !!autoCsp.unsafeEval }
        : undefined;

  // Create an index HTML generator that reads from the in-memory output files
  const indexHtmlGenerator = new IndexHtmlGenerator({
    indexPath: indexHtmlOptions.input,
    entrypoints: indexHtmlOptions.insertionOrder,
    sri: subresourceIntegrity,
    sriHashAlgo: hashFuncNames,
    optimization: optimizationOptions,
    crossOrigin: crossOrigin,
    deployUrl: buildOptions.publicPath,
    postTransform: indexHtmlOptions.transformer,
    generateDedicatedSSRContent: !!(
      buildOptions.ssrOptions ||
      buildOptions.prerenderOptions ||
      buildOptions.appShellOptions
    ),
    autoCsp: autoCspOptions,
  });

  indexHtmlGenerator.readAsset = readAsset;

  return indexHtmlGenerator.process({
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
}
