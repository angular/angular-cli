/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { BuildOptions, OutputFile } from 'esbuild';
import path from 'node:path';
import { BundlerContext } from '../esbuild';
import { LoadResultCache } from '../load-result-cache';
import { createCssPlugin } from './css-plugin';
import { createCssResourcePlugin } from './css-resource-plugin';
import { createLessPlugin } from './less-plugin';
import { createSassPlugin } from './sass-plugin';

/**
 * A counter for component styles used to generate unique build-time identifiers for each stylesheet.
 */
let componentStyleCounter = 0;

export interface BundleStylesheetOptions {
  workspaceRoot: string;
  optimization: boolean;
  preserveSymlinks?: boolean;
  sourcemap: boolean | 'external' | 'inline';
  outputNames?: { bundles?: string; media?: string };
  includePaths?: string[];
  externalDependencies?: string[];
  target: string[];
  browsers: string[];
  tailwindConfiguration?: { file: string; package: string };
}

export function createStylesheetBundleOptions(
  options: BundleStylesheetOptions,
  cache?: LoadResultCache,
  inlineComponentData?: Record<string, string>,
): BuildOptions & { plugins: NonNullable<BuildOptions['plugins']> } {
  // Ensure preprocessor include paths are absolute based on the workspace root
  const includePaths = options.includePaths?.map((includePath) =>
    path.resolve(options.workspaceRoot, includePath),
  );

  return {
    absWorkingDir: options.workspaceRoot,
    bundle: true,
    entryNames: options.outputNames?.bundles,
    assetNames: options.outputNames?.media,
    logLevel: 'silent',
    minify: options.optimization,
    metafile: true,
    sourcemap: options.sourcemap,
    outdir: options.workspaceRoot,
    write: false,
    platform: 'browser',
    target: options.target,
    preserveSymlinks: options.preserveSymlinks,
    external: options.externalDependencies,
    conditions: ['style', 'sass'],
    mainFields: ['style', 'sass'],
    plugins: [
      createSassPlugin(
        {
          sourcemap: !!options.sourcemap,
          loadPaths: includePaths,
          inlineComponentData,
        },
        cache,
      ),
      createLessPlugin({
        sourcemap: !!options.sourcemap,
        includePaths,
        inlineComponentData,
      }),
      createCssPlugin({
        sourcemap: !!options.sourcemap,
        inlineComponentData,
        browsers: options.browsers,
        tailwindConfiguration: options.tailwindConfiguration,
      }),
      createCssResourcePlugin(),
    ],
  };
}

/**
 * Bundles a component stylesheet. The stylesheet can be either an inline stylesheet that
 * is contained within the Component's metadata definition or an external file referenced
 * from the Component's metadata definition.
 *
 * @param identifier A unique string identifier for the component stylesheet.
 * @param language The language of the stylesheet such as `css` or `scss`.
 * @param data The string content of the stylesheet.
 * @param filename The filename representing the source of the stylesheet content.
 * @param inline If true, the stylesheet source is within the component metadata;
 * if false, the source is a stylesheet file.
 * @param options An object containing the stylesheet bundling options.
 * @returns An object containing the output of the bundling operation.
 */
export async function bundleComponentStylesheet(
  language: string,
  data: string,
  filename: string,
  inline: boolean,
  options: BundleStylesheetOptions,
  cache?: LoadResultCache,
) {
  const namespace = 'angular:styles/component';
  const entry = [language, componentStyleCounter++, filename].join(';');

  const buildOptions = createStylesheetBundleOptions(options, cache, { [entry]: data });
  buildOptions.entryPoints = [`${namespace};${entry}`];
  buildOptions.plugins.push({
    name: 'angular-component-styles',
    setup(build) {
      build.onResolve({ filter: /^angular:styles\/component;/ }, (args) => {
        if (args.kind !== 'entry-point') {
          return null;
        }

        if (inline) {
          return {
            path: entry,
            namespace,
          };
        } else {
          return {
            path: filename,
          };
        }
      });
      build.onLoad({ filter: /^css;/, namespace }, async () => {
        return {
          contents: data,
          loader: 'css',
          resolveDir: path.dirname(filename),
        };
      });
    },
  });

  // Execute esbuild
  const context = new BundlerContext(options.workspaceRoot, false, buildOptions);
  const result = await context.bundle();

  // Extract the result of the bundling from the output files
  let contents = '';
  let map;
  let outputPath;
  const resourceFiles: OutputFile[] = [];
  if (!result.errors) {
    for (const outputFile of result.outputFiles) {
      const filename = path.basename(outputFile.path);
      if (filename.endsWith('.css')) {
        outputPath = outputFile.path;
        contents = outputFile.text;
      } else if (filename.endsWith('.css.map')) {
        map = outputFile.text;
      } else {
        // The output files could also contain resources (images/fonts/etc.) that were referenced
        resourceFiles.push(outputFile);
      }
    }
  }

  let metafile;
  if (!result.errors) {
    metafile = result.metafile;
    // Remove entryPoint fields from outputs to prevent the internal component styles from being
    // treated as initial files. Also mark the entry as a component resource for stat reporting.
    Object.values(metafile.outputs).forEach((output) => {
      delete output.entryPoint;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (output as any)['ng-component'] = true;
    });
  }

  return {
    errors: result.errors,
    warnings: result.warnings,
    contents,
    map,
    path: outputPath,
    resourceFiles,
    metafile,
  };
}
