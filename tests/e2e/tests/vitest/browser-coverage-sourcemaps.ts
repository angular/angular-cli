import assert from 'node:assert/strict';
import { applyVitestBuilder } from '../../utils/vitest';
import { ng } from '../../utils/process';
import { installPackage } from '../../utils/packages';
import { expectFileToExist, readFile } from '../../utils/fs';

export default async function (): Promise<void> {
  await applyVitestBuilder();
  await installPackage('playwright@1');
  await installPackage('@vitest/browser-playwright@4');
  await installPackage('@vitest/coverage-v8@4');

  // Run tests with coverage in browser mode.
  // We use the default passing tests generated for the project.
  const { stdout } = await ng('test', '--no-watch', '--browsers', 'chromiumHeadless', '--coverage');

  // Verify that tests passed
  assert.match(stdout, /pass/, 'Expected tests to run successfully.');

  // Verify that coverage files are generated
  const coverageJsonPath = 'coverage/test-project/coverage-final.json';
  await expectFileToExist(coverageJsonPath);

  const coverageContent = await readFile(coverageJsonPath);
  assert.match(coverageContent, /app\.ts/, 'Expected coverage report to contain app.ts.');
  assert.doesNotMatch(
    coverageContent,
    /\.spec\.ts/,
    'Expected coverage report to not contain .spec.ts files.',
  );
}
