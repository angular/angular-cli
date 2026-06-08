import assert from 'node:assert/strict';
import path from 'node:path';
import { writeMultipleFiles } from '../../utils/fs';
import { ng } from '../../utils/process';
import { applyVitestBuilder } from '../../utils/vitest';

export default async function (): Promise<void> {
  await applyVitestBuilder();

  // Create a custom Vitest configuration file.
  const customConfigPath = 'vitest.custom.mjs';
  await writeMultipleFiles({
    [customConfigPath]: `
      import { defineConfig } from 'vitest/config';
      export default defineConfig({
        test: {
          // A unique option to confirm this file is being used.
          passWithNoTests: true,
        },
      });
    `,
  });

  const absoluteConfigPath = path.resolve(customConfigPath);
  const { stdout } = await ng('test', `--runner-config=${absoluteConfigPath}`);

  // Assert that the CLI logs the use of the specified configuration file.
  assert.match(
    stdout,
    /vitest\.custom\.mjs/,
    'Expected a message confirming the use of the custom config file.',
  );
}
