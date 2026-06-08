import { ng } from '../../utils/process';
import { applyVitestBuilder } from '../../utils/vitest';
import assert from 'node:assert';
import { installPackage } from '../../utils/packages';
import { updateJsonFile } from '../../utils/project';
import { readFile } from '../../utils/fs';

export default async function () {
  await applyVitestBuilder();
  await installPackage('@vitest/coverage-v8@4');

  // Add coverage and threshold configuration to ensure coverage is calculated.
  // Use the 'json' reporter to get a machine-readable output for assertions.
  await updateJsonFile('angular.json', (json) => {
    const project = Object.values(json['projects'])[0] as any;
    const test = project['architect']['test'];
    test.options = {
      coverageReporters: ['json', 'text'],
      coverageThresholds: {
        // The generated component/service/pipe files are basic
        // A threshold of 75 should be safe.
        statements: 75,
      },
    };
  });

  const artifactCount = 100;
  const initialTestCount = 1;
  const generatedFiles = await generateArtifactsInBatches(artifactCount);

  const totalTests = initialTestCount + artifactCount;
  const expectedMessage = new RegExp(`${totalTests} passed`);
  const coverageJsonPath = 'coverage/test-project/coverage-final.json';

  // Run tests in default (JSDOM) mode with coverage
  const { stdout: jsdomStdout } = await ng('test', '--no-watch', '--coverage');
  assert.match(jsdomStdout, expectedMessage, `Expected ${totalTests} tests to pass in JSDOM mode.`);

  // Assert that every generated file is in the coverage report by reading the JSON output.
  const jsdomSummary = JSON.parse(await readFile(coverageJsonPath));
  const jsdomSummaryKeys = Object.keys(jsdomSummary);
  for (const file of generatedFiles) {
    const found = jsdomSummaryKeys.some((key) => key.endsWith(file));
    assert.ok(found, `Expected ${file} to be in the JSDOM coverage report.`);
  }

  // Setup for browser mode
  await installPackage('playwright@1');
  await installPackage('@vitest/browser-playwright@4');

  // Run tests in browser mode with coverage
  const { stdout: browserStdout } = await ng(
    'test',
    '--no-watch',
    '--coverage',
    '--browsers',
    'ChromiumHeadless',
  );
  assert.match(
    browserStdout,
    expectedMessage,
    `Expected ${totalTests} tests to pass in browser mode.`,
  );

  // Assert that every generated file is in the coverage report for browser mode.
  const browserSummary = JSON.parse(await readFile(coverageJsonPath));
  const browserSummaryKeys = Object.keys(browserSummary);
  for (const file of generatedFiles) {
    const found = browserSummaryKeys.some((key) => key.endsWith(file));
    assert.ok(found, `Expected ${file} to be in the browser coverage report.`);
  }
}

async function generateArtifactsInBatches(artifactCount: number): Promise<string[]> {
  const BATCH_SIZE = 5;
  const generatedFiles: string[] = [];
  let commands: Promise<any>[] = [];

  for (let i = 0; i < artifactCount; i++) {
    const type = i % 3;
    const name = `test-artifact-${i}`;

    let generateType: string;
    let fileSuffix: string;

    switch (type) {
      case 0:
        generateType = 'component';
        fileSuffix = '.ts';
        break;
      case 1:
        generateType = 'service';
        fileSuffix = '.ts';
        break;
      default:
        generateType = 'pipe';
        fileSuffix = '-pipe.ts';
        break;
    }

    commands.push(ng('generate', generateType, name, '--skip-tests=false'));
    generatedFiles.push(`${name}${fileSuffix}`);

    if (commands.length === BATCH_SIZE || i === artifactCount - 1) {
      await Promise.all(commands);
      commands = [];
    }
  }

  return generatedFiles;
}
