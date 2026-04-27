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
  const { stdout } = await ng(
    'test',
    '--no-watch',
    '--browsers',
    'chromiumHeadless',
    '--coverage',
    '--coverage-reporters=json-summary',
  );

  // Verify that tests passed
  assert.match(stdout, /pass/, 'Expected tests to run successfully.');

  // Verify that coverage files are generated
  const summaryPath = 'coverage/test-project/coverage-summary.json';
  await expectFileToExist(summaryPath);

  const summary = JSON.parse(await readFile(summaryPath));

  // Find the key for app.ts (it might be an absolute path)
  const appFileKey = Object.keys(summary).find((key) => key.endsWith('app.ts'));
  assert.ok(appFileKey, 'Expected coverage summary to contain app.ts.');

  const appCoverage = summary[appFileKey];
  assert.ok(appCoverage.lines.pct > 0, 'Expected lines percentage to be greater than 0.');

  // Also verify that spec files are NOT present in the summary
  const specFileKey = Object.keys(summary).find((key) => key.endsWith('.spec.ts'));
  assert.ok(!specFileKey, 'Expected coverage report to not contain .spec.ts files.');
}
