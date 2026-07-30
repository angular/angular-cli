import assert from 'node:assert';
import { expectFileToExist, expectFileToMatch, readFile, rimraf } from '../../../utils/fs';
import { getActivePackageManager, uninstallPackage } from '../../../utils/packages';
import { ng } from '../../../utils/process';

export default async function () {
  // In case a previous test installed tailwindcss, clear it.
  // (we don't clear node module directories between tests)
  // npm does not appear to fully uninstall sometimes
  if (getActivePackageManager() === 'npm') {
    await rimraf('node_modules/tailwindcss');
  }

  try {
    await ng('add', 'tailwindcss', '--skip-confirmation');
    await expectFileToExist('.postcssrc.json');
    await expectFileToMatch('src/styles.css', /@import 'tailwindcss';/);

    const { dependencies, devDependencies } = JSON.parse(await readFile('package.json'));
    assert.strictEqual(
      dependencies?.tailwindcss,
      undefined,
      'tailwindcss should not be added to dependencies.',
    );
    assert.ok(devDependencies?.tailwindcss, 'tailwindcss should be added to devDependencies.');
    assert.ok(
      devDependencies?.['@tailwindcss/postcss'],
      '@tailwindcss/postcss should be added to devDependencies.',
    );
    assert.ok(devDependencies?.postcss, 'postcss should be added to devDependencies.');

    // Ensure the project builds
    await ng('build', '--configuration=development');
  } finally {
    await uninstallPackage('tailwindcss');
    await uninstallPackage('@tailwindcss/postcss');
    await uninstallPackage('postcss');
  }
}
