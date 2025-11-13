import assert from 'node:assert/strict';
import { writeFile } from '../../utils/fs';
import { installPackage } from '../../utils/packages';
import { exec, ng } from '../../utils/process';
import { applyVitestBuilder } from '../../utils/vitest';

/**
 * Allow `vitest` import in browser mode.
 * @see https://github.com/angular/angular-cli/issues/31745
 */
export default async function (): Promise<void> {
  await applyVitestBuilder();

  await installPackage('playwright@1');
  await installPackage('@vitest/browser-playwright@4');

  await exec('npx', 'playwright', 'install', 'chromium', '--only-shell');

  await writeFile(
    'src/app/app.spec.ts',
    `
    import { test, expect } from 'vitest';

    test('should pass', () => {
      expect(true).toBe(true);
    });
  `,
  );

  const { stdout } = await ng('test', '--browsers', 'ChromiumHeadless');

  assert.match(stdout, /1 passed/, 'Expected 1 tests to pass.');
}
