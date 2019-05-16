import { expectFileToMatch } from '../../utils/fs';
import { ng } from '../../utils/process';

export default async function () {
  await ng('build', '--aot=true');
  await expectFileToMatch('dist/test-project/main-es5.js',
    /platformBrowser.*bootstrapModuleFactory.*AppModuleNgFactory/);
  await expectFileToMatch('dist/test-project/main-es2015.js',
    /platformBrowser.*bootstrapModuleFactory.*AppModuleNgFactory/);
}
