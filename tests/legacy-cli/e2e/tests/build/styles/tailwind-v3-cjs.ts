import { expectFileToMatch, moveFile, writeFile } from '../../../utils/fs';
import { installPackage } from '../../../utils/packages';
import { ng, silentExec } from '../../../utils/process';
import { updateJsonFile } from '../../../utils/project';
import { expectToFail } from '../../../utils/utils';

export default async function () {
  // Temporarily turn off caching until the build cache accounts for the presence of tailwind
  // and its configuration file. Otherwise cached builds without tailwind will cause test failures.
  await ng('cache', 'off');

  // Add type module in package.json.
  await updateJsonFile('package.json', (json) => {
    json['type'] = 'module';
  });

  // Install Tailwind
  await installPackage('tailwindcss@3');

  // Create configuration file
  await silentExec('npx', 'tailwindcss', 'init');

  // tailwind doesn't create the config file with a cjs extension.
  // We need to rename it manually until
  // https://github.com/tailwindlabs/tailwindcss/commit/6c63f67d20c433b5c7281e9e26744038ed41ccc2 is released.
  await moveFile('tailwind.config.js', 'tailwind.config.cjs');

  // Add Tailwind directives to a global style
  await writeFile('src/styles.css', '@tailwind base; @tailwind components;');

  // Build should succeed and process Tailwind directives
  await ng('build', '--configuration=development');

  // Check for Tailwind output
  await expectFileToMatch('dist/test-project/styles.css', /::placeholder/);
  await expectToFail(() =>
    expectFileToMatch('dist/test-project/styles.css', '@tailwind base; @tailwind components;'),
  );
}
