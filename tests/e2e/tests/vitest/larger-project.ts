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

  await generateArtifactsInBatches(artifactCount);

  const totalTests = initialTestCount + artifactCount;
  const expectedMessage = new RegExp(`${totalTests} passed`);

  // Run tests in default (JSDOM) mode
  const { stdout: jsdomStdout } = await ng('test', '--no-watch');
  assert.match(jsdomStdout, expectedMessage, `Expected ${totalTests} tests to pass in JSDOM mode.`);

  // Setup for browser mode
  await installPackage('playwright@1');
  await installPackage('@vitest/browser-playwright@4');

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

async function generateArtifactsInBatches(artifactCount: number): Promise<void> {
  const BATCH_SIZE = 5;
  let commands: Promise<any>[] = [];

  for (let i = 0; i < artifactCount; i++) {
    const type = i % 3;
    const name = `test-artifact-${i}`;
    let generateType: string;

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

    commands.push(ng('generate', generateType, name, '--skip-tests=false'));

    if (commands.length === BATCH_SIZE || i === artifactCount - 1) {
      await Promise.all(commands);
      commands = [];
    }
  }
}
