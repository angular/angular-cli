/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as fs from 'fs';
import * as path from 'path';

export type DiagnosticReporter = (type: 'error' | 'warning' | 'info', message: string) => void;

/**
 * An interface representing the required exports from the `@angular/localize/tools`
 * entry-point. This must be provided for the ESM imports since dynamic imports are
 * required to be asynchronous and Babel presets currently can only be synchronous.
 *
 * TODO_ESM: Remove all deep imports once `@angular/localize` is published with the `tools` entry point
 */
export interface LocalizeToolExports {
  /* eslint-disable max-len */
  makeEs2015TranslatePlugin: typeof import('@angular/localize/src/tools/src/translate/source_files/es2015_translate_plugin').makeEs2015TranslatePlugin;
  makeEs5TranslatePlugin: typeof import('@angular/localize/src/tools/src/translate/source_files/es5_translate_plugin').makeEs5TranslatePlugin;
  makeLocalePlugin: typeof import('@angular/localize/src/tools/src/translate/source_files/locale_plugin').makeLocalePlugin;
  Diagnostics: typeof import('@angular/localize/src/tools/src/diagnostics').Diagnostics;
  /* eslint-enable max-len */
}

export interface ApplicationPresetOptions {
  i18n?: {
    locale: string;
    missingTranslationBehavior?: 'error' | 'warning' | 'ignore';
    translation?: unknown;
    localizeToolExports?: LocalizeToolExports;
  };

  angularLinker?: {
    shouldLink: boolean;
    jitMode: boolean;
    linkerPluginCreator: typeof import('@angular/compiler-cli/linker/babel').createEs2015LinkerPlugin;
  };

  forceES5?: boolean;
  forceAsyncTransformation?: boolean;

  diagnosticReporter?: DiagnosticReporter;
}

// Extract Logger type from the linker function to avoid deep importing to access the type
type NgtscLogger = Parameters<
  typeof import('@angular/compiler-cli/linker/babel').createEs2015LinkerPlugin
>[0]['logger'];

type I18nDiagnostics = import('@angular/localize/src/tools/src/diagnostics').Diagnostics;
function createI18nDiagnostics(
  reporter: DiagnosticReporter | undefined,
  // TODO_ESM: Make `localizeToolExports` required once `@angular/localize` is published with the `tools` entry point
  localizeToolExports: LocalizeToolExports | undefined,
): I18nDiagnostics {
  // TODO_ESM: Remove all deep imports once `@angular/localize` is published with the `tools` entry point
  const diagnosticsCtor = localizeToolExports
    ? localizeToolExports.Diagnostics
    : require('@angular/localize/src/tools/src/diagnostics').Diagnostics;
  const diagnostics: I18nDiagnostics = new diagnosticsCtor();

  if (!reporter) {
    return diagnostics;
  }

  const baseAdd = diagnostics.add;
  diagnostics.add = function (type, message, ...args) {
    if (type !== 'ignore') {
      baseAdd.call(diagnostics, type, message, ...args);
      reporter(type, message);
    }
  };

  const baseError = diagnostics.error;
  diagnostics.error = function (message, ...args) {
    baseError.call(diagnostics, message, ...args);
    reporter('error', message);
  };

  const baseWarn = diagnostics.warn;
  diagnostics.warn = function (message, ...args) {
    baseWarn.call(diagnostics, message, ...args);
    reporter('warning', message);
  };

  const baseMerge = diagnostics.merge;
  diagnostics.merge = function (other, ...args) {
    baseMerge.call(diagnostics, other, ...args);
    for (const diagnostic of other.messages) {
      reporter(diagnostic.type, diagnostic.message);
    }
  };

  return diagnostics;
}

function createI18nPlugins(
  locale: string,
  translation: unknown | undefined,
  missingTranslationBehavior: 'error' | 'warning' | 'ignore',
  diagnosticReporter: DiagnosticReporter | undefined,
  // TODO_ESM: Make `localizeToolExports` required once `@angular/localize` is published with the `tools` entry point
  localizeToolExports: LocalizeToolExports | undefined,
) {
  const diagnostics = createI18nDiagnostics(diagnosticReporter, localizeToolExports);
  const plugins = [];

  if (translation) {
    const {
      makeEs2015TranslatePlugin,
      // TODO_ESM: Remove all deep imports once `@angular/localize` is published with the `tools` entry point
    } =
      localizeToolExports ??
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
      localizeToolExports ??
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
    localizeToolExports ??
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
    const { locale, missingTranslationBehavior, localizeToolExports, translation } = options.i18n;
    const i18nPlugins = createI18nPlugins(
      locale,
      translation,
      missingTranslationBehavior || 'ignore',
      options.diagnosticReporter,
      localizeToolExports,
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
