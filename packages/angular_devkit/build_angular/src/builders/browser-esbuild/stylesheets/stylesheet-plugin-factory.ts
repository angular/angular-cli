/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import createAutoPrefixerPlugin from 'autoprefixer';
import type { OnLoadResult, Plugin, PluginBuild } from 'esbuild';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { LoadResultCache, createCachedLoad } from '../load-result-cache';

/**
 * The lazy-loaded instance of the postcss stylesheet postprocessor.
 * It is only imported and initialized if postcss is needed.
 */
let postcss: typeof import('postcss')['default'] | undefined;

/**
 * An object containing the plugin options to use when processing stylesheets.
 */
export interface StylesheetPluginOptions {
  /**
   * Controls the use and creation of sourcemaps when processing the stylesheets.
   * If true, sourcemap processing is enabled; if false, disabled.
   */
  sourcemap: boolean;

  includePaths?: string[];

  /**
   * Optional component data for any inline styles from Component decorator `styles` fields.
   * The key is an internal angular resource URI and the value is the stylesheet content.
   */
  inlineComponentData?: Record<string, string>;

  /**
   * The browsers to support in browserslist format when processing stylesheets.
   * Some postcss plugins such as autoprefixer require the raw browserslist information instead
   * of the esbuild formatted target.
   */
  browsers: string[];

  tailwindConfiguration?: { file: string; package: string };
}

export interface StylesheetLanguage {
  name: string;
  componentFilter: RegExp;
  fileFilter: RegExp;
  process?(
    data: string,
    file: string,
    format: string,
    options: StylesheetPluginOptions,
    build: PluginBuild,
  ): OnLoadResult | Promise<OnLoadResult>;
}

export class StylesheetPluginFactory {
  private autoprefixer: import('postcss').Plugin | undefined;

  constructor(
    private readonly options: StylesheetPluginOptions,
    private readonly cache?: LoadResultCache,
  ) {
    const autoprefixer = createAutoPrefixerPlugin({
      overrideBrowserslist: options.browsers,
      ignoreUnknownVersions: true,
    });

    // Autoprefixer currently does not contain a method to check if autoprefixer is required
    // based on the provided list of browsers. However, it does contain a method that returns
    // informational text that can be used as a replacement. The text "Awesome!" will be present
    // when autoprefixer determines no actions are needed.
    // ref: https://github.com/postcss/autoprefixer/blob/e2f5c26ff1f3eaca95a21873723ce1cdf6e59f0e/lib/info.js#L118
    const autoprefixerInfo = autoprefixer.info();
    const skipAutoprefixer = autoprefixerInfo.includes('Awesome!');

    if (!skipAutoprefixer) {
      this.autoprefixer = autoprefixer;
    }
  }

  create(language: Readonly<StylesheetLanguage>): Plugin {
    // Return a noop plugin if no load actions are required
    if (!language.process && !this.autoprefixer && !this.options.tailwindConfiguration) {
      return {
        name: 'angular-' + language.name,
        setup() {},
      };
    }

    const { autoprefixer, cache, options } = this;

    return {
      name: 'angular-' + language.name,
      async setup(build) {
        // Setup postcss if needed by either autoprefixer or tailwind
        // TODO: Move this into the plugin factory to avoid repeat setup per created plugin
        let postcssProcessor: import('postcss').Processor | undefined;
        if (autoprefixer || options.tailwindConfiguration) {
          postcss ??= (await import('postcss')).default;
          postcssProcessor = postcss();
          if (options.tailwindConfiguration) {
            const tailwind = await import(options.tailwindConfiguration.package);
            postcssProcessor.use(tailwind.default({ config: options.tailwindConfiguration.file }));
          }
          if (autoprefixer) {
            postcssProcessor.use(autoprefixer);
          }
        }

        // Add a load callback to support inline Component styles
        build.onLoad(
          { filter: language.componentFilter, namespace: 'angular:styles/component' },
          createCachedLoad(cache, async (args) => {
            const data = options.inlineComponentData?.[args.path];
            assert(
              typeof data === 'string',
              `component style name should always be found [${args.path}]`,
            );

            const [format, , filename] = args.path.split(';', 3);

            return processStylesheet(
              language,
              data,
              filename,
              format,
              options,
              build,
              postcssProcessor,
            );
          }),
        );

        // Add a load callback to support files from disk
        build.onLoad(
          { filter: language.fileFilter },
          createCachedLoad(cache, async (args) => {
            const data = await readFile(args.path, 'utf-8');

            return processStylesheet(
              language,
              data,
              args.path,
              extname(args.path).toLowerCase().slice(1),
              options,
              build,
              postcssProcessor,
            );
          }),
        );
      },
    };
  }
}

