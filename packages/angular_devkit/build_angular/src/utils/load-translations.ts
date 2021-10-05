/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { Diagnostics } from '@angular/localize/tools';
import { createHash } from 'crypto';
import * as fs from 'fs';
import { loadEsmModule } from './load-esm';

export type TranslationLoader = (path: string) => {
  translations: Record<string, import('@angular/localize').ɵParsedTranslation>;
  format: string;
  locale?: string;
  diagnostics: Diagnostics;
  integrity: string;
};

export async function createTranslationLoader(): Promise<TranslationLoader> {
  const { parsers, diagnostics } = await importParsers();

  return (path: string) => {
    const content = fs.readFileSync(path, 'utf8');
    const unusedParsers = new Map();
    for (const [format, parser] of Object.entries(parsers)) {
      const analysis = analyze(parser, path, content);
      if (analysis.canParse) {
        const { locale, translations } = parser.parse(path, content, analysis.hint);
        const integrity = 'sha256-' + createHash('sha256').update(content).digest('base64');

        return { format, locale, translations, diagnostics, integrity };
      } else {
        unusedParsers.set(parser, analysis);
      }
    }

    const messages: string[] = [];
    for (const [parser, analysis] of unusedParsers.entries()) {
      messages.push(analysis.diagnostics.formatDiagnostics(`*** ${parser.constructor.name} ***`));
    }
    throw new Error(
      `Unsupported translation file format in ${path}. The following parsers were tried:\n` +
        messages.join('\n'),
    );
  };

  // TODO: `parser.canParse()` is deprecated; remove this polyfill once we are sure all parsers provide the `parser.analyze()` method.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function analyze(parser: any, path: string, content: string) {
    if (parser.analyze !== undefined) {
      return parser.analyze(path, content);
    } else {
      const hint = parser.canParse(path, content);

      return { canParse: hint !== false, hint, diagnostics };
    }
  }
}

async function importParsers() {
  try {
    // Load ESM `@angular/localize/tools` using the TypeScript dynamic import workaround.
    // Once TypeScript provides support for keeping the dynamic import this workaround can be
    // changed to a direct dynamic import.
    const {
      Diagnostics,
      ArbTranslationParser,
      SimpleJsonTranslationParser,
      Xliff1TranslationParser,
      Xliff2TranslationParser,
      XtbTranslationParser,
    } = await loadEsmModule<typeof import('@angular/localize/tools')>('@angular/localize/tools');

    const diagnostics = new Diagnostics();
    const parsers = {
      arb: new ArbTranslationParser(),
      json: new SimpleJsonTranslationParser(),
      xlf: new Xliff1TranslationParser(),
      xlf2: new Xliff2TranslationParser(),
      // The name ('xmb') needs to match the AOT compiler option
      xmb: new XtbTranslationParser(),
    };

    return { parsers, diagnostics };
  } catch {
    throw new Error(
      `Unable to load translation file parsers. Please ensure '@angular/localize' is installed.`,
    );
  }
}
