import { expectFileToExist, expectFileToMatch } from '../../../utils/fs';
import { uninstallPackage } from '../../../utils/packages';
import { ng } from '../../../utils/process';

export default async function () {
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
