/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { getGlobalVariable } from '../../utils/env';
import { replaceInFile } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { langTranslations, setupI18nConfig } from './setup';

const OUTPUT_RE = /^(?<name>(?:main|vendor|\d+))(?:\.|-)(?<hash>[a-z0-9]+)\.js$/i;

export default async function () {
  // Setup i18n tests and config.
  await setupI18nConfig();

  const esbuild = getGlobalVariable('argv')['esbuild'];
  if (esbuild) {
    // Test the polyfills bundle that contains only the CLI-generated locale initialization.
    await updateJsonFile('angular.json', (workspace) => {
      workspace.projects['test-project'].architect['build'].options.polyfills = [];
    });
  }

  // Build each locale and record output file hashes
  const hashes = new Map<string, string>();
  const polyfills = new Map<string, { name: string; content: string }>();
  await ng('build', '--output-hashing=all', '--configuration=development');
  for (const { lang, outputPath } of langTranslations) {
    for (const entry of readdirSync(outputPath)) {
      if (esbuild && /^polyfills-[a-z0-9]+\.js$/i.test(entry)) {
        polyfills.set(lang, {
          name: entry,
          content: readFileSync(`${outputPath}/${entry}`, 'utf-8'),
        });
      }

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

  if (esbuild) {
    assert.equal(polyfills.size, langTranslations.length);
    assert.equal(new Set(Array.from(polyfills.values(), ({ name }) => name)).size, 1);
  }

  // Change a translated message without changing any application source.
  await replaceInFile('src/locale/messages.fr.xlf', 'Bonjour', 'Salut');

  // Build each locale and ensure hashes are different
  await ng('build', '--output-hashing=all', '--configuration=development');
  for (const { lang, outputPath } of langTranslations) {
    const localePolyfills = polyfills.get(lang);
    if (localePolyfills) {
      assert.equal(
        readFileSync(`${outputPath}/${localePolyfills.name}`, 'utf-8'),
        localePolyfills.content,
        `Expected the generated polyfills to stay cacheable for ${lang}.`,
      );
    }

    for (const entry of readdirSync(outputPath)) {
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
