import { getGlobalVariable } from '../../utils/env';
import { expectFileToMatch } from '../../utils/fs';
import { ng } from '../../utils/process';

export default async function () {
  // Development build
  const { stdout } = await ng('build', '--configuration=development');
  await expectFileToMatch('dist/test-project/index.html', 'main.js');

  if (stdout.includes('Estimated Transfer Size')) {
    throw new Error(
      `Expected stdout not to contain 'Estimated Transfer Size' but it did.\n${stdout}`,
    );
  }

  // Production build
  await ng('build');
  if (getGlobalVariable('argv')['esbuild']) {
    // esbuild uses an 8 character hash
    await expectFileToMatch('dist/test-project/index.html', /main\.[a-zA-Z0-9]{8}\.js/);
  } else {
    await expectFileToMatch('dist/test-project/index.html', /main\.[a-zA-Z0-9]{16}\.js/);
  }
}
