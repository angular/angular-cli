import { readdirSync } from 'fs';
import { join } from 'path';
import { getGlobalVariable } from '../../utils/env';
import { expectFileToExist, expectFileToMatch } from '../../utils/fs';
import { expectGitToBeClean } from '../../utils/git';
import { ng } from '../../utils/process';


export default async function () {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  // Can't use the `ng` helper because somewhere the environment gets
  // stuck to the first build done
  const argv = getGlobalVariable('argv');
  const ivyProject = argv['ivy'];
  const bootstrapRegExp = ivyProject
    ? /bootstrapModule\([a-zA-Z]+\)\./
    : /bootstrapModuleFactory\([a-zA-Z]+\)\./;

  await ng('build', '--prod');
  await expectFileToExist(join(process.cwd(), 'dist'));
  // Check for cache busting hash script src
  await expectFileToMatch('dist/test-project/index.html', /main-es5\.[0-9a-f]{20}\.js/);
  await expectFileToMatch('dist/test-project/index.html', /main-es2015\.[0-9a-f]{20}\.js/);
  await expectFileToMatch('dist/test-project/index.html', /styles\.[0-9a-f]{20}\.css/);
  await expectFileToMatch('dist/test-project/3rdpartylicenses.txt', /MIT/);

  const dirContents = readdirSync('./dist/test-project');
  const mainES5 = dirContents.find(name => /main-es5.[a-z0-9]+\.js/.test(name));
  await expectFileToMatch(`dist/test-project/${mainES5}`, bootstrapRegExp);

  const mainES2015 = dirContents.find(name => /main-es2015.[a-z0-9]+\.js/.test(name));
  await expectFileToMatch(`dist/test-project/${mainES2015}`, bootstrapRegExp);

  // Check that the process didn't change local files.
  await expectGitToBeClean();
}
