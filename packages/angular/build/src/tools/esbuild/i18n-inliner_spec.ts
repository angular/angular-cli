/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { ɵParsedTranslation } from '@angular/localize';
import { transform } from 'esbuild';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { initializeHash } from '../../utils/hash';
import { type BuildOutputFile, BuildOutputFileType, createOutputFile } from './bundler-files';
import { I18nInliner } from './i18n-inliner';

/**
 * A module that uses a `$localize` message with an explicit message identifier so that the
 * translations for a test can be keyed by a known name.
 */
const GREETING_SOURCE = 'export const greeting = $localize`:@@greeting:Hello`;\n';

/**
 * Creates the parsed translation form that `@angular/localize` expects.
 */
function parsedTranslation(
  parts: string[],
  placeholderNames: string[] = [],
  text?: string,
): ɵParsedTranslation {
  return {
    messageParts: Object.assign([...parts], { raw: [...parts] }),
    placeholderNames,
    text: text ?? parts.join(''),
  };
}

function translationFor(message: string): ɵParsedTranslation {
  return parsedTranslation([message], [], message);
}

function browserFile(path: string, contents: string): BuildOutputFile {
  return createOutputFile(path, contents, BuildOutputFileType.Browser);
}

function findFile(outputFiles: BuildOutputFile[], path: string): BuildOutputFile {
  const file = outputFiles.find((output) => output.path === path);
  if (!file) {
    throw new Error(`Expected output files to contain '${path}'.`);
  }

  return file;
}

