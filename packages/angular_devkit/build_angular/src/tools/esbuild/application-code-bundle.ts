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
import { extname, join } from 'node:path';
import type { NormalizedApplicationBuildOptions } from '../../builders/application/options';
import { allowMangle } from '../../utils/environment-options';
import { createCompilerPlugin } from './angular/compiler-plugin';
import { SourceFileCache } from './angular/source-file-cache';
import { BundlerOptionsFactory } from './bundler-context';
import { createCompilerPluginOptions } from './compiler-plugin-options';
import { createExternalPackagesPlugin } from './external-packages-plugin';
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

  if (options.plugins) {
    buildOptions.plugins?.push(...options.plugins);
  }

  if (options.externalPackages) {
    // Package files affected by a customized loader should not be implicitly marked as external
    if (
      options.loaderExtensions ||
      options.plugins ||
      typeof options.externalPackages === 'object'
    ) {
      // Plugin must be added after custom plugins to ensure any added loader options are considered
      buildOptions.plugins?.push(
        createExternalPackagesPlugin(
          options.externalPackages !== true ? options.externalPackages : undefined,
        ),
      );
    } else {
      // Safe to use the packages external option directly
      buildOptions.packages = 'external';
    }
  }

  return buildOptions;
}

export function createBrowserPolyfillBundleOptions(
  options: NormalizedApplicationBuildOptions,
  target: string[],
  sourceFileCache?: SourceFileCache,
): BuildOptions | BundlerOptionsFactory | undefined {
  const namespace = 'angular:polyfills';
  const polyfillBundleOptions = getEsBuildCommonPolyfillsOptions(
    options,
    namespace,
    true,
    sourceFileCache,
  );
  if (!polyfillBundleOptions) {
    return;
  }

  const { outputNames, polyfills } = options;
  const hasTypeScriptEntries = polyfills?.some((entry) => /\.[cm]?tsx?$/.test(entry));

  const buildOptions: BuildOptions = {
    ...polyfillBundleOptions,
    platform: 'browser',
    // Note: `es2015` is needed for RxJS v6. If not specified, `module` would
    // match and the ES5 distribution would be bundled and ends up breaking at
    // runtime with the RxJS testing library.
    // More details: https://github.com/angular/angular-cli/issues/25405.
    mainFields: ['es2020', 'es2015', 'browser', 'module', 'main'],
    entryNames: outputNames.bundles,
    target,
    entryPoints: {
      'polyfills': namespace,
    },
  };

  // Only add the Angular TypeScript compiler if TypeScript files are provided in the polyfills
  if (hasTypeScriptEntries) {
    buildOptions.plugins ??= [];
    const { pluginOptions, styleOptions } = createCompilerPluginOptions(
      options,
      target,
      sourceFileCache,
    );
    buildOptions.plugins.push(
      createCompilerPlugin(
        // JS/TS options
        { ...pluginOptions, noopTypeScriptCompilation: true },
        // Component stylesheet options are unused for polyfills but required by the plugin
        styleOptions,
      ),
    );
  }

  // Use an options factory to allow fully incremental bundling when no TypeScript files are present.
  // The TypeScript compilation is not currently integrated into the bundler invalidation so
  // cannot be used with fully incremental bundling yet.
  return hasTypeScriptEntries ? buildOptions : () => buildOptions;
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

  const mainServerNamespace = 'angular:server-render-utils';
  const entryPoints: Record<string, string> = {
    'render-utils.server': mainServerNamespace,
    'main.server': serverEntryPoint,
  };

  const ssrEntryPoint = ssrOptions?.entry;
  if (ssrEntryPoint) {
    entryPoints['server'] = ssrEntryPoint;
  }

  const buildOptions: BuildOptions = {
    ...getEsBuildCommonOptions(options),
    platform: 'node',
    splitting: true,
    outExtension: { '.js': '.mjs' },
    // Note: `es2015` is needed for RxJS v6. If not specified, `module` would
    // match and the ES5 distribution would be bundled and ends up breaking at
    // runtime with the RxJS testing library.
    // More details: https://github.com/angular/angular-cli/issues/25405.
    mainFields: ['es2020', 'es2015', 'module', 'main'],
    entryNames: '[name]',
    target,
    banner: {
      js: `import './polyfills.server.mjs';`,
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

  buildOptions.plugins.push(
    createVirtualModulePlugin({
      namespace: mainServerNamespace,
      cache: sourceFileCache?.loadResultCache,
      loadContent: async () => {
        const contents: string[] = [
          `export { ɵConsole } from '@angular/core';`,
          `export { renderApplication, renderModule, ɵSERVER_CONTEXT } from '@angular/platform-server';`,
        ];

        if (watch) {
          contents.push(`export { ɵresetCompiledComponents } from '@angular/core';`);
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

  if (options.plugins) {
    buildOptions.plugins.push(...options.plugins);
  }

  return buildOptions;
}

export function createServerPolyfillBundleOptions(
  options: NormalizedApplicationBuildOptions,
  target: string[],
  sourceFileCache?: SourceFileCache,
): BundlerOptionsFactory | undefined {
  const polyfills: string[] = [];
  const polyfillsFromConfig = new Set(options.polyfills);

  if (polyfillsFromConfig.has('zone.js')) {
    polyfills.push('zone.js/node');
  }

  if (
    polyfillsFromConfig.has('@angular/localize') ||
    polyfillsFromConfig.has('@angular/localize/init')
  ) {
    polyfills.push('@angular/localize/init');
  }

  polyfills.push('@angular/platform-server/init');

  const namespace = 'angular:polyfills-server';
  const polyfillBundleOptions = getEsBuildCommonPolyfillsOptions(
    {
      ...options,
      polyfills,
    },
    namespace,
    false,
    sourceFileCache,
  );

  if (!polyfillBundleOptions) {
    return;
  }

  const buildOptions: BuildOptions = {
    ...polyfillBundleOptions,
    platform: 'node',
    outExtension: { '.js': '.mjs' },
    // Note: `es2015` is needed for RxJS v6. If not specified, `module` would
    // match and the ES5 distribution would be bundled and ends up breaking at
    // runtime with the RxJS testing library.
    // More details: https://github.com/angular/angular-cli/issues/25405.
    mainFields: ['es2020', 'es2015', 'module', 'main'],
    entryNames: '[name]',
    banner: {
      js: [
        // Note: Needed as esbuild does not provide require shims / proxy from ESModules.
        // See: https://github.com/evanw/esbuild/issues/1921.
        `import { createRequire } from 'node:module';`,
        `globalThis['require'] ??= createRequire(import.meta.url);`,
      ].join('\n'),
    },
    target,
    entryPoints: {
      'polyfills.server': namespace,
    },
  };

  return () => buildOptions;
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
    loaderExtensions,
    jsonLogs,
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
    logLevel: options.verbose && !jsonLogs ? 'debug' : 'silent',
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
      ...options.define,
      // Only set to false when script optimizations are enabled. It should not be set to true because
      // Angular turns `ngDevMode` into an object for development debugging purposes when not defined
      // which a constant true value would break.
      ...(optimizationOptions.scripts ? { 'ngDevMode': 'false' } : undefined),
      'ngJitMode': jit ? 'true' : 'false',
    },
    loader: loaderExtensions,
    footer,
    publicPath: options.publicPath,
  };
}

function getEsBuildCommonPolyfillsOptions(
  options: NormalizedApplicationBuildOptions,
  namespace: string,
  tryToResolvePolyfillsAsRelative: boolean,
  sourceFileCache: SourceFileCache | undefined,
): BuildOptions | undefined {
  const { jit, workspaceRoot, i18nOptions } = options;
  const buildOptions: BuildOptions = {
    ...getEsBuildCommonOptions(options),
    splitting: false,
    plugins: [createSourcemapIgnorelistPlugin()],
  };

  const polyfills = options.polyfills ? [...options.polyfills] : [];

  // Angular JIT mode requires the runtime compiler
  if (jit) {
    polyfills.unshift('@angular/compiler');
  }

  // Add Angular's global locale data if i18n options are present.
  // Locale data should go first so that project provided polyfill code can augment if needed.
  let needLocaleDataPlugin = false;
  if (i18nOptions.shouldInline) {
    // Add locale data for all active locales
    // TODO: Inject each individually within the inlining process itself
    for (const locale of i18nOptions.inlineLocales) {
      polyfills.unshift(`angular:locale/data:${locale}`);
    }
    needLocaleDataPlugin = true;
  } else if (i18nOptions.hasDefinedSourceLocale) {
    // When not inlining and a source local is present, use the source locale data directly
    polyfills.unshift(`angular:locale/data:${i18nOptions.sourceLocale}`);
    needLocaleDataPlugin = true;
  }
  if (needLocaleDataPlugin) {
    buildOptions.plugins?.push(createAngularLocaleDataPlugin());
  }

  if (polyfills.length === 0) {
    return;
  }

  buildOptions.plugins?.push(
    createVirtualModulePlugin({
      namespace,
      cache: sourceFileCache?.loadResultCache,
      loadContent: async (_, build) => {
        let hasLocalizePolyfill = false;
        let polyfillPaths = polyfills;

        if (tryToResolvePolyfillsAsRelative) {
          polyfillPaths = await Promise.all(
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
        } else {
          hasLocalizePolyfill = polyfills.some((p) => p.startsWith('@angular/localize'));
        }

        if (!i18nOptions.shouldInline && !hasLocalizePolyfill) {
          const result = await build.resolve('@angular/localize', {
            kind: 'import-statement',
            resolveDir: workspaceRoot,
          });

          if (result.path) {
            polyfillPaths.push('@angular/localize/init');
          }
        }

        // Generate module contents with an import statement per defined polyfill
        let contents = polyfillPaths
          .map((file) => `import '${file.replace(/\\/g, '/')}';`)
          .join('\n');

        // The below should be done after loading `$localize` as otherwise the locale will be overridden.
        if (i18nOptions.shouldInline) {
          // When inlining, a placeholder is used to allow the post-processing step to inject the $localize locale identifier.
          contents += '(globalThis.$localize ??= {}).locale = "___NG_LOCALE_INSERT___";\n';
        } else if (i18nOptions.hasDefinedSourceLocale) {
          // If not inlining translations and source locale is defined, inject the locale specifier.
          contents += `(globalThis.$localize ??= {}).locale = "${i18nOptions.sourceLocale}";\n`;
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
