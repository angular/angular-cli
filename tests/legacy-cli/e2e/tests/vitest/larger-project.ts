import { ng } from '../../utils/process';
import { applyVitestBuilder } from '../../utils/vitest';
import assert from 'node:assert';
import { installPackage } from '../../utils/packages';
import { exec } from '../../utils/process';

export default async function () {
  await applyVitestBuilder();

  const artifactCount = 100;
  // A new project starts with 1 test file (app.spec.ts)
  // Each generated artifact will add one more test file.
  const initialTestCount = 1;

  // Generate a mix of components, services, and pipes
  for (let i = 0; i < artifactCount; i++) {
    const type = i % 3;
    const name = `test-artifact-${i}`;
    let generateType;

    switch (type) {
      case 0:
        generateType = 'component';
        break;
      case 1:
        generateType = 'service';
        break;
      default:
        generateType = 'pipe';
        break;
    }

    await ng('generate', generateType, name, '--skip-tests=false');
  }

  const totalTests = initialTestCount + artifactCount;
  const expectedMessage = new RegExp(`${totalTests} passed`);

  // Run tests in default (JSDOM) mode
  const { stdout: jsdomStdout } = await ng('test', '--no-watch');
  assert.match(jsdomStdout, expectedMessage, `Expected ${totalTests} tests to pass in JSDOM mode.`);

  // Setup for browser mode
  await installPackage('playwright@1');
  await installPackage('@vitest/browser-playwright@4');
  await exec('npx', 'playwright', 'install', 'chromium', '--only-shell');

  // Run tests in browser mode
  const { stdout: browserStdout } = await ng(
    'test',
    '--no-watch',
    '--browsers',
    'ChromiumHeadless',
  );
  assert.match(
    browserStdout,
    expectedMessage,
    `Expected ${totalTests} tests to pass in browser mode.`,
  );
}