describe('I18nInliner', () => {
  let inliner: I18nInliner | undefined;

  beforeAll(async () => {
    await initializeHash();
  });

  // A single thread is used throughout so that every file of every locale is inlined by the same
  // Worker. Any translation state that a Worker retains between requests is then observable.
  function createInliner(outputFiles: BuildOutputFile[]): I18nInliner {
    inliner = new I18nInliner({ missingTranslation: 'warning', outputFiles }, 1);

    return inliner;
  }

  beforeAll(async () => {
    await initializeHash();
  });

  afterEach(async () => {
    await inliner?.close();
    inliner = undefined;
  });

  it('inlines the translations of a locale', async () => {
    const { outputFiles, errors, warnings } = await createInliner([
      browserFile('main.js', GREETING_SOURCE),
    ]).inlineForLocale('fr', { greeting: translationFor('Bonjour') });

    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
    expect(findFile(outputFiles, 'main.js').text).toContain('"Bonjour"');
    expect(findFile(outputFiles, 'main.js').text).not.toContain('$localize');
  });

  it('inlines the translations of each locale when several are inlined in sequence', async () => {
    const localeInliner = createInliner([browserFile('main.js', GREETING_SOURCE)]);

    const french = await localeInliner.inlineForLocale('fr', {
      greeting: translationFor('Bonjour'),
    });
    const german = await localeInliner.inlineForLocale('de', { greeting: translationFor('Hallo') });
    // Repeats the first locale to cover a locale being inlined again after another has been.
    const frenchAgain = await localeInliner.inlineForLocale('fr', {
      greeting: translationFor('Bonjour'),
    });

    expect(findFile(french.outputFiles, 'main.js').text).toContain('"Bonjour"');
    expect(findFile(german.outputFiles, 'main.js').text).toContain('"Hallo"');
    expect(findFile(frenchAgain.outputFiles, 'main.js').text).toContain('"Bonjour"');
  });

  it('inlines the translations of a locale into every file that uses them', async () => {
    const { outputFiles } = await createInliner([
      browserFile('main.js', GREETING_SOURCE),
      browserFile('chunk.js', GREETING_SOURCE),
    ]).inlineForLocale('fr', { greeting: translationFor('Bonjour') });

    expect(findFile(outputFiles, 'main.js').text).toContain('"Bonjour"');
    expect(findFile(outputFiles, 'chunk.js').text).toContain('"Bonjour"');
  });

  it('retains the original messages for a locale without translations', async () => {
    const { outputFiles, errors, warnings } = await createInliner([
      browserFile('main.js', GREETING_SOURCE),
    ]).inlineForLocale('en-US', undefined);

    // A locale without translations is the source locale, so its messages are not missing.
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
    expect(findFile(outputFiles, 'main.js').text).toContain('"Hello"');
  });

  it('warns and retains the original message when a locale is missing a translation', async () => {
    const { outputFiles, errors, warnings } = await createInliner([
      browserFile('main.js', GREETING_SOURCE),
    ]).inlineForLocale('fr', { unrelated: translationFor('Sans rapport') });

    expect(errors).toEqual([]);
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain('greeting');
    expect(findFile(outputFiles, 'main.js').text).toContain('"Hello"');
  });

  it('replaces the locale placeholder with the locale being inlined', async () => {
    // The placeholder is only inlined for files that use `$localize`, which is where the build
    // inserts it, so the message is present alongside it here.
    const { outputFiles } = await createInliner([
      browserFile('main.js', `export const locale = "___NG_LOCALE_INSERT___";\n${GREETING_SOURCE}`),
    ]).inlineForLocale('fr', { greeting: translationFor('Bonjour') });

    expect(findFile(outputFiles, 'main.js').text).toContain('"fr"');
    expect(findFile(outputFiles, 'main.js').text).not.toContain('___NG_LOCALE_INSERT___');
  });

  it('remaps the source map of a file it modifies', async () => {
    // esbuild provides a map from the emitted code back to an original file, matching what the
    // inliner receives during a build.
    const { code, map } = await transform(GREETING_SOURCE, {
      sourcefile: 'greeting.ts',
      loader: 'ts',
      sourcemap: 'external',
    });

    const { outputFiles } = await createInliner([
      browserFile('main.js', code),
      browserFile('main.js.map', map),
    ]).inlineForLocale('fr', { greeting: translationFor('Bonjour') });

    const outputMap = JSON.parse(findFile(outputFiles, 'main.js.map').text) as {
      version: number;
      sources: string[];
      mappings: string;
    };

    expect(outputMap.version).toBe(3);
    // The map must still resolve to the original file rather than to the inliner's input.
    expect(outputMap.sources).toContain('greeting.ts');
    expect(outputMap.mappings.length).toBeGreaterThan(0);
  });

  describe('inlineTemplateUpdate', () => {
    it('inlines the translations of a locale into a template update', async () => {
      const { code, errors, warnings } = await createInliner([]).inlineTemplateUpdate(
        'fr',
        { greeting: translationFor('Bonjour') },
        GREETING_SOURCE,
        'template-id',
      );

      expect(errors).toEqual([]);
      expect(warnings).toEqual([]);
      expect(code).toContain('"Bonjour"');
      expect(code).not.toContain('$localize');
    });

    it('retains the original messages for a locale without translations', async () => {
      const { code, errors, warnings } = await createInliner([]).inlineTemplateUpdate(
        'en-US',
        undefined,
        GREETING_SOURCE,
        'template-id',
      );

      expect(errors).toEqual([]);
      expect(warnings).toEqual([]);
      expect(code).toContain('"Hello"');
    });

    it('returns the code untouched when it has no localize calls', async () => {
      const source = 'export const answer = 42;\n';
      const { code } = await createInliner([]).inlineTemplateUpdate(
        'fr',
        { greeting: translationFor('Bonjour') },
        source,
        'template-id',
      );

      expect(code).toBe(source);
    });
  });

  it('safely inlines translations containing special characters, quotes, and newlines', async () => {
    const { outputFiles, errors, warnings } = await createInliner([
      browserFile('main.js', GREETING_SOURCE),
    ]).inlineForLocale('fr', {
      greeting: translationFor('Bonjour "mon ami" \\ \' \n <script>alert(1)</script>'),
    });

    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
    expect(findFile(outputFiles, 'main.js').text).toBe(
      'export const greeting = "Bonjour \\"mon ami\\" \\\\ \' \\n <script>alert(1)</script>";\n',
    );
  });

  it('inlines translations containing placeholders', async () => {
    const source = 'export const welcome = (name) => $localize`:@@welcome:Hello ${name}!`;\n';
    const { outputFiles, errors, warnings } = await createInliner([
      browserFile('main.js', source),
    ]).inlineForLocale('fr', {
      welcome: parsedTranslation(['Bonjour ', ' !'], ['PH'], 'Bonjour {$PH} !'),
    });

    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
    expect(findFile(outputFiles, 'main.js').text).toBe(
      'export const welcome = (name) => `Bonjour ${name} !`;\n',
    );
  });

  it('inlines multiple localize calls within the same file', async () => {
    const source =
      'export const a = $localize`:@@greeting:Hello`;\nexport const b = $localize`:@@farewell:Goodbye`;\n';
    const { outputFiles, errors, warnings } = await createInliner([
      browserFile('main.js', source),
    ]).inlineForLocale('fr', {
      greeting: translationFor('Bonjour'),
      farewell: translationFor('Au revoir'),
    });

    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
    expect(findFile(outputFiles, 'main.js').text).toBe(
      'export const a = "Bonjour";\nexport const b = "Au revoir";\n',
    );
  });

  it('inlines translations across multiple files using multiple worker threads in parallel', async () => {
    inliner = new I18nInliner(
      {
        missingTranslation: 'warning',
        outputFiles: [
          browserFile('main.js', GREETING_SOURCE),
          browserFile('chunk1.js', GREETING_SOURCE),
          browserFile('chunk2.js', GREETING_SOURCE),
          browserFile('chunk3.js', GREETING_SOURCE),
        ],
      },
      4,
    );

    const { outputFiles, errors, warnings } = await inliner.inlineForLocale('fr', {
      greeting: translationFor('Bonjour'),
    });

    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
    for (const name of ['main.js', 'chunk1.js', 'chunk2.js', 'chunk3.js']) {
      expect(findFile(outputFiles, name).text).toBe('export const greeting = "Bonjour";\n');
    }
  });

  it('leaves files without localize calls unmodified', async () => {
    const { outputFiles } = await createInliner([
      browserFile('main.js', GREETING_SOURCE),
      browserFile('other.js', 'export const answer = 42;\n'),
    ]).inlineForLocale('fr', { greeting: translationFor('Bonjour') });

    expect(findFile(outputFiles, 'other.js').text).toBe('export const answer = 42;\n');
  });

  it('inlines nested $localize calls in post-order', async () => {
    const source =
      'export const msg = $localize`:@@outer:You selected ${$localize`:@@inner:Apple`} for delivery.`;\n';
    const { outputFiles, errors, warnings } = await createInliner([
      browserFile('main.js', source),
    ]).inlineForLocale('fr', {
      inner: translationFor('Pomme'),
      outer: parsedTranslation(
        ['Vous avez sélectionné ', ' pour la livraison.'],
        ['PH'],
        'Vous avez sélectionné {$PH} pour la livraison.',
      ),
    });

    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
    expect(findFile(outputFiles, 'main.js').text).toBe(
      'export const msg = `Vous avez sélectionné ${"Pomme"} pour la livraison.`;\n',
    );
  });

  it('reports an error diagnostic when a $localize template has a malformed escape sequence', async () => {
    const source = 'export const msg = $localize`:@@id:\\unicode:`;\n';
    const { errors } = await createInliner([browserFile('main.js', source)]).inlineForLocale(
      'fr',
      {},
    );

    expect(errors).toEqual([
      'Malformed escape sequence in $localize template literal in file "main.js".',
    ]);
  });

  it('inlines the translations of a locale when translationIntegrity is provided', async () => {
    const { outputFiles, errors, warnings } = await createInliner([
      browserFile('main.js', GREETING_SOURCE),
    ]).inlineForLocale('fr', { greeting: translationFor('Bonjour') }, 'sha256-test-integrity');

    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
    expect(findFile(outputFiles, 'main.js').text).toContain('"Bonjour"');
    expect(findFile(outputFiles, 'main.js').text).not.toContain('$localize');
  });

  it('inlines the translations of a locale when localizeVersion is configured in options', async () => {
    inliner = new I18nInliner(
      {
        missingTranslation: 'warning',
        outputFiles: [browserFile('main.js', GREETING_SOURCE)],
        localizeVersion: '20.2.0',
      },
      1,
    );

    const { outputFiles, errors, warnings } = await inliner.inlineForLocale(
      'fr',
      { greeting: translationFor('Bonjour') },
      'sha256-test-integrity',
    );

    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
    expect(findFile(outputFiles, 'main.js').text).toContain('"Bonjour"');
    expect(findFile(outputFiles, 'main.js').text).not.toContain('$localize');
  });

  it('inlines multiple locales in parallel via inlineAll', async () => {
    const localeInliner = createInliner([
      browserFile('main.js', GREETING_SOURCE),
      browserFile('chunk.js', GREETING_SOURCE),
      browserFile('other.js', 'export const answer = 42;\n'),
    ]);

    const results = await localeInliner.inlineAll([
      { locale: 'fr', translation: { greeting: translationFor('Bonjour') } },
      { locale: 'de', translation: { greeting: translationFor('Hallo') } },
      { locale: 'es', translation: { greeting: translationFor('Hola') } },
      { locale: 'en-US', translation: undefined },
    ]);

    expect(results.size).toBe(4);

    const fr = results.get('fr');
    expect(fr).toBeDefined();
    expect(fr?.errors).toEqual([]);
    expect(fr?.warnings).toEqual([]);
    expect(findFile(fr?.outputFiles ?? [], 'main.js').text).toContain('"Bonjour"');
    expect(findFile(fr?.outputFiles ?? [], 'chunk.js').text).toContain('"Bonjour"');
    expect(findFile(fr?.outputFiles ?? [], 'other.js').text).toBe('export const answer = 42;\n');

    const de = results.get('de');
    expect(de).toBeDefined();
    expect(de?.errors).toEqual([]);
    expect(findFile(de?.outputFiles ?? [], 'main.js').text).toContain('"Hallo"');

    const es = results.get('es');
    expect(es).toBeDefined();
    expect(es?.errors).toEqual([]);
    expect(findFile(es?.outputFiles ?? [], 'main.js').text).toContain('"Hola"');

    const en = results.get('en-US');
    expect(en).toBeDefined();
    expect(en?.errors).toEqual([]);
    expect(findFile(en?.outputFiles ?? [], 'main.js').text).toContain('"Hello"');
  });

  it('inlines multiple locales with sourcemaps in parallel via inlineAll', async () => {
    const { code, map } = await transform(GREETING_SOURCE, {
      sourcefile: 'greeting.ts',
      loader: 'ts',
      sourcemap: 'external',
    });

    const localeInliner = createInliner([
      browserFile('main.js', code),
      browserFile('main.js.map', map),
      browserFile('other.js', 'export const answer = 42;\n'),
    ]);

    const results = await localeInliner.inlineAll([
      { locale: 'fr', translation: { greeting: translationFor('Bonjour') } },
      { locale: 'de', translation: { greeting: translationFor('Hallo') } },
      { locale: 'en-US', translation: undefined },
    ]);

    expect(results.size).toBe(3);

    for (const [locale, greeting] of [
      ['fr', 'Bonjour'],
      ['de', 'Hallo'],
      ['en-US', 'Hello'],
    ] as const) {
      const localeResult = results.get(locale);
      expect(localeResult).toBeDefined();
      expect(localeResult?.errors).toEqual([]);
      expect(localeResult?.warnings).toEqual([]);

      const mainJs = findFile(localeResult?.outputFiles ?? [], 'main.js');
      expect(mainJs.text).toContain(`"${greeting}"`);

      const mainMap = findFile(localeResult?.outputFiles ?? [], 'main.js.map');
      const outputMap = JSON.parse(mainMap.text) as {
        version: number;
        sources: string[];
        mappings: string;
      };
      expect(outputMap.version).toBe(3);
      expect(outputMap.sources).toContain('greeting.ts');
      expect(outputMap.mappings.length).toBeGreaterThan(0);

      const otherJs = findFile(localeResult?.outputFiles ?? [], 'other.js');
      expect(otherJs.text).toBe('export const answer = 42;\n');
    }
  });

  it('inlines multiple locales with partial cache hits and misses via inlineAll', async () => {
    const cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), 'i18n-cache-test-'));

    try {
      const initialInliner = new I18nInliner(
        {
          missingTranslation: 'warning',
          outputFiles: [
            browserFile('main.js', GREETING_SOURCE),
            browserFile('other.js', 'export const answer = 42;\n'),
          ],
          persistentCachePath: cacheDir,
        },
        2,
      );

      // Pre-populate cache for 'fr'
      await initialInliner.inlineForLocale(
        'fr',
        { greeting: translationFor('Bonjour') },
        'integrity-fr-1',
      );
      await initialInliner.close();

      // Create new inliner with same cache path, inlining cached 'fr' alongside uncached 'de' and 'es'
      inliner = new I18nInliner(
        {
          missingTranslation: 'warning',
          outputFiles: [
            browserFile('main.js', GREETING_SOURCE),
            browserFile('other.js', 'export const answer = 42;\n'),
          ],
          persistentCachePath: cacheDir,
        },
        2,
      );

      const results = await inliner.inlineAll([
        {
          locale: 'fr',
          translation: { greeting: translationFor('Bonjour') },
          translationIntegrity: 'integrity-fr-1',
        },
        {
          locale: 'de',
          translation: { greeting: translationFor('Hallo') },
          translationIntegrity: 'integrity-de-1',
        },
        {
          locale: 'es',
          translation: { greeting: translationFor('Hola') },
          translationIntegrity: 'integrity-es-1',
        },
      ]);

      expect(results.size).toBe(3);

      const fr = results.get('fr');
      expect(fr?.errors).toEqual([]);
      expect(findFile(fr?.outputFiles ?? [], 'main.js').text).toContain('"Bonjour"');
      expect(findFile(fr?.outputFiles ?? [], 'other.js').text).toBe('export const answer = 42;\n');

      const de = results.get('de');
      expect(de?.errors).toEqual([]);
      expect(findFile(de?.outputFiles ?? [], 'main.js').text).toContain('"Hallo"');

      const es = results.get('es');
      expect(es?.errors).toEqual([]);
      expect(findFile(es?.outputFiles ?? [], 'main.js').text).toContain('"Hola"');

      // Verify deterministic file order matching input order
      for (const localeResult of results.values()) {
        expect(localeResult.outputFiles.map((f) => f.path)).toEqual(['main.js', 'other.js']);
      }
    } finally {
      await fs.rm(cacheDir, { recursive: true, force: true });
    }
  });

  it('inlines across sliding windows when locale count exceeds window size', async () => {
    const locales = Array.from({ length: 20 }, (_, i) => ({
      locale: `locale-${i}`,
      translation: { greeting: translationFor(`Hello ${i}`) },
    }));

    const inliner = new I18nInliner(
      {
        missingTranslation: 'warning',
        outputFiles: [browserFile('main.js', GREETING_SOURCE)],
      },
      2,
    );

    const results = await inliner.inlineAll(locales);

    expect(results.size).toBe(20);
    for (let i = 0; i < 20; i++) {
      const localeResult = results.get(`locale-${i}`);
      expect(localeResult?.errors).toEqual([]);
      expect(findFile(localeResult?.outputFiles ?? [], 'main.js').text).toContain(`"Hello ${i}"`);
    }
  });

  it('injects locale data alongside ___NG_LOCALE_INSERT___ for non-English locales', async () => {
    const source = `(globalThis.$localize ??= {}).locale = "___NG_LOCALE_INSERT___";\n${GREETING_SOURCE}`;
    const localeInliner = createInliner([browserFile('polyfills.js', source)]);

    const results = await localeInliner.inlineAll([
      { locale: 'fr', translation: { greeting: translationFor('Bonjour') } },
      { locale: 'en-US', translation: undefined },
    ]);

    const fr = results.get('fr');
    expect(fr?.errors).toEqual([]);
    const frPolyfills = findFile(fr?.outputFiles ?? [], 'polyfills.js').text;
    expect(frPolyfills).toContain('(globalThis.$localize ??= {}).locale = "fr";');
    expect(frPolyfills).toContain('ng.common.locales');

    const en = results.get('en-US');
    expect(en?.errors).toEqual([]);
    const enPolyfills = findFile(en?.outputFiles ?? [], 'polyfills.js').text;
    expect(enPolyfills).toContain('(globalThis.$localize ??= {}).locale = "en-US";');
    expect(enPolyfills).not.toContain('ng.common.locales');
  });

  it('warns and uses parent locale data when a subtag locale is not directly available', async () => {
    const source = `(globalThis.$localize ??= {}).locale = "___NG_LOCALE_INSERT___";\n${GREETING_SOURCE}`;
    const localeInliner = createInliner([browserFile('polyfills.js', source)]);

    const results = await localeInliner.inlineAll([
      { locale: 'fr-ZZ', translation: { greeting: translationFor('Bonjour') } },
    ]);

    const frZZ = results.get('fr-ZZ');
    expect(frZZ?.errors).toEqual([]);
    expect(frZZ?.warnings).toEqual([
      "Locale data for 'fr-ZZ' cannot be found. Using locale data for 'fr'.",
    ]);
    const polyfills = findFile(frZZ?.outputFiles ?? [], 'polyfills.js').text;
    expect(polyfills).toContain('(globalThis.$localize ??= {}).locale = "fr-ZZ";');
    expect(polyfills).toContain('ng.common.locales');
  });

  it('warns and includes no locale data when locale data cannot be found', async () => {
    const source = `(globalThis.$localize ??= {}).locale = "___NG_LOCALE_INSERT___";\n${GREETING_SOURCE}`;
    const localeInliner = createInliner([browserFile('polyfills.js', source)]);

    const results = await localeInliner.inlineAll([
      { locale: 'xx-YY', translation: { greeting: translationFor('Test') } },
    ]);

    const xxYY = results.get('xx-YY');
    expect(xxYY?.errors).toEqual([]);
    expect(xxYY?.warnings).toEqual([
      "Locale data for 'xx-YY' cannot be found. No locale data will be included for this locale.",
    ]);
    const polyfills = findFile(xxYY?.outputFiles ?? [], 'polyfills.js').text;
    expect(polyfills).toContain('(globalThis.$localize ??= {}).locale = "xx-YY";');
    expect(polyfills).not.toContain('ng.common.locales');
  });

  it('reports an error diagnostic when an invalid or unsupported locale is provided', async () => {
    const source = `(globalThis.$localize ??= {}).locale = "___NG_LOCALE_INSERT___";\n${GREETING_SOURCE}`;
    const localeInliner = createInliner([browserFile('polyfills.js', source)]);

    const results = await localeInliner.inlineAll([
      { locale: 'invalid locale tag', translation: { greeting: translationFor('Test') } },
    ]);

    const invalid = results.get('invalid locale tag');
    expect(invalid?.errors).toEqual([
      'Invalid or unsupported locale provided in configuration: "invalid locale tag"',
    ]);
  });

  it('injects locale data script only once when multiple ___NG_LOCALE_INSERT___ sites are present', async () => {
    const source =
      `(globalThis.$localize ??= {}).locale = "___NG_LOCALE_INSERT___";\n` +
      `const secondary = "___NG_LOCALE_INSERT___";\n${GREETING_SOURCE}`;
    const localeInliner = createInliner([browserFile('polyfills.js', source)]);

    const results = await localeInliner.inlineAll([
      { locale: 'fr', translation: { greeting: translationFor('Bonjour') } },
    ]);

    const fr = results.get('fr');
    expect(fr?.errors).toEqual([]);
    const frPolyfills = findFile(fr?.outputFiles ?? [], 'polyfills.js').text;
    expect(frPolyfills).toContain('(globalThis.$localize ??= {}).locale = "fr";');
    expect(frPolyfills).toContain('const secondary = "fr";');

    const iifeMatches = frPolyfills.match(/function\s*\(global/g);
    expect(iifeMatches?.length).toBe(1);
  });
});
