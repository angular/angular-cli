/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import * as assert from 'assert';
import type { OutputFile } from 'esbuild';
import { promises as fs } from 'fs';
import * as path from 'path';
import { NormalizedOptimizationOptions, deleteOutputDir } from '../../utils';
import { copyAssets } from '../../utils/copy-assets';
import { assertIsError } from '../../utils/error';
import { FileInfo } from '../../utils/index-file/augment-index-html';
import { IndexHtmlGenerator } from '../../utils/index-file/index-html-generator';
import { generateEntryPoints } from '../../utils/package-chunk-sort';
import { augmentAppWithServiceWorker } from '../../utils/service-worker';
import { getIndexInputFile, getIndexOutputFile } from '../../utils/webpack-browser-config';
import { resolveGlobalStyles } from '../../webpack/configs';
import { createCompilerPlugin } from './compiler-plugin';
import { DEFAULT_OUTDIR, bundle, logMessages } from './esbuild';
import { logExperimentalWarnings } from './experimental-warnings';
import { normalizeOptions } from './options';
import { Schema as BrowserBuilderOptions, SourceMapClass } from './schema';
import { bundleStylesheetText } from './stylesheets';

/**
 * Main execution function for the esbuild-based application builder.
 * The options are compatible with the Webpack-based builder.
 * @param options The browser builder options to use when setting up the application build
 * @param context The Architect builder context object
 * @returns A promise with the builder result output
 */
// eslint-disable-next-line max-lines-per-function
export async function buildEsbuildBrowser(
  options: BrowserBuilderOptions,
  context: BuilderContext,
): Promise<BuilderOutput> {
  const startTime = Date.now();

  // Only AOT is currently supported
  if (options.aot !== true) {
    context.logger.error(
      'JIT mode is currently not supported by this experimental builder. AOT mode must be used.',
    );

    return { success: false };
  }

  // Inform user of experimental status of builder and options
  logExperimentalWarnings(options, context);

  // Determine project name from builder context target
  const projectName = context.target?.project;
  if (!projectName) {
    context.logger.error(`The 'browser-esbuild' builder requires a target to be specified.`);

    return { success: false };
  }

  const {
    projectRoot,
    workspaceRoot,
    mainEntryPoint,
    polyfillsEntryPoint,
    optimizationOptions,
    outputPath,
    sourcemapOptions,
    tsconfig,
    assets,
    outputNames,
  } = await normalizeOptions(context, projectName, options);

  // Clean output path if enabled
  if (options.deleteOutputPath) {
    deleteOutputDir(workspaceRoot, options.outputPath);
  }

  // Setup bundler entry points
  const entryPoints: Record<string, string> = {
    main: mainEntryPoint,
  };
  if (polyfillsEntryPoint) {
    entryPoints['polyfills'] = polyfillsEntryPoint;
  }
  // Create reverse lookup used during index HTML generation
  const entryPointNameLookup: ReadonlyMap<string, string> = new Map(
    Object.entries(entryPoints).map(
      ([name, filePath]) => [path.relative(workspaceRoot, filePath), name] as const,
    ),
  );

  // Execute esbuild
  const result = await bundleCode(
    workspaceRoot,
    entryPoints,
    outputNames,
    options,
    optimizationOptions,
    sourcemapOptions,
    tsconfig,
  );

  // Log all warnings and errors generated during bundling
  await logMessages(context, result);

  // Return if the bundling failed to generate output files or there are errors
  if (!result.outputFiles || result.errors.length) {
    return { success: false };
  }

  // Structure the bundling output files
  const initialFiles: FileInfo[] = [];
  const outputFiles: OutputFile[] = [];
  for (const outputFile of result.outputFiles) {
    // Entries in the metafile are relative to the `absWorkingDir` option which is set to the workspaceRoot
    const relativeFilePath = path.relative(workspaceRoot, outputFile.path);
    const entryPoint = result.metafile?.outputs[relativeFilePath]?.entryPoint;

    outputFile.path = path.relative(DEFAULT_OUTDIR, outputFile.path);

    if (entryPoint) {
      // An entryPoint value indicates an initial file
      initialFiles.push({
        file: outputFile.path,
        name: entryPointNameLookup.get(entryPoint) ?? '',
        extension: path.extname(outputFile.path),
      });
    }
    outputFiles.push(outputFile);
  }

  // Create output directory if needed
  try {
    await fs.mkdir(outputPath, { recursive: true });
  } catch (e) {
    assertIsError(e);
    context.logger.error('Unable to create output directory: ' + e.message);

    return { success: false };
  }

  // Process global stylesheets
  if (options.styles) {
    // resolveGlobalStyles is temporarily reused from the Webpack builder code
    const { entryPoints: stylesheetEntrypoints, noInjectNames } = resolveGlobalStyles(
      options.styles,
      workspaceRoot,
      !!options.preserveSymlinks,
    );
    for (const [name, files] of Object.entries(stylesheetEntrypoints)) {
      const virtualEntryData = files
        .map((file) => `@import '${file.replace(/\\/g, '/')}';`)
        .join('\n');
      const sheetResult = await bundleStylesheetText(
        virtualEntryData,
        { virtualName: `angular:style/global;${name}`, resolvePath: workspaceRoot },
        {
          optimization: !!optimizationOptions.styles.minify,
          sourcemap: !!sourcemapOptions.styles,
          outputNames: noInjectNames.includes(name) ? { media: outputNames.media } : outputNames,
        },
      );

      await logMessages(context, sheetResult);
      if (!sheetResult.path) {
        // Failed to process the stylesheet
        assert.ok(
          sheetResult.errors.length,
          `Global stylesheet processing for '${name}' failed with no errors.`,
        );

        return { success: false };
      }

      // The virtual stylesheets will be named `stdin` by esbuild. This must be replaced
      // with the actual name of the global style and the leading directory separator must
      // also be removed to make the path relative.
      const sheetPath = sheetResult.path.replace('stdin', name);
      outputFiles.push(createOutputFileFromText(sheetPath, sheetResult.contents));
      if (sheetResult.map) {
        outputFiles.push(createOutputFileFromText(sheetPath + '.map', sheetResult.map));
      }
      if (!noInjectNames.includes(name)) {
        initialFiles.push({
          file: sheetPath,
          name,
          extension: '.css',
        });
      }
      outputFiles.push(...sheetResult.resourceFiles);
    }
  }

  // Generate index HTML file
  if (options.index) {
    const entrypoints = generateEntryPoints({
      scripts: options.scripts ?? [],
      styles: options.styles ?? [],
    });

    // Create an index HTML generator that reads from the in-memory output files
    const indexHtmlGenerator = new IndexHtmlGenerator({
      indexPath: path.join(context.workspaceRoot, getIndexInputFile(options.index)),
      entrypoints,
      sri: options.subresourceIntegrity,
      optimization: optimizationOptions,
      crossOrigin: options.crossOrigin,
    });

    /** Virtual output path to support reading in-memory files. */
    const virtualOutputPath = '/';
    indexHtmlGenerator.readAsset = async function (filePath: string): Promise<string> {
      // Remove leading directory separator
      const relativefilePath = path.relative(virtualOutputPath, filePath);
      const file = outputFiles.find((file) => file.path === relativefilePath);
      if (file) {
        return file.text;
      }

      throw new Error(`Output file does not exist: ${path}`);
    };

    const { content, warnings, errors } = await indexHtmlGenerator.process({
      baseHref: options.baseHref,
      lang: undefined,
      outputPath: virtualOutputPath,
      files: initialFiles,
    });

    for (const error of errors) {
      context.logger.error(error);
    }
    for (const warning of warnings) {
      context.logger.warn(warning);
    }

    outputFiles.push(createOutputFileFromText(getIndexOutputFile(options.index), content));
  }

  // Copy assets
  if (assets) {
    await copyAssets(assets, [outputPath], workspaceRoot);
  }

  // Write output files
  await Promise.all(
    outputFiles.map((file) => fs.writeFile(path.join(outputPath, file.path), file.contents)),
  );

  // Augment the application with service worker support
  // TODO: This should eventually operate on the in-memory files prior to writing the output files
  if (options.serviceWorker) {
    try {
      await augmentAppWithServiceWorker(
        projectRoot,
        workspaceRoot,
        outputPath,
        options.baseHref || '/',
        options.ngswConfigPath,
      );
    } catch (error) {
      context.logger.error(error instanceof Error ? error.message : `${error}`);

      return { success: false };
    }
  }

  context.logger.info(`Complete. [${(Date.now() - startTime) / 1000} seconds]`);

  return { success: true };
}

