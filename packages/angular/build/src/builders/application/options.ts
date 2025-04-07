/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { BuilderContext } from '@angular-devkit/architect';
import type { Plugin } from 'esbuild';
import { realpathSync } from 'node:fs';
import { access, constants, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { normalizeAssetPatterns, normalizeOptimization, normalizeSourceMaps } from '../../utils';
import { supportColor } from '../../utils/color';
import { useJSONBuildLogs, usePartialSsrBuild } from '../../utils/environment-options';
import { I18nOptions, createI18nOptions } from '../../utils/i18n-options';
import { IndexHtmlTransform } from '../../utils/index-file/index-html-generator';
import { normalizeCacheOptions } from '../../utils/normalize-cache';
import {
  SearchDirectory,
  findTailwindConfiguration,
  generateSearchDirectories,
  loadPostcssConfiguration,
} from '../../utils/postcss-configuration';
import { urlJoin } from '../../utils/url';
import {
  Schema as ApplicationBuilderOptions,
  ExperimentalPlatform,
  I18NTranslation,
  OutputHashing,
  OutputMode,
  OutputPathClass,
} from './schema';

/**
 * The filename for the client-side rendered HTML template.
 * This template is used for client-side rendering (CSR) in a web application.
 */
export const INDEX_HTML_CSR = 'index.csr.html';

/**
 * The filename for the server-side rendered HTML template.
 * This template is used for server-side rendering (SSR) in a web application.
 */
export const INDEX_HTML_SERVER = 'index.server.html';

export type NormalizedOutputOptions = Required<OutputPathClass> & {
  clean: boolean;
  ignoreServer: boolean;
};
export type NormalizedApplicationBuildOptions = Awaited<ReturnType<typeof normalizeOptions>>;

export interface ApplicationBuilderExtensions {
  codePlugins?: Plugin[];
  indexHtmlTransformer?: IndexHtmlTransform;
}

/** Internal options hidden from builder schema but available when invoked programmatically. */
interface InternalOptions {
  /**
   * Entry points to use for the compilation. Incompatible with `browser`, which must not be provided. May be relative or absolute paths.
   * If given a relative path, it is resolved relative to the current workspace and will generate an output at the same relative location
   * in the output directory. If given an absolute path, the output will be generated in the root of the output directory with the same base
   * name.
   *
   * If provided a Map, the key is the name of the output bundle and the value is the entry point file.
   */
  entryPoints?: Set<string> | Map<string, string>;

  /** File extension to use for the generated output files. */
  outExtension?: 'js' | 'mjs';

  /**
   * Indicates whether all node packages should be marked as external.
   * Currently used by the dev-server to support prebundling.
   */
  externalPackages?: boolean | { exclude: string[] };

  /**
   * Forces the output from the localize post-processing to not create nested directories per locale output.
   * This is only used by the development server which currently only supports a single locale per build.
   */
  forceI18nFlatOutput?: boolean;

  /**
   * When set to `true`, enables fast SSR in development mode by disabling the full manifest generation and prerendering.
   *
   * This option is intended to optimize performance during development by skipping prerendering and route extraction when not required.
   * @default false
   */
  partialSSRBuild?: boolean;

  /**
   * Enables the use of AOT compiler emitted external runtime styles.
   * External runtime styles use `link` elements instead of embedded style content in the output JavaScript.
   * This option is only intended to be used with a development server that can process and serve component
   * styles.
   */
  externalRuntimeStyles?: boolean;

  /**
   * Enables the AOT compiler to generate template component update functions.
   * This option is only intended to be used with a development server that can process and serve component
   * template updates.
   */
  templateUpdates?: boolean;

  /**
   * Enables emitting incremental build results when in watch mode. A full build result will only be emitted
   * for the initial build. This option also requires watch to be enabled to have an effect.
   */
  incrementalResults?: boolean;

  /**
   * Enables instrumentation to collect code coverage data for specific files.
   *
   * Used exclusively for tests and shouldn't be used for other kinds of builds.
   */
  instrumentForCoverage?: (filename: string) => boolean;
}

/** Full set of options for `application` builder. */
export type ApplicationBuilderInternalOptions = Omit<
  ApplicationBuilderOptions & InternalOptions,
  'browser'
> & {
  // `browser` can be `undefined` if `entryPoints` is used.
  browser?: string;
};

/**
 * Normalize the user provided options by creating full paths for all path based options
 * and converting multi-form options into a single form that can be directly used
 * by the build process.
 *
 * @param context The context for current builder execution.
 * @param projectName The name of the project for the current execution.
 * @param options An object containing the options to use for the build.
 * @param plugins An optional array of programmatically supplied build plugins.
 * @returns An object containing normalized options required to perform the build.
 */
// eslint-disable-next-line max-lines-per-function
export async function normalizeOptions(
  context: BuilderContext,
  projectName: string,
  options: ApplicationBuilderInternalOptions,
  extensions?: ApplicationBuilderExtensions,
) {
  // If not explicitly set, default to the Node.js process argument
  const preserveSymlinks =
    options.preserveSymlinks ?? process.execArgv.includes('--preserve-symlinks');

  // Setup base paths based on workspace root and project information
  const workspaceRoot = preserveSymlinks
    ? context.workspaceRoot
    : // NOTE: promises.realpath should not be used here since it uses realpath.native which
      // can cause case conversion and other undesirable behavior on Windows systems.
      // ref: https://github.com/nodejs/node/issues/7726
      realpathSync(context.workspaceRoot);
  const projectMetadata = await context.getProjectMetadata(projectName);
  const projectRoot = normalizeDirectoryPath(
    path.join(workspaceRoot, (projectMetadata.root as string | undefined) ?? ''),
  );
  const projectSourceRoot = normalizeDirectoryPath(
    path.join(workspaceRoot, (projectMetadata.sourceRoot as string | undefined) ?? 'src'),
  );

  // Gather persistent caching option and provide a project specific cache location
  const cacheOptions = normalizeCacheOptions(projectMetadata, workspaceRoot);
  cacheOptions.path = path.join(cacheOptions.path, projectName);

  const i18nOptions: I18nOptions & {
    duplicateTranslationBehavior?: I18NTranslation;
    missingTranslationBehavior?: I18NTranslation;
  } = createI18nOptions(projectMetadata, options.localize, context.logger, !!options.ssr);
  i18nOptions.duplicateTranslationBehavior = options.i18nDuplicateTranslation;
  i18nOptions.missingTranslationBehavior = options.i18nMissingTranslation;
  if (options.forceI18nFlatOutput) {
    i18nOptions.flatOutput = true;
  }

  const entryPoints = normalizeEntryPoints(workspaceRoot, options.browser, options.entryPoints);
  const tsconfig = path.join(workspaceRoot, options.tsConfig);
  const optimizationOptions = normalizeOptimization(options.optimization);
  const sourcemapOptions = normalizeSourceMaps(options.sourceMap ?? false);
  const assets = options.assets?.length
    ? normalizeAssetPatterns(options.assets, workspaceRoot, projectRoot, projectSourceRoot)
    : undefined;

  let fileReplacements: Record<string, string> | undefined;
  if (options.fileReplacements) {
    for (const replacement of options.fileReplacements) {
      const fileReplaceWith = path.join(workspaceRoot, replacement.with);

      try {
        await access(fileReplaceWith, constants.F_OK);
      } catch {
        throw new Error(`The ${fileReplaceWith} path in file replacements does not exist.`);
      }

      fileReplacements ??= {};
      fileReplacements[path.join(workspaceRoot, replacement.replace)] = fileReplaceWith;
    }
  }

  let loaderExtensions: Record<string, 'text' | 'binary' | 'file'> | undefined;
  if (options.loader) {
    for (const [extension, value] of Object.entries(options.loader)) {
      if (extension[0] !== '.' || /\.[cm]?[jt]sx?$/.test(extension)) {
        continue;
      }
      if (value !== 'text' && value !== 'binary' && value !== 'file' && value !== 'empty') {
        continue;
      }
      loaderExtensions ??= {};
      loaderExtensions[extension] = value;
    }
  }

  // Validate prerender and ssr options when using the outputMode
  if (options.outputMode === OutputMode.Server) {
    if (!options.server) {
      throw new Error('The "server" option is required when "outputMode" is set to "server".');
    }

    if (typeof options.ssr === 'boolean' || !options.ssr?.entry) {
      throw new Error('The "ssr.entry" option is required when "outputMode" is set to "server".');
    }
  }

  if (options.outputMode) {
    if (!options.server) {
      options.ssr = false;
    }

    if (options.prerender !== undefined) {
      context.logger.warn(
        'The "prerender" option is not considered when "outputMode" is specified.',
      );
    }

    options.prerender = !!options.server;

    if (options.appShell !== undefined) {
      context.logger.warn(
        'The "appShell" option is not considered when "outputMode" is specified.',
      );
    }
  }

  // A configuration file can exist in the project or workspace root
  const searchDirectories = await generateSearchDirectories([projectRoot, workspaceRoot]);
  const postcssConfiguration = await loadPostcssConfiguration(searchDirectories);
  // Skip tailwind configuration if postcss is customized
  const tailwindConfiguration = postcssConfiguration
    ? undefined
    : await getTailwindConfig(searchDirectories, workspaceRoot, context);

  let serverEntryPoint: string | undefined;
  if (typeof options.server === 'string') {
    if (options.server === '') {
      throw new Error('The "server" option cannot be an empty string.');
    }

    serverEntryPoint = path.join(workspaceRoot, options.server);
  }

  let prerenderOptions;
  if (options.prerender) {
    const { discoverRoutes = true, routesFile = undefined } =
      options.prerender === true ? {} : options.prerender;

    prerenderOptions = {
      discoverRoutes,
      routesFile: routesFile && path.join(workspaceRoot, routesFile),
    };
  }

  let ssrOptions;
  if (options.ssr === true) {
    ssrOptions = {};
  } else if (typeof options.ssr === 'object') {
    const { entry, experimentalPlatform = ExperimentalPlatform.Node } = options.ssr;

    ssrOptions = {
      entry: entry && path.join(workspaceRoot, entry),
      platform: experimentalPlatform,
    };
  }

  let appShellOptions;
  if (options.appShell) {
    appShellOptions = {
      route: 'shell',
    };
  }

  const outputPath = options.outputPath ?? path.join(workspaceRoot, 'dist', projectName);
  const outputOptions: NormalizedOutputOptions = {
    browser: 'browser',
    server: 'server',
    media: 'media',
    ...(typeof outputPath === 'string' ? undefined : outputPath),
    base: normalizeDirectoryPath(
      path.resolve(workspaceRoot, typeof outputPath === 'string' ? outputPath : outputPath.base),
    ),
    clean: options.deleteOutputPath ?? true,
    // For app-shell and SSG server files are not required by users.
    // Omit these when SSR is not enabled.
    ignoreServer:
      ((ssrOptions === undefined || serverEntryPoint === undefined) &&
        options.outputMode === undefined) ||
      options.outputMode === OutputMode.Static,
  };

  const outputNames = {
    bundles:
      options.outputHashing === OutputHashing.All || options.outputHashing === OutputHashing.Bundles
        ? '[name]-[hash]'
        : '[name]',
    media:
      outputOptions.media +
      (options.outputHashing === OutputHashing.All || options.outputHashing === OutputHashing.Media
        ? '/[name]-[hash]'
        : '/[name]'),
  };

  const globalStyles = normalizeGlobalEntries(options.styles, 'styles');
  const globalScripts = normalizeGlobalEntries(options.scripts, 'scripts');
  let indexHtmlOptions;
  // index can never have a value of `true` but in the schema it's of type `boolean`.
  if (typeof options.index !== 'boolean') {
    let indexInput: string;
    let indexOutput: string;
    // The output file will be created within the configured output path
    if (typeof options.index === 'string') {
      indexInput = indexOutput = path.join(workspaceRoot, options.index);
    } else if (typeof options.index === 'undefined') {
      indexInput = path.join(projectSourceRoot, 'index.html');
      indexOutput = 'index.html';
    } else {
      indexInput = path.join(workspaceRoot, options.index.input);
      indexOutput = options.index.output || 'index.html';
    }

    /**
     * If SSR is activated, create a distinct entry file for the `index.html`.
     * This is necessary because numerous server/cloud providers automatically serve the `index.html` as a static file
     * if it exists (handling SSG).
     *
     * For instance, accessing `foo.com/` would lead to `foo.com/index.html` being served instead of hitting the server.
     *
     * This approach can also be applied to service workers, where the `index.csr.html` is served instead of the prerendered `index.html`.
     */
    const indexBaseName = path.basename(indexOutput);
    indexOutput =
      (ssrOptions || prerenderOptions) && indexBaseName === 'index.html'
        ? INDEX_HTML_CSR
        : indexBaseName;

    indexHtmlOptions = {
      input: indexInput,
      output: indexOutput,
      insertionOrder: [
        ['polyfills', true],
        ...globalStyles.filter((s) => s.initial).map((s) => [s.name, false]),
        ...globalScripts.filter((s) => s.initial).map((s) => [s.name, false]),
        ['main', true],
        // [name, esm]
      ] as [string, boolean][],
      transformer: extensions?.indexHtmlTransformer,
      // Preload initial defaults to true
      preloadInitial: typeof options.index !== 'object' || (options.index.preloadInitial ?? true),
    };
  }

  if (appShellOptions || ssrOptions || prerenderOptions) {
    if (!serverEntryPoint) {
      throw new Error(
        'The "server" option is required when enabling "ssr", "prerender" or "app-shell".',
      );
    }

    if (!indexHtmlOptions) {
      throw new Error(
        'The "index" option cannot be set to false when enabling "ssr", "prerender" or "app-shell".',
      );
    }
  }

  const autoCsp = options.security?.autoCsp;
  const security = {
    autoCsp: autoCsp
      ? {
          unsafeEval: autoCsp === true ? false : !!autoCsp.unsafeEval,
        }
      : undefined,
  };

  // Initial options to keep
  const {
    allowedCommonJsDependencies,
    aot = true,
    baseHref,
    crossOrigin,
    externalDependencies,
    extractLicenses,
    inlineStyleLanguage = 'css',
    outExtension,
    serviceWorker,
    poll,
    polyfills,
    statsJson,
    outputMode,
    stylePreprocessorOptions,
    subresourceIntegrity,
    verbose,
    watch,
    progress = true,
    externalPackages,
    namedChunks,
    budgets,
    deployUrl,
    clearScreen,
    define,
    partialSSRBuild = false,
    externalRuntimeStyles,
    instrumentForCoverage,
  } = options;

  // Return all the normalized options
  return {
    advancedOptimizations: !!aot && optimizationOptions.scripts,
    allowedCommonJsDependencies,
    baseHref,
    cacheOptions,
    crossOrigin,
    externalDependencies: normalizeExternals(externalDependencies),
    externalPackages:
      typeof externalPackages === 'object'
        ? {
            ...externalPackages,
            exclude: normalizeExternals(externalPackages.exclude),
          }
        : externalPackages,
    extractLicenses,
    inlineStyleLanguage,
    jit: !aot,
    stats: !!statsJson,
    polyfills: polyfills === undefined || Array.isArray(polyfills) ? polyfills : [polyfills],
    poll,
    progress,
    preserveSymlinks,
    stylePreprocessorOptions,
    subresourceIntegrity,
    serverEntryPoint,
    prerenderOptions,
    appShellOptions,
    outputMode,
    ssrOptions,
    verbose,
    watch,
    workspaceRoot,
    entryPoints,
    optimizationOptions,
    outputOptions,
    outExtension,
    sourcemapOptions,
    tsconfig,
    projectRoot,
    assets,
    outputNames,
    fileReplacements,
    globalStyles,
    globalScripts,
    serviceWorker: serviceWorker
      ? path.join(
          workspaceRoot,
          typeof serviceWorker === 'string' ? serviceWorker : 'src/ngsw-config.json',
        )
      : undefined,
    indexHtmlOptions,
    tailwindConfiguration,
    postcssConfiguration,
    i18nOptions,
    namedChunks,
    budgets: budgets?.length ? budgets : undefined,
    publicPath: deployUrl,
    plugins: extensions?.codePlugins?.length ? extensions?.codePlugins : undefined,
    loaderExtensions,
    jsonLogs: useJSONBuildLogs,
    colors: supportColor(),
    clearScreen,
    define,
    partialSSRBuild: usePartialSsrBuild || partialSSRBuild,
    externalRuntimeStyles: aot && externalRuntimeStyles,
    instrumentForCoverage,
    security,
    templateUpdates: !!options.templateUpdates,
    incrementalResults: !!options.incrementalResults,
    customConditions: options.conditions,
    frameworkVersion: await findFrameworkVersion(projectRoot),
  };
}

async function getTailwindConfig(
  searchDirectories: SearchDirectory[],
  workspaceRoot: string,
  context: BuilderContext,
): Promise<{ file: string; package: string } | undefined> {
  const tailwindConfigurationPath = findTailwindConfiguration(searchDirectories);

  if (!tailwindConfigurationPath) {
    return undefined;
  }

  // Create a node resolver from the configuration file
  const resolver = createRequire(tailwindConfigurationPath);
  try {
    return {
      file: tailwindConfigurationPath,
      package: resolver.resolve('tailwindcss'),
    };
  } catch {
    const relativeTailwindConfigPath = path.relative(workspaceRoot, tailwindConfigurationPath);
    context.logger.warn(
      `Tailwind CSS configuration file found (${relativeTailwindConfigPath})` +
        ` but the 'tailwindcss' package is not installed.` +
        ` To enable Tailwind CSS, please install the 'tailwindcss' package.`,
    );
  }

  return undefined;
}

/**
 * Normalize entry point options. To maintain compatibility with the legacy browser builder, we need a single `browser`
 * option which defines a single entry point. However, we also want to support multiple entry points as an internal option.
 * The two options are mutually exclusive and if `browser` is provided it will be used as the sole entry point.
 * If `entryPoints` are provided, they will be used as the set of entry points.
 *
 * @param workspaceRoot Path to the root of the Angular workspace.
 * @param browser The `browser` option pointing at the application entry point. While required per the schema file, it may be omitted by
 *     programmatic usages of `browser-esbuild`.
 * @param entryPoints Set of entry points to use if provided.
 * @returns An object mapping entry point names to their file paths.
 */
function normalizeEntryPoints(
  workspaceRoot: string,
  browser: string | undefined,
  entryPoints: Set<string> | Map<string, string> = new Set(),
): Record<string, string> {
  if (browser === '') {
    throw new Error('`browser` option cannot be an empty string.');
  }

  // `browser` and `entryPoints` are mutually exclusive.
  if (browser && entryPoints.size > 0) {
    throw new Error('Only one of `browser` or `entryPoints` may be provided.');
  }
  if (!browser && entryPoints.size === 0) {
    // Schema should normally reject this case, but programmatic usages of the builder might make this mistake.
    throw new Error('Either `browser` or at least one `entryPoints` value must be provided.');
  }

  // Schema types force `browser` to always be provided, but it may be omitted when the builder is invoked programmatically.
  if (browser) {
    // Use `browser` alone.
    return { 'main': path.join(workspaceRoot, browser) };
  } else if (entryPoints instanceof Map) {
    return Object.fromEntries(
      Array.from(entryPoints.entries(), ([name, entryPoint]) => {
        // Get the full file path to a relative entry point input. Leave bare specifiers alone so they are resolved as modules.
        const isRelativePath = entryPoint.startsWith('.');
        const entryPointPath = isRelativePath ? path.join(workspaceRoot, entryPoint) : entryPoint;

        return [name, entryPointPath];
      }),
    );
  } else {
    // Use `entryPoints` alone.
    const entryPointPaths: Record<string, string> = {};
    for (const entryPoint of entryPoints) {
      const parsedEntryPoint = path.parse(entryPoint);

      // Use the input file path without an extension as the "name" of the entry point dictating its output location.
      // Relative entry points are generated at the same relative path in the output directory.
      // Absolute entry points are always generated with the same file name in the root of the output directory. This includes absolute
      // paths pointing at files actually within the workspace root.
      const entryPointName = path.isAbsolute(entryPoint)
        ? parsedEntryPoint.name
        : path.join(parsedEntryPoint.dir, parsedEntryPoint.name);

      // Get the full file path to a relative entry point input. Leave bare specifiers alone so they are resolved as modules.
      const isRelativePath = entryPoint.startsWith('.');
      const entryPointPath = isRelativePath ? path.join(workspaceRoot, entryPoint) : entryPoint;

      // Check for conflicts with previous entry points.
      const existingEntryPointPath = entryPointPaths[entryPointName];
      if (existingEntryPointPath) {
        throw new Error(
          `\`${existingEntryPointPath}\` and \`${entryPointPath}\` both output to the same location \`${entryPointName}\`.` +
            ' Rename or move one of the files to fix the conflict.',
        );
      }

      entryPointPaths[entryPointName] = entryPointPath;
    }

    return entryPointPaths;
  }
}

/**
 * Normalize a directory path string.
 * Currently only removes a trailing slash if present.
 * @param path A path string.
 * @returns A normalized path string.
 */
function normalizeDirectoryPath(path: string): string {
  const last = path[path.length - 1];
  if (last === '/' || last === '\\') {
    return path.slice(0, -1);
  }

  return path;
}

function normalizeGlobalEntries(
  rawEntries: ({ bundleName?: string; input: string; inject?: boolean } | string)[] | undefined,
  defaultName: string,
): { name: string; files: string[]; initial: boolean }[] {
  if (!rawEntries?.length) {
    return [];
  }

  const bundles = new Map<string, { name: string; files: string[]; initial: boolean }>();

  for (const rawEntry of rawEntries) {
    let entry;
    if (typeof rawEntry === 'string') {
      // string entries use default bundle name and inject values
      entry = { input: rawEntry };
    } else {
      entry = rawEntry;
    }

    const { bundleName, input, inject = true } = entry;

    // Non-injected entries default to the file name
    const name = bundleName || (inject ? defaultName : path.basename(input, path.extname(input)));

    const existing = bundles.get(name);
    if (!existing) {
      bundles.set(name, { name, files: [input], initial: inject });
      continue;
    }

    if (existing.initial !== inject) {
      throw new Error(
        `The "${name}" bundle is mixing injected and non-injected entries. ` +
          'Verify that the project options are correct.',
      );
    }

    existing.files.push(input);
  }

  return [...bundles.values()];
}

export function getLocaleBaseHref(
  baseHref: string | undefined = '',
  i18n: NormalizedApplicationBuildOptions['i18nOptions'],
  locale: string,
): string | undefined {
  if (i18n.flatOutput) {
    return undefined;
  }

  const localeData = i18n.locales[locale];
  if (!localeData) {
    return undefined;
  }

  const baseHrefSuffix = localeData.baseHref ?? localeData.subPath + '/';

  return baseHrefSuffix !== '' ? urlJoin(baseHref, baseHrefSuffix) : undefined;
}

/**
 * Normalizes an array of external dependency paths by ensuring that
 * wildcard patterns (`/*`) are removed from package names.
 *
 * This avoids the need to handle this normalization repeatedly in our plugins,
 * as esbuild already treats `--external:@foo/bar` as implicitly including
 * `--external:@foo/bar/*`. By standardizing the input, we ensure consistency
 * and reduce redundant checks across our plugins.
 *
 * @param value - An optional array of dependency paths to normalize.
 * @returns A new array with wildcard patterns removed from package names, or `undefined` if input is `undefined`.
 */
function normalizeExternals(value: string[] | undefined): string[] | undefined {
  if (!value) {
    return undefined;
  }

  return [
    ...new Set(
      value.map((d) =>
        // remove "/*" wildcard in the end if provided string is not path-like
        d.endsWith('/*') && !/^\.{0,2}\//.test(d) ? d.slice(0, -2) : d,
      ),
    ),
  ];
}

async function findFrameworkVersion(projectRoot: string): Promise<string> {
  // Create a custom require function for ESM compliance.
  // NOTE: The trailing slash is significant.
  const projectResolve = createRequire(projectRoot + '/').resolve;

  try {
    const manifestPath = projectResolve('@angular/core/package.json');
    const manifestData = await readFile(manifestPath, 'utf-8');
    const manifestObject = JSON.parse(manifestData) as { version: string };
    const version = manifestObject.version;

    return version;
  } catch {
    throw new Error(
      'Error: It appears that "@angular/core" is missing as a dependency. Please ensure it is included in your project.',
    );
  }
}
