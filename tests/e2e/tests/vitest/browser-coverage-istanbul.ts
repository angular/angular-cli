import { ng } from '../../utils/process';
import { applyVitestBuilder } from '../../utils/vitest';
import assert from 'node:assert';
import { expectFileToExist, readFile } from '../../utils/fs';
import { updateJsonFile } from '../../utils/project';

export default async function (): Promise<void> {
  // Install ONLY Istanbul coverage package.
  // This will trigger the auto-detection logic to use Istanbul even for Node tests.
  await applyVitestBuilder({
    coverageIstanbul: true,
  });

  // Use the 'json' reporter to get a machine-readable output for assertions.
  await updateJsonFile('angular.json', (json) => {
    const project = Object.values(json['projects'])[0] as any;
    const test = project['architect']['test'];
    test.options = {
      coverageReporters: ['json', 'text'],
    };
  });

  // Run tests with coverage (defaults to Node/jsdom environment)
  const { stdout } = await ng('test', '--no-watch', '--coverage');

  // Verify that tests passed
  assert.match(stdout, /1 passed/, 'Expected tests to run successfully.');

  // Verify that coverage files are generated
  const coverageJsonPath = 'coverage/test-project/coverage-final.json';
  await expectFileToExist(coverageJsonPath);

  const coverageSummary = JSON.parse(await readFile(coverageJsonPath));
  assert.ok(Object.keys(coverageSummary).length > 0, 'Expected coverage report to not be empty.');
}
