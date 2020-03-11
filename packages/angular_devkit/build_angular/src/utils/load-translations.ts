/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { createHash } from 'crypto';
import * as fs from 'fs';

export type TranslationLoader = (
  path: string,
) => {
  translation: unknown;
  format: string;
  // tslint:disable-next-line: no-implicit-dependencies
  diagnostics: import('@angular/localize/src/tools/src/diagnostics').Diagnostics;
  integrity: string;
};

export async function createTranslationLoader(): Promise<TranslationLoader> {
  const { parsers, diagnostics } = await importParsers();

  return (path: string) => {
    const content = fs.readFileSync(path, 'utf8');

    for (const [format, parser] of Object.entries(parsers)) {
      if (parser.canParse(path, content)) {
        const result = parser.parse(path, content);
        const integrity = 'sha256-' + createHash('sha256').update(content).digest('base64');

        return { format, translation: result.translations, diagnostics, integrity };
      }
    }

    throw new Error('Unsupported translation file format.');
  };
}

async function importParsers() {
  try {
    // tslint:disable-next-line: no-implicit-dependencies
    const localizeDiag = await import('@angular/localize/src/tools/src/diagnostics');
    const diagnostics = new localizeDiag.Diagnostics();

    const parsers = {
      json: new (await import(
        // tslint:disable-next-line:trailing-comma no-implicit-dependencies
        '@angular/localize/src/tools/src/translate/translation_files/translation_parsers/simple_json_translation_parser'
      )).SimpleJsonTranslationParser(),
      xlf: new (await import(
        // tslint:disable-next-line:trailing-comma no-implicit-dependencies
        '@angular/localize/src/tools/src/translate/translation_files/translation_parsers/xliff1_translation_parser'
      )).Xliff1TranslationParser(),
      xlf2: new (await import(
        // tslint:disable-next-line:trailing-comma no-implicit-dependencies
        '@angular/localize/src/tools/src/translate/translation_files/translation_parsers/xliff2_translation_parser'
      )).Xliff2TranslationParser(),
      // The name ('xmb') needs to match the AOT compiler option
      xmb: new (await import(
        // tslint:disable-next-line:trailing-comma no-implicit-dependencies
        '@angular/localize/src/tools/src/translate/translation_files/translation_parsers/xtb_translation_parser'
      )).XtbTranslationParser(),
    };

    return { parsers, diagnostics };
  } catch {
    throw new Error(
      `Unable to load translation file parsers. Please ensure '@angular/localize' is installed.`,
    );
  }
}
