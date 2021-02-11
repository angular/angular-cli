import { deleteFile, expectFileToMatch, replaceInFile, writeFile } from '../../../utils/fs';
import { installPackage, uninstallPackage } from '../../../utils/packages';
import { ng, silentExec } from '../../../utils/process';
import { updateJsonFile } from '../../../utils/project';
import { expectToFail } from '../../../utils/utils';

export default async function () {
  // Tailwind is not supported in Node.js 10
  if (process.version.startsWith('v10')) {
    return;
  }

  // Install Tailwind
  await installPackage('tailwindcss');

  // Create configuration file
  await silentExec('npx', 'tailwindcss', 'init');
  await replaceInFile('tailwind.config.js', `purge: [],`, `purge: ['./src/**/*.{html,ts}'],`);
  await updateJsonFile('angular.json', json => {
    json.projects['test-project'].architect.build.configurations.production.budgets = [
      { type: 'all', maximumError: '100mb' },
    ];
  });

  // Add Tailwind directives to a component style
  await writeFile('src/app/app.component.css', '@tailwind base; @tailwind components; @tailwind utilities');

  // Add Tailwind directives to a global style
  await writeFile('src/styles.css', '@tailwind base; @tailwind components; @tailwind utilities');

  // Build should succeed and process Tailwind directives
  await ng('build');

  // Check for Tailwind output
  await expectFileToMatch('dist/test-project/styles.css', /::placeholder/);
  await expectFileToMatch('dist/test-project/main.js', /::placeholder/);
  await expectToFail(() =>
    expectFileToMatch('dist/test-project/styles.css', '@tailwind base; @tailwind components; @tailwind utilities'),
  );
  await expectToFail(() =>
    expectFileToMatch('dist/test-project/main.js', '@tailwind base; @tailwind components; @tailwind utilities'),
  );

  
  await writeFile('src/app/app.component.html', '<div class="py-2 px-4 rounded-md bg-red-400">Test</div>');
  await ng('build', '--prod', '--output-hashing=none');
  await expectFileToMatch('dist/test-project/styles.css', /\.rounded-md/);
  await expectFileToMatch('dist/test-project/main.js', /\.rounded-md/);
  await expectToFail(() =>
    expectFileToMatch('dist/test-project/styles.css', /\.py-3/),
  );
  await expectToFail(() =>
    expectFileToMatch('dist/test-project/main.js', /\.py-3/),
  );
  await replaceInFile('tailwind.config.js', `purge: ['./src/**/*.{html,ts}'],`, `purge: {
    content: [
      './src/**/*.{html,ts}',
    ]
  },`);
  await ng('build', '--prod', '--output-hashing=none');
  await expectFileToMatch('dist/test-project/styles.css', /\.rounded-md/);
  await expectFileToMatch('dist/test-project/main.js', /\.rounded-md/);
  await expectToFail(() =>
    expectFileToMatch('dist/test-project/styles.css', /\.py-3/),
  );
  await expectToFail(() =>
    expectFileToMatch('dist/test-project/main.js', /\.py-3/),
  );
  
  await replaceInFile('tailwind.config.js', `purge: {`, `purge: { enabled: false,`);
  await ng('build', '--prod', '--output-hashing=none');
  expectFileToMatch('dist/test-project/styles.css', /\.py-3/),
  expectFileToMatch('dist/test-project/main.js', /\.py-3/),
  await replaceInFile('tailwind.config.js', `purge: { enabled: false,`, `purge: { enabled: true,`);
  await ng('build');
  await expectToFail(() =>
    expectFileToMatch('dist/test-project/styles.css', /\.py-3/),
  );
  await expectToFail(() =>
    expectFileToMatch('dist/test-project/main.js', /\.py-3/),
  );
  

  await writeFile('tailwind.config.js', 'module.exports = () => {}');
  const { stderr: _err } = await ng('build');
  if (!_err.includes("file export function instead of object")) {
    throw new Error('Expected tailwind config error');
  }


  // Remove configuration file
  await deleteFile('tailwind.config.js');

  // Ensure Tailwind is disabled when no configuration file is present
  await ng('build');
  await expectFileToMatch('dist/test-project/styles.css', '@tailwind base; @tailwind components; @tailwind utilities');
  await expectFileToMatch('dist/test-project/main.js', '@tailwind base; @tailwind components; @tailwind utilities');

  // Recreate configuration file
  await silentExec('npx', 'tailwindcss', 'init');

  // Uninstall Tailwind
  await uninstallPackage('tailwindcss');

  // Ensure installation warning is present
  const { stderr } = await ng('build');
  if (!stderr.includes("To enable Tailwind CSS, please install the 'tailwindcss' package.")) {
    throw new Error('Expected tailwind installation warning');
  }

  // Tailwind directives should be unprocessed with missing package
  await expectFileToMatch('dist/test-project/styles.css', '@tailwind base; @tailwind components; @tailwind utilities');
  await expectFileToMatch('dist/test-project/main.js', '@tailwind base; @tailwind components; @tailwind utilities');
}
