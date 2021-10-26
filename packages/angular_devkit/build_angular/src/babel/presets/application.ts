/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type {
  DiagnosticHandlingStrategy,
  Diagnostics,
  makeEs2015TranslatePlugin,
  makeEs5TranslatePlugin,
  makeLocalePlugin,
} from '@angular/localize/tools';
import { strict as assert } from 'assert';
import * as fs from 'fs';
import * as path from 'path';

export type DiagnosticReporter = (type: 'error' | 'warning' | 'info', message: string) => void;

/**
 * An interface representing the factory functions for the `@angular/localize` translation Babel plugins.
 * This must be provided for the ESM imports since dynamic imports are required to be asynchronous and
 * Babel presets currently can only be synchronous.
 *
 */
export interface I18nPluginCreators {
  makeEs2015TranslatePlugin: typeof makeEs2015TranslatePlugin;
  makeEs5TranslatePlugin: typeof makeEs5TranslatePlugin;
  makeLocalePlugin: typeof makeLocalePlugin;
}

export interface ApplicationPresetOptions {
  i18n?: {
    locale: string;
    missingTranslationBehavior?: 'error' | 'warning' | 'ignore';
    translation?: unknown;
    pluginCreators?: I18nPluginCreators;
  };

  angularLinker?: {
    shouldLink: boolean;
    jitMode: boolean;
    linkerPluginCreator: typeof import('@angular/compiler-cli/linker/babel').createEs2015LinkerPlugin;
  };

  forceES5?: boolean;
  forceAsyncTransformation?: boolean;
  instrumentCode?: {
    includedBasePath: string;
  };
  optimize?: {
    looseEnums: boolean;
    pureTopLevel: boolean;
    wrapDecorators: boolean;
  };

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
  translation: unknown | undefined,
  missingTranslationBehavior: 'error' | 'warning' | 'ignore',
  diagnosticReporter: DiagnosticReporter | undefined,
  // TODO_ESM: Make `pluginCreators` required once `@angular/localize` is published with the `tools` entry point
  pluginCreators: I18nPluginCreators | undefined,
) {
  const diagnostics = createI18nDiagnostics(diagnosticReporter);
  const plugins = [];

  if (translation) {
    const {
      makeEs2015TranslatePlugin,
      // TODO_ESM: Remove all deep imports once `@angular/localize` is published with the `tools` entry point
    } =
      pluginCreators ??
      require('@angular/localize/src/tools/src/translate/source_files/es2015_translate_plugin');
    plugins.push(
      makeEs2015TranslatePlugin(diagnostics, translation, {
        missingTranslation: missingTranslationBehavior,
      }),
    );

    const {
      makeEs5TranslatePlugin,
      // TODO_ESM: Remove all deep imports once `@angular/localize` is published with the `tools` entry point
    } =
      pluginCreators ??
      require('@angular/localize/src/tools/src/translate/source_files/es5_translate_plugin');
    plugins.push(
      makeEs5TranslatePlugin(diagnostics, translation, {
        missingTranslation: missingTranslationBehavior,
      }),
    );
  }

  const {
    makeLocalePlugin,
    // TODO_ESM: Remove all deep imports once `@angular/localize` is published with the `tools` entry point
  } =
    pluginCreators ??
    require('@angular/localize/src/tools/src/translate/source_files/locale_plugin');
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

  if (options.forceES5) {
    presets.push([
      require('@babel/preset-env').default,
      {
        bugfixes: true,
        modules: false,
        // Comparable behavior to tsconfig target of ES5
        targets: { ie: 9 },
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
      require('@babel/plugin-proposal-async-generator-functions').default,
    );
    needRuntimeTransform = true;
  }

  if (options.optimize) {
    if (options.optimize.pureTopLevel) {
      plugins.push(require('../plugins/pure-toplevel-functions').default);
    }

    plugins.push(
      require('../plugins/elide-angular-metadata').default,
      [
        require('../plugins/adjust-typescript-enums').default,
        { loose: options.optimize.looseEnums },
      ],
      [
        require('../plugins/adjust-static-class-members').default,
        { wrapDecorators: options.optimize.wrapDecorators },
      ],
    );
  }

  if (options.instrumentCode) {
    plugins.push([
      require('babel-plugin-istanbul').default,
      { inputSourceMap: false, cwd: options.instrumentCode.includedBasePath },
    ]);
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
