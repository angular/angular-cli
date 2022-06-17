import { getGlobalVariable } from '../../utils/env';
import { expectFileToMatch } from '../../utils/fs';
import { silentNg } from '../../utils/process';

export default async function () {
  // Development build
  await silentNg('run', 'test-project:build:development');
  await expectFileToMatch('dist/test-project/index.html', 'main.js');

  // Production build
  await silentNg('run', 'test-project:build');
  if (getGlobalVariable('argv')['esbuild']) {
    // esbuild uses an 8 character hash
    await expectFileToMatch('dist/test-project/index.html', /main\.[a-zA-Z0-9]{8}\.js/);
  } else {
    await expectFileToMatch('dist/test-project/index.html', /main\.[a-zA-Z0-9]{16}\.js/);
  }
}
