import { deleteFile, expectFileToMatch, writeFile } from '../../../utils/fs';
import { installPackage, uninstallPackage } from '../../../utils/packages';
import { ng, silentExec } from '../../../utils/process';
import { expectToFail } from '../../../utils/utils';

export default async function () {
  // Temporarily turn off caching until the build cache accounts for the presence of tailwind
  // and its configuration file. Otherwise cached builds without tailwind will cause test failures.
  await ng('cache', 'off');

  // Create configuration file
  await silentExec('npx', 'tailwindcss@2', 'init');

  // Add Tailwind directives to a component style
  await writeFile('src/app/app.css', '@tailwind base; @tailwind components;');

  // Add Tailwind directives to a global style
  await writeFile('src/styles.css', '@tailwind base; @tailwind components;');

  // Ensure installation warning is present
  const { stderr } = await ng('build', '--configuration=development');
  if (!stderr.includes("To enable Tailwind CSS, please install the 'tailwindcss' package.")) {
    throw new Error(`Expected tailwind installation warning. STDERR:\n${stderr}`);
  }

  // Tailwind directives should be unprocessed with missing package
  await expectFileToMatch(
    'dist/test-project/browser/styles.css',
    /@tailwind base;\s+@tailwind components;/,
  );
  await expectFileToMatch(
    'dist/test-project/browser/main.js',
    /@tailwind base;(?:\\n|\s*)@tailwind components;/,
  );

  // Install Tailwind
  await installPackage('tailwindcss@2');

  // Build should succeed and process Tailwind directives
  await ng('build', '--configuration=development');

  // Check for Tailwind output
  await expectFileToMatch('dist/test-project/browser/styles.css', /::placeholder/);
  await expectFileToMatch('dist/test-project/browser/main.js', /::placeholder/);
  await expectToFail(() =>
    expectFileToMatch(
      'dist/test-project/browser/styles.css',
      /@tailwind base;\s+@tailwind components;/,
    ),
  );
  await expectToFail(() =>
    expectFileToMatch(
      'dist/test-project/browser/main.js',
      /@tailwind base;(?:\\n|\s*)@tailwind components;/,
    ),
  );

  // Remove configuration file
  await deleteFile('tailwind.config.js');

  // Ensure Tailwind is disabled when no configuration file is present
  await ng('build', '--configuration=development');
  await expectFileToMatch(
    'dist/test-project/browser/styles.css',
    /@tailwind base;\s+@tailwind components;/,
  );
  await expectFileToMatch(
    'dist/test-project/browser/main.js',
    /@tailwind base;(?:\\n|\s*)@tailwind components;/,
  );

  // Uninstall Tailwind
  await uninstallPackage('tailwindcss');
}
