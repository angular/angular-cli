/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { BuildOptions } from 'esbuild';
import assert from 'node:assert';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, join, relative } from 'node:path';
import type { NormalizedApplicationBuildOptions } from '../../builders/application/options';
import { allowMangle } from '../../utils/environment-options';
import { createCompilerPlugin } from './angular/compiler-plugin';
import { SourceFileCache } from './angular/source-file-cache';
import { createCompilerPluginOptions } from './compiler-plugin-options';
import { createAngularLocaleDataPlugin } from './i18n-locale-plugin';
import { createRxjsEsmResolutionPlugin } from './rxjs-esm-resolution-plugin';
import { createSourcemapIgnorelistPlugin } from './sourcemap-ignorelist-plugin';
import { getFeatureSupport } from './utils';
import { createVirtualModulePlugin } from './virtual-module-plugin';

export function createBrowserCodeBundleOptions(
  options: NormalizedApplicationBuildOptions,
  target: string[],
  sourceFileCache?: SourceFileCache,
): BuildOptions {
  const { entryPoints, outputNames } = options;

  const { pluginOptions, styleOptions } = createCompilerPluginOptions(
    options,
    target,
    sourceFileCache,
  );

  const buildOptions: BuildOptions = {
    ...getEsBuildCommonOptions(options),
    platform: 'browser',
    // Note: `es2015` is needed for RxJS v6. If not specified, `module` would
    // match and the ES5 distribution would be bundled and ends up breaking at
    // runtime with the RxJS testing library.
    // More details: https://github.com/angular/angular-cli/issues/25405.
    mainFields: ['es2020', 'es2015', 'browser', 'module', 'main'],
    entryNames: outputNames.bundles,
    entryPoints,
    target,
    supported: getFeatureSupport(target),
    plugins: [
      createSourcemapIgnorelistPlugin(),
      createCompilerPlugin(
        // JS/TS options
        pluginOptions,
        // Component stylesheet options
        styleOptions,
      ),
    ],
  };

  if (options.externalPackages) {
    buildOptions.packages = 'external';
  }

  if (options.plugins) {
    buildOptions.plugins?.push(...options.plugins);
  }

  return buildOptions;
}

