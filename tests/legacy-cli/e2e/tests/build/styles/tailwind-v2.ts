import { deleteFile, expectFileToMatch, writeFile } from '../../../utils/fs';
import { installPackage, uninstallPackage } from '../../../utils/packages';
import { ng, silentExec } from '../../../utils/process';
import { expectToFail } from '../../../utils/utils';

export default async function () {
  // Install Tailwind
  await installPackage('tailwindcss@2');

  // Create configuration file
  await silentExec('npx', 'tailwindcss', 'init');

  // Add Tailwind directives to a component style
  await writeFile('src/app/app.component.css', '@tailwind base; @tailwind components;');

  // Add Tailwind directives to a global style
  await writeFile('src/styles.css', '@tailwind base; @tailwind components;');

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

  // Recreate configuration file
  await silentExec('npx', 'tailwindcss', 'init');

  // Uninstall Tailwind
  await uninstallPackage('tailwindcss');

  // Ensure installation warning is present
  const { stderr } = await ng('build', '--configuration=development');
  if (!stderr.includes("To enable Tailwind CSS, please install the 'tailwindcss' package.")) {
    throw new Error('Expected tailwind installation warning');
  }

  // Tailwind directives should be unprocessed with missing package
  await expectFileToMatch('dist/test-project/styles.css', '@tailwind base; @tailwind components;');
  await expectFileToMatch('dist/test-project/main.js', '@tailwind base; @tailwind components;');
}
