import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execWithEnv } from '../../utils/process';

/**
 * AOT builds with chunk optimizer should contain generated component definitions.
 * This is currently testing that the generated code is propagating through the
 * chunk optimization step.
 */
export default async function () {
  await execWithEnv('ng', ['build', '--output-hashing=none'], {
    ...process.env,
    NG_BUILD_OPTIMIZE_CHUNKS: '1',
    NG_BUILD_MANGLE: '0',
  });

  const content = await readFile('dist/test-project/browser/main.js', 'utf-8');
  assert.match(content, /ɵɵdefineComponent/u);
}