export function createBrowserPolyfillBundleOptions(
  options: NormalizedApplicationBuildOptions,
  target: string[],
  sourceFileCache?: SourceFileCache,
): BuildOptions | undefined {
  const { workspaceRoot, outputNames, jit } = options;

  const { pluginOptions, styleOptions } = createCompilerPluginOptions(
    options,
    target,
    sourceFileCache,
  );

  const buildOptions: BuildOptions = {
    ...getEsBuildCommonOptions(options),
    platform: 'browser',
    // Note: `es2015` is needed for RxJS v6. If not specified, `module` would
    // match and the ES5 distribution would be bundled and ends up breaking at
    // runtime with the RxJS testing library.
    // More details: https://github.com/angular/angular-cli/issues/25405.
    mainFields: ['es2020', 'es2015', 'browser', 'module', 'main'],
    entryNames: outputNames.bundles,
    target,
    splitting: false,
    supported: getFeatureSupport(target),
    plugins: [
      createSourcemapIgnorelistPlugin(),
      createCompilerPlugin(
        // JS/TS options
        { ...pluginOptions, noopTypeScriptCompilation: true },
        // Component stylesheet options are unused for polyfills but required by the plugin
        styleOptions,
      ),
    ],
  };
  buildOptions.plugins ??= [];

  const polyfills = options.polyfills ? [...options.polyfills] : [];

  // Angular JIT mode requires the runtime compiler
  if (jit) {
    polyfills.push('@angular/compiler');
  }

  // Add Angular's global locale data if i18n options are present.
  // Locale data should go first so that project provided polyfill code can augment if needed.
  let needLocaleDataPlugin = false;
  if (options.i18nOptions.shouldInline) {
    // When inlining, a placeholder is used to allow the post-processing step to inject the $localize locale identifier
    polyfills.unshift('angular:locale/placeholder');
    buildOptions.plugins?.unshift(
      createVirtualModulePlugin({
        namespace: 'angular:locale/placeholder',
        entryPointOnly: false,
        loadContent: () => ({
          contents: `(globalThis.$localize ??= {}).locale = "___NG_LOCALE_INSERT___";\n`,
          loader: 'js',
          resolveDir: workspaceRoot,
        }),
      }),
    );

    // Add locale data for all active locales
    // TODO: Inject each individually within the inlining process itself
    for (const locale of options.i18nOptions.inlineLocales) {
      polyfills.unshift(`angular:locale/data:${locale}`);
    }
    needLocaleDataPlugin = true;
  } else if (options.i18nOptions.hasDefinedSourceLocale) {
    // When not inlining and a source local is present, use the source locale data directly
    polyfills.unshift(`angular:locale/data:${options.i18nOptions.sourceLocale}`);
    needLocaleDataPlugin = true;
  }
  if (needLocaleDataPlugin) {
    buildOptions.plugins?.push(createAngularLocaleDataPlugin());
  }

  if (polyfills.length === 0) {
    return;
  }

  // Add polyfill entry point if polyfills are present
  const namespace = 'angular:polyfills';
  buildOptions.entryPoints = {
    'polyfills': namespace,
  };

  buildOptions.plugins?.unshift(
    createVirtualModulePlugin({
      namespace,
      loadContent: async (_, build) => {
        let hasLocalizePolyfill = false;
        const polyfillPaths = await Promise.all(
          polyfills.map(async (path) => {
            hasLocalizePolyfill ||= path.startsWith('@angular/localize');

            if (path.startsWith('zone.js') || !extname(path)) {
              return path;
            }

            const potentialPathRelative = './' + path;
            const result = await build.resolve(potentialPathRelative, {
              kind: 'import-statement',
              resolveDir: workspaceRoot,
            });

            return result.path ? potentialPathRelative : path;
          }),
        );

        if (!options.i18nOptions.shouldInline && !hasLocalizePolyfill) {
          // Cannot use `build.resolve` here since it does not allow overriding the external options
          // and the actual presence of the `@angular/localize` package needs to be checked here.
          const workspaceRequire = createRequire(workspaceRoot + '/');
          try {
            workspaceRequire.resolve('@angular/localize');
            // The resolve call above will throw if not found
            polyfillPaths.push('@angular/localize/init');
          } catch {}
        }

        // Generate module contents with an import statement per defined polyfill
        let contents = polyfillPaths
          .map((file) => `import '${file.replace(/\\/g, '/')}';`)
          .join('\n');

        // If not inlining translations and source locale is defined, inject the locale specifier
        if (!options.i18nOptions.shouldInline && options.i18nOptions.hasDefinedSourceLocale) {
          contents += `(globalThis.$localize ??= {}).locale = "${options.i18nOptions.sourceLocale}";\n`;
        }

        return {
          contents,
          loader: 'js',
          resolveDir: workspaceRoot,
        };
      },
    }),
  );

  return buildOptions;
}

/**
 * Create an esbuild 'build' options object for the server bundle.
 * @param options The builder's user-provider normalized options.
 * @returns An esbuild BuildOptions object.
 */
