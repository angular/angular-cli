import assert from 'node:assert/strict';
import { applyVitestBuilder } from '../../utils/vitest';
import { ng } from '../../utils/process';
import { installPackage } from '../../utils/packages';
import { writeFile } from '../../utils/fs';

export default async function (): Promise<void> {
  await applyVitestBuilder();
  await installPackage('playwright@1');
  await installPackage('@vitest/browser-playwright@4');
  await ng('generate', 'component', 'my-comp');

  // Create vitest-base.config.ts
  await writeFile(
    'vitest-base.config.ts',
    `
      import { defineConfig } from 'vitest/config';
      import { playwright } from '@vitest/browser-playwright';

      export default defineConfig({
        test: {
          browser: {
            enabled: true,
            provider: playwright({launchOptions: {executablePath: process.env['CHROME_BIN']}}),
            instances: [
              { browser: 'chromium' },
            ],
            headless: true,
          },
        },
      });
    `,
  );

  // Create a spec file that asserts browser environment
  await writeFile(
    'src/browser.spec.ts',
    `
      describe('Browser Environment Check', () => {
        it('should be running in Chromium', () => {
          const ua = navigator.userAgent;
          // Fail the test if it's not Chrome/Chromium
          if (!ua.includes('Chrome') && !ua.includes('Chromium')) {
            throw new Error('Expected to be running in Chrome/Chromium, but User Agent is: ' + ua);
          }
        });
      });
    `,
  );

  const { stdout } = await ng('test', '--no-watch', '--runner-config');

  assert.match(stdout, /3 passed/, 'Expected 3 tests to pass.');
}
