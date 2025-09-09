import { expectFileToExist, expectFileToMatch, rimraf } from '../../../utils/fs';
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
    await expectFileToMatch('src/styles.css', /@import "tailwindcss";/);
    await expectFileToMatch('package.json', /"tailwindcss":/);
    await expectFileToMatch('package.json', /"@tailwindcss\/postcss":/);
    await expectFileToMatch('package.json', /"postcss":/);

    // Ensure the project builds
    await ng('build', '--configuration=development');
  } finally {
    await uninstallPackage('tailwindcss');
    await uninstallPackage('@tailwindcss/postcss');
    await uninstallPackage('postcss');
  }
}