export function createServerCodeBundleOptions(
  options: NormalizedApplicationBuildOptions,
  target: string[],
  sourceFileCache: SourceFileCache,
): BuildOptions {
  const {
    jit,
    serverEntryPoint,
    workspaceRoot,
    ssrOptions,
    watch,
    externalPackages,
    prerenderOptions,
  } = options;

  assert(
    serverEntryPoint,
    'createServerCodeBundleOptions should not be called without a defined serverEntryPoint.',
  );

  const { pluginOptions, styleOptions } = createCompilerPluginOptions(
    options,
    target,
    sourceFileCache,
  );

  const mainServerNamespace = 'angular:main-server';
  const ssrEntryNamespace = 'angular:ssr-entry';

  const entryPoints: Record<string, string> = {
    'main.server': mainServerNamespace,
  };

  const ssrEntryPoint = ssrOptions?.entry;
  if (ssrEntryPoint) {
    entryPoints['server'] = ssrEntryNamespace;
  }

  const buildOptions: BuildOptions = {
    ...getEsBuildCommonOptions(options),
    platform: 'node',
    // TODO: Invesigate why enabling `splitting` in JIT mode causes an "'@angular/compiler' is not available" error.
    splitting: !jit,
    outExtension: { '.js': '.mjs' },
    // Note: `es2015` is needed for RxJS v6. If not specified, `module` would
    // match and the ES5 distribution would be bundled and ends up breaking at
    // runtime with the RxJS testing library.
    // More details: https://github.com/angular/angular-cli/issues/25405.
    mainFields: ['es2020', 'es2015', 'module', 'main'],
    entryNames: '[name]',
    target,
    banner: {
      // Note: Needed as esbuild does not provide require shims / proxy from ESModules.
      // See: https://github.com/evanw/esbuild/issues/1921.
      js: [
        `import { createRequire } from 'node:module';`,
        `globalThis['require'] ??= createRequire(import.meta.url);`,
      ].join('\n'),
    },
    entryPoints,
    supported: getFeatureSupport(target),
    plugins: [
      createSourcemapIgnorelistPlugin(),
      createCompilerPlugin(
        // JS/TS options
        { ...pluginOptions, noopTypeScriptCompilation: true },
        // Component stylesheet options
        styleOptions,
      ),
    ],
  };

  buildOptions.plugins ??= [];
  if (externalPackages) {
    buildOptions.packages = 'external';
  } else {
    buildOptions.plugins.push(createRxjsEsmResolutionPlugin());
  }

  const polyfills: string[] = [];
  if (options.polyfills?.includes('zone.js')) {
    polyfills.push(`import 'zone.js/node';`);
  }

  if (jit) {
    polyfills.push(`import '@angular/compiler';`);
  }

  polyfills.push(`import '@angular/platform-server/init';`);

  // Add Angular's global locale data if i18n options are present.
  let needLocaleDataPlugin = false;
  if (options.i18nOptions.shouldInline) {
    // Add locale data for all active locales
    for (const locale of options.i18nOptions.inlineLocales) {
      polyfills.unshift(`import 'angular:locale/data:${locale}';`);
    }
    needLocaleDataPlugin = true;
  } else if (options.i18nOptions.hasDefinedSourceLocale) {
    // When not inlining and a source local is present, use the source locale data directly
    polyfills.unshift(`import 'angular:locale/data:${options.i18nOptions.sourceLocale}';`);
    needLocaleDataPlugin = true;
  }
  if (needLocaleDataPlugin) {
    buildOptions.plugins.push(createAngularLocaleDataPlugin());
  }

  buildOptions.plugins.push(
    createVirtualModulePlugin({
      namespace: mainServerNamespace,
      loadContent: async () => {
        const mainServerEntryPoint = relative(workspaceRoot, serverEntryPoint).replace(/\\/g, '/');

        const contents = [
          ...polyfills,
          `import moduleOrBootstrapFn from './${mainServerEntryPoint}';`,
          `export default moduleOrBootstrapFn;`,
          `export * from './${mainServerEntryPoint}';`,
          `export { ɵConsole } from '@angular/core';`,
          `export { renderApplication, renderModule, ɵSERVER_CONTEXT } from '@angular/platform-server';`,
        ];

        if (watch) {
          contents.push(`export { ɵresetCompiledComponents } from '@angular/core';`);
        }

        if (!options.i18nOptions.shouldInline) {
          // Cannot use `build.resolve` here since it does not allow overriding the external options
          // and the actual presence of the `@angular/localize` package needs to be checked here.
          const workspaceRequire = createRequire(workspaceRoot + '/');
          try {
            workspaceRequire.resolve('@angular/localize');
            // The resolve call above will throw if not found
            contents.push(`import '@angular/localize/init';`);
          } catch {}
        }

        if (options.i18nOptions.shouldInline) {
          // When inlining, a placeholder is used to allow the post-processing step to inject the $localize locale identifier
          contents.push('(globalThis.$localize ??= {}).locale = "___NG_LOCALE_INSERT___";');
        } else if (options.i18nOptions.hasDefinedSourceLocale) {
          // If not inlining translations and source locale is defined, inject the locale specifier
          contents.push(
            `(globalThis.$localize ??= {}).locale = "${options.i18nOptions.sourceLocale}";`,
          );
        }

        if (prerenderOptions?.discoverRoutes) {
          // We do not import it directly so that node.js modules are resolved using the correct context.
          const routesExtractorCode = await readFile(
            join(__dirname, '../../utils/routes-extractor/extractor.js'),
            'utf-8',
          );

          // Remove source map URL comments from the code if a sourcemap is present as this will not match the file.
          contents.push(routesExtractorCode.replace(/^\/\/# sourceMappingURL=[^\r\n]*/gm, ''));
        }

        return {
          contents: contents.join('\n'),
          loader: 'js',
          resolveDir: workspaceRoot,
        };
      },
    }),
  );

  if (ssrEntryPoint) {
    buildOptions.plugins.push(
      createVirtualModulePlugin({
        namespace: ssrEntryNamespace,
        loadContent: () => {
          const serverEntryPoint = relative(workspaceRoot, ssrEntryPoint).replace(/\\/g, '/');

          return {
            contents: [
              ...polyfills,
              `import './${serverEntryPoint}';`,
              `export * from './${serverEntryPoint}';`,
            ].join('\n'),
            loader: 'js',
            resolveDir: workspaceRoot,
          };
        },
      }),
    );
  }

  if (options.plugins) {
    buildOptions.plugins.push(...options.plugins);
  }

  return buildOptions;
}

function getEsBuildCommonOptions(options: NormalizedApplicationBuildOptions): BuildOptions {
  const {
    workspaceRoot,
    outExtension,
    optimizationOptions,
    sourcemapOptions,
    tsconfig,
    externalDependencies,
    outputNames,
    preserveSymlinks,
    jit,
  } = options;

  // Ensure unique hashes for i18n translation changes when using post-process inlining.
  // This hash value is added as a footer to each file and ensures that the output file names (with hashes)
  // change when translation files have changed. If this is not done the post processed files may have
  // different content but would retain identical production file names which would lead to browser caching problems.
  let footer;
  if (options.i18nOptions.shouldInline) {
    // Update file hashes to include translation file content
    const i18nHash = Object.values(options.i18nOptions.locales).reduce(
      (data, locale) => data + locale.files.map((file) => file.integrity || '').join('|'),
      '',
    );

    footer = { js: `/**i18n:${createHash('sha256').update(i18nHash).digest('hex')}*/` };
  }

  return {
    absWorkingDir: workspaceRoot,
    bundle: true,
    format: 'esm',
    assetNames: outputNames.media,
    conditions: ['es2020', 'es2015', 'module'],
    resolveExtensions: ['.ts', '.tsx', '.mjs', '.js'],
    metafile: true,
    legalComments: options.extractLicenses ? 'none' : 'eof',
    logLevel: options.verbose ? 'debug' : 'silent',
    minifyIdentifiers: optimizationOptions.scripts && allowMangle,
    minifySyntax: optimizationOptions.scripts,
    minifyWhitespace: optimizationOptions.scripts,
    pure: ['forwardRef'],
    outdir: workspaceRoot,
    outExtension: outExtension ? { '.js': `.${outExtension}` } : undefined,
    sourcemap: sourcemapOptions.scripts && (sourcemapOptions.hidden ? 'external' : true),
    splitting: true,
    chunkNames: options.namedChunks ? '[name]-[hash]' : 'chunk-[hash]',
    tsconfig,
    external: externalDependencies,
    write: false,
    preserveSymlinks,
    define: {
      // Only set to false when script optimizations are enabled. It should not be set to true because
      // Angular turns `ngDevMode` into an object for development debugging purposes when not defined
      // which a constant true value would break.
      ...(optimizationOptions.scripts ? { 'ngDevMode': 'false' } : undefined),
      'ngJitMode': jit ? 'true' : 'false',
    },
    footer,
    publicPath: options.publicPath,
  };
}
