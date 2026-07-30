import assert from 'node:assert';
import { expectFileToMatch, readFile } from '../../../utils/fs';
import { uninstallPackage } from '../../../utils/packages';
import { ng } from '../../../utils/process';
import { applyVitestBuilder } from '../../../utils/vitest';

export default async function () {
  await applyVitestBuilder();

  try {
    await ng('add', '@vitest/browser-playwright', '--skip-confirmation');

    const { dependencies, devDependencies } = JSON.parse(await readFile('package.json'));
    assert.strictEqual(
      dependencies?.['@vitest/browser-playwright'],
      undefined,
      '@vitest/browser-playwright should not be added to dependencies.',
    );
    assert.ok(
      devDependencies?.['@vitest/browser-playwright'],
      '@vitest/browser-playwright should be added to devDependencies.',
    );
    assert.ok(devDependencies?.playwright, 'playwright should be added to devDependencies.');

    await expectFileToMatch('tsconfig.spec.json', /"vitest\/globals"/);
    await expectFileToMatch('tsconfig.spec.json', /"@vitest\/browser-playwright"/);
  } finally {
    await uninstallPackage('@vitest/browser-playwright');
    await uninstallPackage('playwright');
  }
}
