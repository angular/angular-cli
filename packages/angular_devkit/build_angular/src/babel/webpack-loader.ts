/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

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
          customOptions.forceES5 = true;
        } else if (esTarget >= ScriptTarget.ES2017) {
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
        // Workaround for https://github.com/babel/babel-loader/pull/896 is available
        // Delete once the above PR is released
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inputSourceMap: configuration.options.inputSourceMap || (false as any), // Typings are not correct
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
  };
});
