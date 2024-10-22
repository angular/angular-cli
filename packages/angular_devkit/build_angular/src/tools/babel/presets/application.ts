/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { ɵParsedTranslation } from '@angular/localize';
import type {
  DiagnosticHandlingStrategy,
  Diagnostics,
  makeEs2015TranslatePlugin,
  makeLocalePlugin,
} from '@angular/localize/tools';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { loadEsmModule } from '../../../utils/load-esm';

/**
 * Cached instance of the compiler-cli linker's needsLinking function.
 */
let needsLinking: typeof import('@angular/compiler-cli/linker').needsLinking | undefined;

export type DiagnosticReporter = (type: 'error' | 'warning' | 'info', message: string) => void;

/**
 * An interface representing the factory functions for the `@angular/localize` translation Babel plugins.
 * This must be provided for the ESM imports since dynamic imports are required to be asynchronous and
 * Babel presets currently can only be synchronous.
 *
 */
export interface I18nPluginCreators {
  makeEs2015TranslatePlugin: typeof makeEs2015TranslatePlugin;
  makeLocalePlugin: typeof makeLocalePlugin;
}

export interface ApplicationPresetOptions {
  i18n?: {
    locale: string;
    missingTranslationBehavior?: 'error' | 'warning' | 'ignore';
    translation?: Record<string, ɵParsedTranslation>;
    translationFiles?: string[];
    pluginCreators: I18nPluginCreators;
  };

  angularLinker?: {
    shouldLink: boolean;
    jitMode: boolean;
    linkerPluginCreator: typeof import('@angular/compiler-cli/linker/babel').createEs2015LinkerPlugin;
  };

  forceAsyncTransformation?: boolean;
  instrumentCode?: {
    includedBasePath: string;
    inputSourceMap: unknown;
  };
  optimize?: {
    pureTopLevel: boolean;
    wrapDecorators: boolean;
  };

  supportedBrowsers?: string[];
  diagnosticReporter?: DiagnosticReporter;
}

// Extract Logger type from the linker function to avoid deep importing to access the type
type NgtscLogger = Parameters<
  typeof import('@angular/compiler-cli/linker/babel').createEs2015LinkerPlugin
>[0]['logger'];

function createI18nDiagnostics(reporter: DiagnosticReporter | undefined): Diagnostics {
  const diagnostics: Diagnostics = new (class {
    readonly messages: Diagnostics['messages'] = [];
    hasErrors = false;

    add(type: DiagnosticHandlingStrategy, message: string): void {
      if (type === 'ignore') {
        return;
      }

      this.messages.push({ type, message });
      this.hasErrors ||= type === 'error';
      reporter?.(type, message);
    }

    error(message: string): void {
      this.add('error', message);
    }

    warn(message: string): void {
      this.add('warning', message);
    }

    merge(other: Diagnostics): void {
      for (const diagnostic of other.messages) {
        this.add(diagnostic.type, diagnostic.message);
      }
    }

    formatDiagnostics(): never {
      assert.fail(
        '@angular/localize Diagnostics formatDiagnostics should not be called from within babel.',
      );
    }
  })();

  return diagnostics;
}

function createI18nPlugins(
  locale: string,
  translation: Record<string, ɵParsedTranslation> | undefined,
  missingTranslationBehavior: 'error' | 'warning' | 'ignore',
  diagnosticReporter: DiagnosticReporter | undefined,
  pluginCreators: I18nPluginCreators,
) {
  const diagnostics = createI18nDiagnostics(diagnosticReporter);
  const plugins = [];

  const { makeEs2015TranslatePlugin, makeLocalePlugin } = pluginCreators;

  if (translation) {
    plugins.push(
      makeEs2015TranslatePlugin(diagnostics, translation, {
        missingTranslation: missingTranslationBehavior,
      }),
    );
  }

  plugins.push(makeLocalePlugin(locale));

  return plugins;
}

function createNgtscLogger(reporter: DiagnosticReporter | undefined): NgtscLogger {
  return {
    level: 1, // Info level
    debug(...args: string[]) {},
    info(...args: string[]) {
      reporter?.('info', args.join());
    },
    warn(...args: string[]) {
      reporter?.('warning', args.join());
    },
    error(...args: string[]) {
      reporter?.('error', args.join());
    },
  };
}

export default function (api: unknown, options: ApplicationPresetOptions) {
  const presets = [];
  const plugins = [];
  let needRuntimeTransform = false;

  if (options.angularLinker?.shouldLink) {
    plugins.push(
      options.angularLinker.linkerPluginCreator({
        linkerJitMode: options.angularLinker.jitMode,
        // This is a workaround until https://github.com/angular/angular/issues/42769 is fixed.
        sourceMapping: false,
        logger: createNgtscLogger(options.diagnosticReporter),
        fileSystem: {
          resolve: path.resolve,
          exists: fs.existsSync,
          dirname: path.dirname,
          relative: path.relative,
          readFile: fs.readFileSync,
          // Node.JS types don't overlap the Compiler types.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      }),
    );
  }

  // Applications code ES version can be controlled using TypeScript's `target` option.
  // However, this doesn't effect libraries and hence we use preset-env to downlevel ES features
  // based on the supported browsers in browserslist.
  if (options.supportedBrowsers) {
    presets.push([
      require('@babel/preset-env').default,
      {
        bugfixes: true,
        modules: false,
        targets: options.supportedBrowsers,
        exclude: ['transform-typeof-symbol'],
      },
    ]);
    needRuntimeTransform = true;
  }

  if (options.i18n) {
    const { locale, missingTranslationBehavior, pluginCreators, translation } = options.i18n;
    const i18nPlugins = createI18nPlugins(
      locale,
      translation,
      missingTranslationBehavior || 'ignore',
      options.diagnosticReporter,
      pluginCreators,
    );

    plugins.push(...i18nPlugins);
  }

  if (options.forceAsyncTransformation) {
    // Always transform async/await to support Zone.js
    plugins.push(
      require('@babel/plugin-transform-async-to-generator').default,
      require('@babel/plugin-transform-async-generator-functions').default,
    );
    needRuntimeTransform = true;
  }

  if (options.optimize) {
    const {
      adjustStaticMembers,
      adjustTypeScriptEnums,
      elideAngularMetadata,
      markTopLevelPure,
    } = require('@angular/build/private');
    if (options.optimize.pureTopLevel) {
      plugins.push(markTopLevelPure);
    }

    plugins.push(elideAngularMetadata, adjustTypeScriptEnums, [
      adjustStaticMembers,
      { wrapDecorators: options.optimize.wrapDecorators },
    ]);
  }

  if (options.instrumentCode) {
    plugins.push(require('../plugins/add-code-coverage').default);
  }

  if (needRuntimeTransform) {
    // Babel equivalent to TypeScript's `importHelpers` option
    plugins.push([
      require('@babel/plugin-transform-runtime').default,
      {
        useESModules: true,
        version: require('@babel/runtime/package.json').version,
        absoluteRuntime: path.dirname(require.resolve('@babel/runtime/package.json')),
      },
    ]);
  }

  return { presets, plugins };
}

export async function requiresLinking(path: string, source: string): Promise<boolean> {
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
