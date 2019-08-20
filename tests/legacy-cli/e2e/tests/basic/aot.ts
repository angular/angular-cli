import { getGlobalVariable } from '../../utils/env';
import { expectFileToMatch } from '../../utils/fs';
import { ng } from '../../utils/process';

export default async function () {
  await ng('build', '--aot=true');

  if (getGlobalVariable('argv')['ve']) {
    await expectFileToMatch('dist/test-project/main-es5.js',
      /platformBrowser.*bootstrapModuleFactory.*AppModuleNgFactory/);
    await expectFileToMatch('dist/test-project/main-es2015.js',
      /platformBrowser.*bootstrapModuleFactory.*AppModuleNgFactory/);
  } else {
    await expectFileToMatch('dist/test-project/main-es5.js',
      /platformBrowser.*bootstrapModule.*AppModule/);
    await expectFileToMatch('dist/test-project/main-es2015.js',
      /platformBrowser.*bootstrapModule.*AppModule/);
  }
}
