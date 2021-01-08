/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { custom } from 'babel-loader';
import { ScriptTarget } from 'typescript';

interface AngularCustomOptions {
  forceAsyncTransformation: boolean;
  forceES5: boolean;
  shouldLink: boolean;
}

/**
 * Cached linker check utility function
 *
 * If undefined, not yet been imported
 * If null, attempted import failed and no linker support
 * If function, import succeeded and linker supported
 */
let needsLinking: undefined | null | typeof import('@angular/compiler-cli/linker').needsLinking;

async function checkLinking(
  path: string,
  source: string,
): Promise<{ hasLinkerSupport?: boolean; requiresLinking: boolean }> {
  // @angular/core and @angular/compiler will cause false positives
  // Also, TypeScript files do not require linking
  if (/[\\\/]@angular[\\\/](?:compiler|core)|\.tsx?$/.test(path)) {
    return { requiresLinking: false };
  }

  if (needsLinking !== null) {
    try {
      if (needsLinking === undefined) {
        needsLinking = (await import('@angular/compiler-cli/linker')).needsLinking;
      }

      // If the linker entry point is present then there is linker support
      return { hasLinkerSupport: true, requiresLinking: needsLinking(path, source) };
    } catch {
      needsLinking = null;
    }
  }

  // Fallback for Angular versions less than 11.1.0 with no linker support.
  // This information is used to issue errors if a partially compiled library is used when unsupported.
  return {
    hasLinkerSupport: false,
    requiresLinking:
      source.includes('ɵɵngDeclareDirective') || source.includes('ɵɵngDeclareComponent'),
  };
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
    async customOptions({ scriptTarget, ...loaderOptions }, { source }) {
      // Must process file if plugins are added
      let shouldProcess = Array.isArray(loaderOptions.plugins) && loaderOptions.plugins.length > 0;

      // Analyze file for linking
      let shouldLink = false;
      const { hasLinkerSupport, requiresLinking } = await checkLinking(this.resourcePath, source);
      if (requiresLinking && !hasLinkerSupport) {
        // Cannot link if there is no linker support
        this.emitError(
          'File requires the Angular linker. "@angular/compiler-cli" version 11.1.0 or greater is needed.',
        );
      } else {
        shouldLink = requiresLinking;
      }
      shouldProcess ||= shouldLink;

      // Analyze for ES target processing
      let forceES5 = false;
      let forceAsyncTransformation = false;
      const esTarget = scriptTarget as ScriptTarget;
      if (esTarget < ScriptTarget.ES2015) {
        // TypeScript files will have already been downlevelled
        forceES5 = !/\.tsx?$/.test(this.resourcePath);
      } else if (esTarget >= ScriptTarget.ES2017) {
        forceAsyncTransformation = source.includes('async');
      }
      shouldProcess ||= forceAsyncTransformation || forceES5;

      // Add provided loader options to default base options
      const options: Record<string, unknown> = {
        ...baseOptions,
        ...loaderOptions,
      };

      // Skip babel processing if no actions are needed
      if (!shouldProcess) {
        // Force the current file to be ignored
        options.ignore = [() => true];
      }

      return { custom: { forceAsyncTransformation, forceES5, shouldLink }, loader: options };
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
            } as import('./presets/application').ApplicationPresetOptions,
          ],
        ],
      };
    },
  };
});
