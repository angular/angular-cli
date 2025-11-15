import { ng } from '../../utils/process';
import { writeMultipleFiles } from '../../utils/fs';
import { applyVitestBuilder } from '../../utils/vitest';
import assert from 'node:assert';

export default async function () {
  await applyVitestBuilder();

  // Test the boolean `true` usage of `--runner-config`.
  // It should log that it is searching for a config file.
  const { stdout: boolTrueStdout } = await ng('test', '--runner-config');
  assert.match(
    boolTrueStdout,
    /Automatically searching/,
    'Expected an automatic search message for --runner-config',
  );
  assert.match(boolTrueStdout, /1 passed/, 'Expected 1 test to pass with --runner-config');

  // Test the string usage of `--runner-config`.
  // It should log that it is using the specified config file.
  const customConfigPath = 'vitest.custom.mjs';
  await writeMultipleFiles({
    [customConfigPath]: `
      import { defineConfig } from 'vitest/config';
      export default defineConfig({
        test: {

        },
      });
    `,
  });

  const { stdout: stringStdout } = await ng('test', `--runner-config=${customConfigPath}`);
  assert.match(
    stringStdout,
    /vitest\.custom\.mjs/,
    'Expected a message confirming the use of the custom config file.',
  );
  assert.match(stringStdout, /1 passed/, 'Expected all tests to pass with string config.');

  // Test the boolean `false` usage of `--runner-config`.
  // It should not log any messages about searching for or using a config file.
  const { stdout: boolFalseStdout } = await ng('test', '--no-runner-config');
  assert.doesNotMatch(
    boolFalseStdout,
    /Automatically searching/,
    'Should not search for a config with --no-runner-config',
  );
  assert.match(boolFalseStdout, /1 passed/, 'Expected 1 test to pass with --no-runner-config');
}
