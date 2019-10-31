/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as fs from 'fs';

export type TranslationLoader = (path: string) => { translation: unknown; format: string };

export async function createTranslationLoader(): Promise<TranslationLoader> {
  const parsers = await importParsers();

  return (path: string) => {
    const content = fs.readFileSync(path, 'utf8');

    for (const [format, parser] of Object.entries(parsers)) {
      if (parser.canParse(path, content)) {
        return { format, translation: parser.parse(path, content).translations };
      }
    }

    throw new Error('Unsupported translation file format.');
  };
}

async function importParsers() {
  try {
    // In @angular/localize version 9.0.0-next.15 the parsers were located in the below locations.
    return {
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
    };
  } catch {
    // Prior to @angular/localize version 9.0.0-next.15 the parsers were located in the below locations.
    return {
      json: new (await import(
        // @ts-ignore
        // tslint:disable-next-line:trailing-comma no-implicit-dependencies
        '@angular/localize/src/tools/src/translate/translation_files/translation_parsers/simple_json/simple_json_translation_parser'
      )).SimpleJsonTranslationParser(),
      xlf: new (await import(
        // @ts-ignore
        // tslint:disable-next-line:trailing-comma no-implicit-dependencies
        '@angular/localize/src/tools/src/translate/translation_files/translation_parsers/xliff1/xliff1_translation_parser'
      )).Xliff1TranslationParser(),
      xlf2: new (await import(
        // @ts-ignore
        // tslint:disable-next-line:trailing-comma no-implicit-dependencies
        '@angular/localize/src/tools/src/translate/translation_files/translation_parsers/xliff2/xliff2_translation_parser'
      )).Xliff2TranslationParser(),
    };
  }
}
