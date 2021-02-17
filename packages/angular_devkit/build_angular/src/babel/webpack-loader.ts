/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import remapping from '@ampproject/remapping';
import { needsLinking } from '@angular/compiler-cli/linker';
import { custom } from 'babel-loader';
import { ScriptTarget } from 'typescript';
import { ApplicationPresetOptions } from './presets/application';

interface AngularCustomOptions extends Pick<ApplicationPresetOptions, 'angularLinker' | 'i18n'> {
  forceAsyncTransformation: boolean;
  forceES5: boolean;
  optimize?: {
    looseEnums: boolean;
    pureTopLevel: boolean;
    wrapDecorators: boolean;
  };
}

// Extract Sourcemap input type from the remapping function since it is not currently exported
type SourceMapInput = Exclude<Parameters<typeof remapping>[0], unknown[]>;

function requiresLinking(path: string, source: string): boolean {
  // @angular/core and @angular/compiler will cause false positives
  // Also, TypeScript files do not require linking
  if (/[\\\/]@angular[\\\/](?:compiler|core)|\.tsx?$/.test(path)) {
    return false;
  }

  return needsLinking(path, source);
}

export default custom<AngularCustomOptions>(() => {
  const baseOptions = Object.freeze({
    babelrc: false,
    configFile: false,
    compact: false,
    cacheCompression: false,
    sourceType: 'unambiguous',
    inputSourceMap: false,
  });

  return {
    async customOptions({ i18n, scriptTarget, aot, optimize, ...rawOptions }, { source }) {
      // Must process file if plugins are added
      let shouldProcess = Array.isArray(rawOptions.plugins) && rawOptions.plugins.length > 0;

      const customOptions: AngularCustomOptions = {
        forceAsyncTransformation: false,
        forceES5: false,
        angularLinker: undefined,
        i18n: undefined,
      };

      // Analyze file for linking
      if (await requiresLinking(this.resourcePath, source)) {
        customOptions.angularLinker = {
          shouldLink: true,
          jitMode: aot !== true,
        };
        shouldProcess = true;
      }

      // Analyze for ES target processing
      const esTarget = scriptTarget as ScriptTarget | undefined;
      if (esTarget !== undefined) {
        if (esTarget < ScriptTarget.ES2015) {
          // TypeScript files will have already been downlevelled
          customOptions.forceES5 = !/\.tsx?$/.test(this.resourcePath);
        } else if (esTarget >= ScriptTarget.ES2017 || /\.[cm]?js$/.test(this.resourcePath)) {
          // Application code (TS files) will only contain native async if target is ES2017+.
          // However, third-party libraries can regardless of the target option.
          // APF packages with code in [f]esm2015 directories is downlevelled to ES2015 and
          // will not have native async.
          customOptions.forceAsyncTransformation =
            !/[\\\/][_f]?esm2015[\\\/]/.test(this.resourcePath) && source.includes('async');
        }
        shouldProcess ||= customOptions.forceAsyncTransformation || customOptions.forceES5;
      }

      // Analyze for i18n inlining
      if (
        i18n &&
        !/[\\\/]@angular[\\\/](?:compiler|localize)/.test(this.resourcePath) &&
        source.includes('$localize')
      ) {
        customOptions.i18n = i18n as ApplicationPresetOptions['i18n'];
        shouldProcess = true;
      }

      if (optimize) {
        const angularPackage = /[\\\/]node_modules[\\\/]@angular[\\\/]/.test(this.resourcePath);
        customOptions.optimize = {
          // Angular packages provide additional tested side effects guarantees and can use
          // otherwise unsafe optimizations.
          looseEnums: angularPackage,
          pureTopLevel: angularPackage,
          // JavaScript modules that are marked as side effect free are considered to have
          // no decorators that contain non-local effects.
          wrapDecorators: !!this._module?.factoryMeta?.sideEffectFree,
        };

        shouldProcess = true;
      }

      // Add provided loader options to default base options
      const loaderOptions: Record<string, unknown> = {
        ...baseOptions,
        ...rawOptions,
        cacheIdentifier: JSON.stringify({
          buildAngular: require('../../package.json').version,
          customOptions,
          baseOptions,
          rawOptions,
        }),
      };

      // Skip babel processing if no actions are needed
      if (!shouldProcess) {
        // Force the current file to be ignored
        loaderOptions.ignore = [() => true];
      }

      return { custom: customOptions, loader: loaderOptions };
    },
    config(configuration, { customOptions }) {
      const plugins = configuration.options.plugins ?? [];
      if (customOptions.optimize) {
        if (customOptions.optimize.pureTopLevel) {
          plugins.push(require('./plugins/pure-toplevel-functions').default);
        }

        plugins.push(
          require('./plugins/elide-angular-metadata').default,
          [
            require('./plugins/adjust-typescript-enums').default,
            { loose: customOptions.optimize.looseEnums },
          ],
          [
            require('./plugins/adjust-static-class-members').default,
            { wrapDecorators: customOptions.optimize.wrapDecorators },
          ],
        );
      }

      return {
        ...configuration.options,
        // Using `false` disables babel from attempting to locate sourcemaps or process any inline maps.
        // The babel types do not include the false option even though it is valid
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inputSourceMap: false as any,
        plugins,
        presets: [
          ...(configuration.options.presets || []),
          [
            require('./presets/application').default,
            {
              ...customOptions,
              diagnosticReporter: (type, message) => {
                switch (type) {
                  case 'error':
                    this.emitError(message);
                    break;
                  case 'info':
                  // Webpack does not currently have an informational diagnostic
                  case 'warning':
                    this.emitWarning(message);
                    break;
                }
              },
            } as ApplicationPresetOptions,
          ],
        ],
      };
    },
    result(result, { map: inputSourceMap }) {
      if (result.map && inputSourceMap) {
        // Merge the intermediate sourcemap generated by babel with the input source map.
        // The casting is required due to slight differences in the types for babel and
        // `@ampproject/remapping` source map objects but both are compatible with Webpack.
        // This method for merging is used because it provides more accurate output
        // and is faster while using less memory.
        result.map = remapping(
          [result.map as SourceMapInput, inputSourceMap as SourceMapInput],
          () => null,
        ) as typeof result.map;
      }

      return result;
    },
  };
});
