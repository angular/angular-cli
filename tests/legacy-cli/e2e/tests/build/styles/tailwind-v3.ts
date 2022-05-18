import { deleteFile, expectFileToMatch, writeFile } from '../../../utils/fs';
import { installPackage, uninstallPackage } from '../../../utils/packages';
import { ng, silentExec } from '../../../utils/process';
import { expectToFail } from '../../../utils/utils';

export default async function () {
  // Temporarily turn off caching until the build cache accounts for the presence of tailwind
  // and its configuration file. Otherwise cached builds without tailwind will cause test failures.
  await ng('cache', 'off');

  // Create configuration file
  await silentExec('npx', 'tailwindcss@3', 'init');

  // Add Tailwind directives to a component style
  await writeFile('src/app/app.component.css', '@tailwind base; @tailwind components;');

  // Add Tailwind directives to a global style
  await writeFile('src/styles.css', '@tailwind base; @tailwind components;');

  // Ensure installation warning is present
  const { stderr } = await ng('build', '--configuration=development');
  if (!stderr.includes("To enable Tailwind CSS, please install the 'tailwindcss' package.")) {
    throw new Error('Expected tailwind installation warning');
  }

  // Tailwind directives should be unprocessed with missing package
  await expectFileToMatch('dist/test-project/styles.css', '@tailwind base; @tailwind components;');
  await expectFileToMatch('dist/test-project/main.js', '@tailwind base; @tailwind components;');

  // Install Tailwind
  await installPackage('tailwindcss@3');

  // Build should succeed and process Tailwind directives
  await ng('build', '--configuration=development');

  // Check for Tailwind output
  await expectFileToMatch('dist/test-project/styles.css', /::placeholder/);
  await expectFileToMatch('dist/test-project/main.js', /::placeholder/);
  await expectToFail(() =>
    expectFileToMatch('dist/test-project/styles.css', '@tailwind base; @tailwind components;'),
  );
  await expectToFail(() =>
    expectFileToMatch('dist/test-project/main.js', '@tailwind base; @tailwind components;'),
  );

  // Remove configuration file
  await deleteFile('tailwind.config.js');

  // Ensure Tailwind is disabled when no configuration file is present
  await ng('build', '--configuration=development');
  await expectFileToMatch('dist/test-project/styles.css', '@tailwind base; @tailwind components;');
  await expectFileToMatch('dist/test-project/main.js', '@tailwind base; @tailwind components;');

  // Uninstall Tailwind
  await uninstallPackage('tailwindcss');
}
