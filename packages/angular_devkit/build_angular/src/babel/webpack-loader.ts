/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import remapping from '@ampproject/remapping';
import { custom } from 'babel-loader';
import { ScriptTarget } from 'typescript';
import { loadEsmModule } from '../utils/load-esm';
import { ApplicationPresetOptions, I18nPluginCreators } from './presets/application';

interface AngularCustomOptions extends Omit<ApplicationPresetOptions, 'instrumentCode'> {
  instrumentCode?: {
    /** node_modules and test files are always excluded. */
    excludedPaths: Set<String>;
    includedBasePath: string;
  };
}

export type AngularBabelLoaderOptions = AngularCustomOptions & Record<string, unknown>;

// Extract Sourcemap input type from the remapping function since it is not currently exported
type SourceMapInput = Exclude<Parameters<typeof remapping>[0], unknown[]>;

/**
 * Cached instance of the compiler-cli linker's needsLinking function.
 */
let needsLinking: typeof import('@angular/compiler-cli/linker').needsLinking | undefined;

/**
 * Cached instance of the compiler-cli linker's Babel plugin factory function.
 */
let linkerPluginCreator:
  | typeof import('@angular/compiler-cli/linker/babel').createEs2015LinkerPlugin
  | undefined;

/**
 * Cached instance of the localize Babel plugins factory functions.
 */
let i18nPluginCreators: I18nPluginCreators | undefined;

async function requiresLinking(path: string, source: string): Promise<boolean> {
  // @angular/core and @angular/compiler will cause false positives
  // Also, TypeScript files do not require linking
  if (/[\\/]@angular[\\/](?:compiler|core)|\.tsx?$/.test(path)) {
    return false;
  }

  if (!needsLinking) {
    // Load ESM `@angular/compiler-cli/linker` using the TypeScript dynamic import workaround.
    // Once TypeScript provides support for keeping the dynamic import this workaround can be
    // changed to a direct dynamic import.
    const linkerModule = await loadEsmModule<typeof import('@angular/compiler-cli/linker')>(
      '@angular/compiler-cli/linker',
    );
    needsLinking = linkerModule.needsLinking;
  }

  return needsLinking(path, source);
}

export default custom<ApplicationPresetOptions>(() => {
  const baseOptions = Object.freeze({
    babelrc: false,
    configFile: false,
    compact: false,
    cacheCompression: false,
    sourceType: 'unambiguous',
    inputSourceMap: false,
  });

  return {
    async customOptions(options, { source, map }) {
      const { i18n, scriptTarget, aot, optimize, instrumentCode, ...rawOptions } =
        options as AngularBabelLoaderOptions;

      // Must process file if plugins are added
      let shouldProcess = Array.isArray(rawOptions.plugins) && rawOptions.plugins.length > 0;

      const customOptions: ApplicationPresetOptions = {
        forceAsyncTransformation: false,
        forceES5: false,
        angularLinker: undefined,
        i18n: undefined,
        instrumentCode: undefined,
      };

      // Analyze file for linking
      if (await requiresLinking(this.resourcePath, source)) {
        if (!linkerPluginCreator) {
          // Load ESM `@angular/compiler-cli/linker/babel` using the TypeScript dynamic import workaround.
          // Once TypeScript provides support for keeping the dynamic import this workaround can be
          // changed to a direct dynamic import.
          const linkerBabelModule = await loadEsmModule<
            typeof import('@angular/compiler-cli/linker/babel')
          >('@angular/compiler-cli/linker/babel');
          linkerPluginCreator = linkerBabelModule.createEs2015LinkerPlugin;
        }

        customOptions.angularLinker = {
          shouldLink: true,
          jitMode: aot !== true,
          linkerPluginCreator,
        };
        shouldProcess = true;
      }

      // Analyze for ES target processing
      const esTarget = scriptTarget as ScriptTarget | undefined;
      if (esTarget !== undefined) {
        if (esTarget < ScriptTarget.ES2015) {
          customOptions.forceES5 = true;
        } else if (esTarget >= ScriptTarget.ES2017 || /\.[cm]?js$/.test(this.resourcePath)) {
          // Application code (TS files) will only contain native async if target is ES2017+.
          // However, third-party libraries can regardless of the target option.
          // APF packages with code in [f]esm2015 directories is downlevelled to ES2015 and
          // will not have native async.
          customOptions.forceAsyncTransformation =
            !/[\\/][_f]?esm2015[\\/]/.test(this.resourcePath) && source.includes('async');
        }
        shouldProcess ||= customOptions.forceAsyncTransformation || customOptions.forceES5 || false;
      }

      // Analyze for i18n inlining
      if (
        i18n &&
        !/[\\/]@angular[\\/](?:compiler|localize)/.test(this.resourcePath) &&
        source.includes('$localize')
      ) {
        // Load the i18n plugin creators from the new `@angular/localize/tools` entry point.
        // This may fail during the transition to ESM due to the entry point not yet existing.
        // During the transition, this will always attempt to load the entry point for each file.
        // This will only occur during prerelease and will be automatically corrected once the new
        // entry point exists.
        // TODO_ESM: Make import failure an error once the `tools` entry point exists.
        if (i18nPluginCreators === undefined) {
          // Load ESM `@angular/localize/tools` using the TypeScript dynamic import workaround.
          // Once TypeScript provides support for keeping the dynamic import this workaround can be
          // changed to a direct dynamic import.
          try {
            i18nPluginCreators = await loadEsmModule<I18nPluginCreators>('@angular/localize/tools');
          } catch {}
        }

        customOptions.i18n = {
          ...(i18n as NonNullable<ApplicationPresetOptions['i18n']>),
          pluginCreators: i18nPluginCreators,
        };
        shouldProcess = true;
      }

      if (optimize) {
        const angularPackage = /[\\/]node_modules[\\/]@angular[\\/]/.test(this.resourcePath);
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

      if (
        instrumentCode &&
        !instrumentCode.excludedPaths.has(this.resourcePath) &&
        !/\.(e2e|spec)\.tsx?$|[\\/]node_modules[\\/]/.test(this.resourcePath) &&
        this.resourcePath.startsWith(instrumentCode.includedBasePath)
      ) {
        // `babel-plugin-istanbul` has it's own includes but we do the below so that we avoid running the the loader.
        customOptions.instrumentCode = {
          includedBasePath: instrumentCode.includedBasePath,
          inputSourceMap: map,
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
      return {
        ...configuration.options,
        // Using `false` disables babel from attempting to locate sourcemaps or process any inline maps.
        // The babel types do not include the false option even though it is valid
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inputSourceMap: false as any,
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
        result.map = {
          // Convert the SourceMap back to simple plain object.
          // This is needed because otherwise code-coverage will fail with `don't know how to turn this value into a node`
          // Which is thrown by Babel if it is invoked again from `istanbul-lib-instrument`.
          // https://github.com/babel/babel/blob/780aa48d2a34dc55f556843074b6aed45e7eabeb/packages/babel-types/src/converters/valueToNode.ts#L115-L130
          ...(remapping(
            [result.map as SourceMapInput, inputSourceMap as SourceMapInput],
            () => null,
          ) as typeof result.map),
        };
      }

      return result;
    },
  };
});
