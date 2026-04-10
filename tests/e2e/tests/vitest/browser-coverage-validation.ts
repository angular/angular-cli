import assert from 'node:assert/strict';
import path from 'node:path';
import { applyVitestBuilder } from '../../utils/vitest';
import { execAndCaptureError } from '../../utils/process';
import { installPackage } from '../../utils/packages';
import { writeFile } from '../../utils/fs';
import { stripVTControlCharacters } from 'node:util';
import { unlink } from 'node:fs/promises';

export default async function (): Promise<void> {
  await applyVitestBuilder();

  // Install necessary packages to pass the provider check
  await installPackage('playwright@1');
  await installPackage('@vitest/browser-playwright@4');
  await installPackage('@vitest/coverage-v8@4');

  // === Case 1: Browser configured via CLI option ===
  const error1 = await execAndCaptureError('ng', [
    'test',
    '--no-watch',
    '--coverage',
    '--browsers',
    'firefox',
  ]);
  const output1 = stripVTControlCharacters(error1.message);
  assert.match(
    output1,
    /Code coverage is enabled, but the following configured browsers do not support the V8 coverage provider: firefox/,
    'Expected validation error for unsupported browser with coverage (CLI option).',
  );

  const configPath = 'vitest.config.ts';
  const absoluteConfigPath = path.resolve(configPath);

  try {
    // === Case 2: Browser configured via vitest.config.ts (name) ===
    await writeFile(
      configPath,
      `
      import { defineConfig } from 'vitest/config';
      export default defineConfig({
        test: {
          browser: {
            enabled: true,
            name: 'firefox',
            provider: 'playwright',
          },
        },
      });
      `,
    );

    const error2 = await execAndCaptureError('ng', [
      'test',
      '--no-watch',
      '--coverage',
      `--runner-config=${absoluteConfigPath}`,
    ]);
    const output2 = stripVTControlCharacters(error2.message);
    assert.match(
      output2,
      /Code coverage is enabled, but the following configured browsers do not support the V8 coverage provider: firefox/,
      'Expected validation error for unsupported browser with coverage (config name).',
    );

    // === Case 3: Browser configured via vitest.config.ts (instances) ===
    await writeFile(
      configPath,
      `
      import { defineConfig } from 'vitest/config';
      export default defineConfig({
        test: {
          browser: {
            enabled: true,
            provider: 'playwright',
            instances: [{ browser: 'firefox' }],
          } as any,
        },
      });
      `,
    );

    const error3 = await execAndCaptureError('ng', [
      'test',
      '--no-watch',
      '--coverage',
      `--runner-config=${absoluteConfigPath}`,
    ]);
    const output3 = stripVTControlCharacters(error3.message);
    assert.match(
      output3,
      /Code coverage is enabled, but the following configured browsers do not support the V8 coverage provider: firefox/,
      'Expected validation error for unsupported browser with coverage (config instances).',
    );
  } finally {
    // Clean up the config file so it doesn't affect other tests
    try {
      await unlink(configPath);
    } catch {}
  }
}
