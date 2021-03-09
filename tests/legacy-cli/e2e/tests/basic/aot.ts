import { getGlobalVariable } from '../../utils/env';
import { expectFileToMatch } from '../../utils/fs';
import { ng } from '../../utils/process';

export default async function () {
  await ng('build', '--aot=true', '--configuration=development');

  if (getGlobalVariable('argv')['ve']) {
    await expectFileToMatch('dist/test-project/main.js',
      /platformBrowser.*bootstrapModuleFactory.*AppModuleNgFactory/);
  } else {
    await expectFileToMatch('dist/test-project/main.js',
      /platformBrowser.*bootstrapModule.*AppModule/);
  }
}
