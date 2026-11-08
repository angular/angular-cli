/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { join } from 'node:path';
import { getGlobalVariable } from '../../utils/env';
import { appendToFile, replaceInFile, writeFile } from '../../utils/fs';
import { ng } from '../../utils/process';
import { langTranslations, setupI18nConfig } from './setup';

const OUTPUT_RE = /^(?<name>(?:main|vendor|\d+))(?:\.|-)(?<hash>[a-z0-9]+)\.js$/i;

export default async function () {
  // Setup i18n tests and config.
  await setupI18nConfig();

  if (getGlobalVariable('argv')['esbuild']) {
    await checkLocalizedChunkHashes();

    return;
  }

  // Build each locale and record output file hashes
  const hashes = new Map<string, string>();
  await ng('build', '--output-hashing=all', '--configuration=development');
  for (const { lang, outputPath } of langTranslations) {
    for (const entry of fs.readdirSync(outputPath)) {
      const match = entry.match(OUTPUT_RE);
      if (!match?.groups) {
        continue;
      }

      hashes.set(`${lang}/${match.groups.name}`, match.groups.hash);
    }
  }

  // Ensure hashes for output files were recorded
  if (hashes.size === 0) {
    throw new Error('No output entries found.');
  }

  // Alter content of a used translation file
  await appendToFile('src/locale/messages.fr.xlf', '\n');

  // Build each locale and ensure hashes are different
  await ng('build', '--output-hashing=all', '--configuration=development');
  for (const { lang, outputPath } of langTranslations) {
    for (const entry of fs.readdirSync(outputPath)) {
      const match = entry.match(OUTPUT_RE);
      if (!match?.groups) {
        continue;
      }

      const id = `${lang}/${match.groups.name}`;
      const hash = hashes.get(id);
      if (!hash) {
        throw new Error('Unexpected output entry: ' + id);
      }
      if (hash === match.groups!.hash) {
        throw new Error('Hash value did not change for entry: ' + id);
      }

      hashes.delete(id);
    }
  }

  // Check for missing entries in second build
  if (hashes.size > 0) {
    throw new Error('Missing output entries: ' + JSON.stringify(Array.from(hashes.values())));
  }
}

async function checkLocalizedChunkHashes(): Promise<void> {
  await writeFile(
    'src/app/translated.ts',
    "import type {} from '@angular/localize';\nexport const text = $localize`:@@lazyText:Lazy text`;",
  );
  await appendToFile(
    'src/app/app.ts',
    "void import('./translated').then(({ text }) => console.log(text));",
  );
  for (const [locale, translation] of [
    ['de', 'Deutscher Text'],
    ['fr', 'Texte français'],
  ]) {
    await replaceInFile(
      `src/locale/messages.${locale}.xlf`,
      '</body>',
      `<trans-unit id="lazyText"><source>Lazy text</source><target>${translation}</target></trans-unit></body>`,
    );
  }

  const build = () =>
    ng(
      'build',
      '--configuration=production',
      '--output-hashing=all',
      '--named-chunks',
      '--source-map',
      '--subresource-integrity',
    );
  const getFiles = () =>
    langTranslations.map(({ outputPath }) => {
      const files = fs.readdirSync(outputPath);
      const script = (name: string) => {
        const path = files.find((file) => file.startsWith(name + '-') && file.endsWith('.js'));
        assert(path, `Missing ${name} in ${outputPath}`);

        return { path, content: fs.readFileSync(join(outputPath, path), 'utf-8') };
      };

      return {
        main: script('main'),
        translated: script('translated'),
        independent: script('dynamic'),
        polyfills: script('polyfills'),
        index: fs.readFileSync(join(outputPath, 'index.html'), 'utf-8'),
      };
    });

  await build();
  const before = getFiles();

  await replaceInFile('src/locale/messages.fr.xlf', 'Texte français', 'Nouveau texte');
  await build();
  const after = getFiles();

  for (const [i, { lang, outputPath }] of langTranslations.entries()) {
    const previous = before[i];
    const current = after[i];
    assert.deepEqual(current.independent, previous.independent);
    assert.deepEqual(current.polyfills, previous.polyfills);

    if (lang === 'fr') {
      assert.notEqual(current.translated.path, previous.translated.path);
      assert.notEqual(current.main.path, previous.main.path);
      assert(current.translated.content.includes('Nouveau texte'));
    } else {
      assert.deepEqual(current.translated, previous.translated);
      assert.deepEqual(current.main, previous.main);
    }

    assert(current.main.content.includes(`./${current.translated.path}`));
    const mainTag = current.index
      .match(/<script\b[^>]*>/g)
      ?.find((tag) => tag.includes(`src="${current.main.path}"`));
    const integrity = createHash('sha384').update(current.main.content).digest('base64');
    assert(mainTag?.includes(`integrity="sha384-${integrity}"`));
    assert(current.translated.content.includes(`sourceMappingURL=${current.translated.path}.map`));
    assert(fs.existsSync(join(outputPath, current.translated.path + '.map')));
  }
}