function createOutputFileFromText(path: string, text: string): OutputFile {
  return {
    path,
    text,
    get contents() {
      return Buffer.from(this.text, 'utf-8');
    },
  };
}

async function bundleCode(
  workspaceRoot: string,
  entryPoints: Record<string, string>,
  outputNames: { bundles: string; media: string },
  options: BrowserBuilderOptions,
  optimizationOptions: NormalizedOptimizationOptions,
  sourcemapOptions: SourceMapClass,
  tsconfig: string,
) {
  return bundle({
    absWorkingDir: workspaceRoot,
    bundle: true,
    format: 'esm',
    entryPoints,
    entryNames: outputNames.bundles,
    assetNames: outputNames.media,
    target: 'es2020',
    mainFields: ['es2020', 'browser', 'module', 'main'],
    conditions: ['es2020', 'es2015', 'module'],
    resolveExtensions: ['.ts', '.tsx', '.mjs', '.js'],
    logLevel: options.verbose ? 'debug' : 'silent',
    metafile: true,
    minify: optimizationOptions.scripts,
    pure: ['forwardRef'],
    outdir: DEFAULT_OUTDIR,
    sourcemap: sourcemapOptions.scripts && (sourcemapOptions.hidden ? 'external' : true),
    splitting: true,
    tsconfig,
    external: options.externalDependencies,
    write: false,
    platform: 'browser',
    preserveSymlinks: options.preserveSymlinks,
    plugins: [
      createCompilerPlugin(
        // JS/TS options
        {
          sourcemap: !!sourcemapOptions.scripts,
          tsconfig,
          advancedOptimizations: options.buildOptimizer,
        },
        // Component stylesheet options
        {
          workspaceRoot,
          optimization: !!optimizationOptions.styles.minify,
          sourcemap:
            // Hidden component stylesheet sourcemaps are inaccessible which is effectively
            // the same as being disabled. Disabling has the advantage of avoiding the overhead
            // of sourcemap processing.
            !!sourcemapOptions.styles && (sourcemapOptions.hidden ? false : 'inline'),
          outputNames,
        },
      ),
    ],
    define: {
      'ngDevMode': optimizationOptions.scripts ? 'false' : 'true',
      'ngJitMode': 'false',
    },
  });
}

export default createBuilder(buildEsbuildBrowser);
