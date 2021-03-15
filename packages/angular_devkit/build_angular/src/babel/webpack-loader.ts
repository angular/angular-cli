/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { needsLinking } from '@angular/compiler-cli/linker';
import { custom } from 'babel-loader';
import { ScriptTarget } from 'typescript';
import { ApplicationPresetOptions } from './presets/application';

interface AngularCustomOptions {
  forceAsyncTransformation: boolean;
  forceES5: boolean;
  shouldLink: boolean;
  i18n: ApplicationPresetOptions['i18n'];
}

function requiresLinking(
  path: string,
  source: string,
): boolean {
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
  });

  return {
    async customOptions({ i18n, scriptTarget, ...rawOptions }, { source }) {
      // Must process file if plugins are added
      let shouldProcess = Array.isArray(rawOptions.plugins) && rawOptions.plugins.length > 0;

      const customOptions: AngularCustomOptions = {
        forceAsyncTransformation: false,
        forceES5: false,
        shouldLink: false,
        i18n: undefined,
      };

      // Analyze file for linking
      customOptions.shouldLink = await requiresLinking(this.resourcePath, source);
      shouldProcess ||= customOptions.shouldLink;

      // Analyze for ES target processing
      const esTarget = scriptTarget as ScriptTarget | undefined;
      if (esTarget !== undefined) {
        if (esTarget < ScriptTarget.ES2015) {
          // TypeScript files will have already been downlevelled
          customOptions.forceES5 = !/\.tsx?$/.test(this.resourcePath);
        } else if (esTarget >= ScriptTarget.ES2017) {
          customOptions.forceAsyncTransformation = source.includes('async');
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
        presets: [
          ...(configuration.options.presets || []),
          [
            require('./presets/application').default,
            {
              angularLinker: customOptions.shouldLink,
              forceES5: customOptions.forceES5,
              forceAsyncTransformation: customOptions.forceAsyncTransformation,
              i18n: customOptions.i18n,
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
