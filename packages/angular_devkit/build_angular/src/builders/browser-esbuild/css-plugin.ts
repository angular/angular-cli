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

/**
 * The lazy-loaded instance of the postcss stylesheet postprocessor.
 * It is only imported and initialized if postcss is needed.
 */
let postcss: typeof import('postcss')['default'] | undefined;

/**
 * An object containing the plugin options to use when processing CSS stylesheets.
 */
export interface CssPluginOptions {
  /**
   * Controls the use and creation of sourcemaps when processing the stylesheets.
   * If true, sourcemap processing is enabled; if false, disabled.
   */
  sourcemap: boolean;
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

/**
 * Creates an esbuild plugin to process CSS stylesheets.
 * @param options An object containing the plugin options.
 * @returns An esbuild Plugin instance.
 */
export function createCssPlugin(options: CssPluginOptions): Plugin {
  return {
    name: 'angular-css',
    async setup(build: PluginBuild): Promise<void> {
      const autoprefixer = createAutoPrefixerPlugin({
        overrideBrowserslist: options.browsers,
        ignoreUnknownVersions: true,
      });

      // Autoprefixer currently does not contain a method to check if autoprefixer is required
      // based on the provided list of browsers. However, it does contain a method that returns
      // informational text that can be used as a replacement. The text "Awesome!" will be present
      // when autoprefixer determines no actions are needed.
      // ref: https://github.com/postcss/autoprefixer/blob/e2f5c26ff1f3eaca95a21873723ce1cdf6e59f0e/lib/info.js#L118
      const autoprefixerInfo = autoprefixer.info({ from: build.initialOptions.absWorkingDir });
      const skipAutoprefixer = autoprefixerInfo.includes('Awesome!');

      if (skipAutoprefixer && !options.tailwindConfiguration) {
        return;
      }

      postcss ??= (await import('postcss')).default;
      const postcssProcessor = postcss();
      if (options.tailwindConfiguration) {
        const tailwind = await import(options.tailwindConfiguration.package);
        postcssProcessor.use(tailwind({ config: options.tailwindConfiguration.file }));
      }
      if (!skipAutoprefixer) {
        postcssProcessor.use(autoprefixer);
      }

      // Add a load callback to support inline Component styles
      build.onLoad({ filter: /^css;/, namespace: 'angular:styles/component' }, async (args) => {
        const data = options.inlineComponentData?.[args.path];
        assert(data, `component style name should always be found [${args.path}]`);

        const [, , filePath] = args.path.split(';', 3);

        return compileString(data, filePath, postcssProcessor, options);
      });

      // Add a load callback to support files from disk
      build.onLoad({ filter: /\.css$/ }, async (args) => {
        const data = await readFile(args.path, 'utf-8');

        return compileString(data, args.path, postcssProcessor, options);
      });
    },
  };
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
  options: CssPluginOptions,
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