async function processStylesheet(
  language: Readonly<StylesheetLanguage>,
  data: string,
  filename: string,
  format: string,
  options: StylesheetPluginOptions,
  build: PluginBuild,
  postcssProcessor: import('postcss').Processor | undefined,
) {
  let result: OnLoadResult;

  // Process the input data if the language requires preprocessing
  if (language.process) {
    result = await language.process(data, filename, format, options, build);
  } else {
    result = {
      contents: data,
      loader: 'css',
      watchFiles: [filename],
    };
  }

  // Transform with postcss if needed and there are no errors
  if (postcssProcessor && result.contents && !result.errors?.length) {
    const postcssResult = await compileString(
      typeof result.contents === 'string'
        ? result.contents
        : Buffer.from(result.contents).toString('utf-8'),
      filename,
      postcssProcessor,
      options,
    );

    // Merge results
    if (postcssResult.errors?.length) {
      delete result.contents;
    }
    if (result.warnings && postcssResult.warnings) {
      postcssResult.warnings.unshift(...result.warnings);
    }
    if (result.watchFiles && postcssResult.watchFiles) {
      postcssResult.watchFiles.unshift(...result.watchFiles);
    }
    if (result.watchDirs && postcssResult.watchDirs) {
      postcssResult.watchDirs.unshift(...result.watchDirs);
    }
    result = {
      ...result,
      ...postcssResult,
    };
  }

  return result;
}

/**
 * Compiles the provided CSS stylesheet data using a provided postcss processor and provides an
 * esbuild load result that can be used directly by an esbuild Plugin.
 * @param data The stylesheet content to process.
 * @param filename The name of the file that contains the data.
 * @param postcssProcessor A postcss processor instance to use.
 * @param options The plugin options to control the processing.
 * @returns An esbuild OnLoaderResult object with the processed content, warnings, and/or errors.
 */
async function compileString(
  data: string,
  filename: string,
  postcssProcessor: import('postcss').Processor,
  options: StylesheetPluginOptions,
): Promise<OnLoadResult> {
  try {
    const result = await postcssProcessor.process(data, {
      from: filename,
      to: filename,
      map: options.sourcemap && {
        inline: true,
        sourcesContent: true,
      },
    });

    const rawWarnings = result.warnings();
    let warnings;
    if (rawWarnings.length > 0) {
      const lineMappings = new Map<string, string[] | null>();
      warnings = rawWarnings.map((warning) => {
        const file = warning.node.source?.input.file;
        if (file === undefined) {
          return { text: warning.text };
        }

        let lines = lineMappings.get(file);
        if (lines === undefined) {
          lines = warning.node.source?.input.css.split(/\r?\n/);
          lineMappings.set(file, lines ?? null);
        }

        return {
          text: warning.text,
          location: {
            file,
            line: warning.line,
            column: warning.column - 1,
            lineText: lines?.[warning.line - 1],
          },
        };
      });
    }

    return {
      contents: result.css,
      loader: 'css',
      warnings,
    };
  } catch (error) {
    postcss ??= (await import('postcss')).default;
    if (error instanceof postcss.CssSyntaxError) {
      const lines = error.source?.split(/\r?\n/);

      return {
        errors: [
          {
            text: error.reason,
            location: {
              file: error.file,
              line: error.line,
              column: error.column && error.column - 1,
              lineText: error.line === undefined ? undefined : lines?.[error.line - 1],
            },
          },
        ],
      };
    }

    throw error;
  }
}
