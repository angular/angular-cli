import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getGlobalVariable } from '../../utils/env';
import { silentNg } from '../../utils/process';

const OUTPUT_INDEX_PATH = 'dist/test-project/browser/index.html';

export default async function () {
  // Development build
  await silentNg('run', 'test-project:build:development');
  // Output index HTML file should reference main JS file
  const devIndexContent = await readFile(OUTPUT_INDEX_PATH, 'utf-8');
  assert.match(devIndexContent, /main\.js/);

  const usingApplicationBuilder = getGlobalVariable('argv')['esbuild'];

  // Production build
  await silentNg('run', 'test-project:build');
  // Output index HTML file should reference main JS file with hashing
  const prodIndexContent = await readFile(OUTPUT_INDEX_PATH, 'utf-8');
  if (usingApplicationBuilder) {
    // application builder uses an 8 character hash and a dash as a separator
    assert.match(prodIndexContent, /main-[a-zA-Z0-9]{8}\.js/);
  } else {
    // browser builder uses a 16 character hash and a period as a separator
    assert.match(prodIndexContent, /main\.[a-zA-Z0-9]{16}\.js/);
  }
}
