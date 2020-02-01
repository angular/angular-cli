/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as fs from 'fs';
import { appendToFile } from '../../utils/fs';
import { ng } from '../../utils/process';
import { langTranslations, setupI18nConfig } from './legacy';

const OUTPUT_RE = /^(?<name>(?:main|vendor|\d+)\-(?:es2015|es5))\.(?<hash>[a-z0-9]+)\.js$/i;

export default async function() {
  // Setup i18n tests and config.
  await setupI18nConfig(true);

  // Build each locale and record output file hashes
  const hashes = new Map<string, string>();
  await ng('build', '--output-hashing=all');
  for (const { lang, outputPath } of langTranslations) {
    for (const entry of fs.readdirSync(outputPath)) {
      const match = entry.match(OUTPUT_RE);
      if (!match) {
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
  await ng('build', '--output-hashing=all');
  for (const { lang, outputPath } of langTranslations) {
    for (const entry of fs.readdirSync(outputPath)) {
      const match = entry.match(OUTPUT_RE);
      if (!match) {
        continue;
      }

      const id = `${lang}/${match.groups.name}`;
      const hash = hashes.get(id);
      if (!hash) {
        throw new Error('Unexpected output entry: ' + id);
      }
      if (hash === match.groups.hash) {
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
