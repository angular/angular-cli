import assert from 'node:assert/strict';
import { applyVitestBuilder } from '../../utils/vitest';
import { ng, noSilentNg } from '../../utils/process';
import { installPackage } from '../../utils/packages';
import { writeFile } from '../../utils/fs';
import { stripVTControlCharacters } from 'node:util';

export default async function (): Promise<void> {
  await applyVitestBuilder();
  await installPackage('playwright@1');
  await installPackage('@vitest/browser-playwright@4');
  await ng('generate', 'component', 'my-comp');

  // Add a failing test to verify source map support
  await writeFile(
    'src/app/failing.spec.ts',
    `
      describe('Failing Test', () => {
        it('should fail', () => {
          expect(true).toBe(false);
        });
      });
    `,
  );

  try {
    await noSilentNg('test', '--no-watch', '--browsers', 'chromiumHeadless');
    throw new Error('Expected "ng test" to fail.');
  } catch (error: any) {
    const stdout = stripVTControlCharacters(error.stdout || error.message);
    // We expect the failure from failing.spec.ts
    assert.match(stdout, /1 failed/, 'Expected 1 test to fail.');
    // Check that the stack trace points to the correct file
    assert.match(
      stdout,
      /\bsrc[\/\\]app[\/\\]failing\.spec\.ts:4:\d+/,
      'Expected stack trace to point to the source file.',
    );
  }
}
