import * as fs from 'fs';
import { createProjectFromAsset } from '../../utils/assets';
import { ng, silentNpm } from '../../utils/process';
import { isPrereleaseCli, useBuiltPackages, useCIChrome, useCIDefaults } from '../../utils/project';
import { expectToFail } from '../../utils/utils';

export default async function() {
  const extraUpdateArgs = (await isPrereleaseCli()) ? ['--next', '--force'] : [];

  await createProjectFromAsset('1.7-project');
  fs.writeFileSync('.npmrc', 'registry = http://localhost:4873', 'utf8');

  await useCIChrome('.');
  await expectToFail(() => ng('build'));
  // Turn off git commits ('-C') per migration to avoid breaking E2E cleanup process
  await ng('update', '@angular/cli', '-C');
  await useBuiltPackages();
  await silentNpm('install');
  await ng('update', '@angular/core', ...extraUpdateArgs);
  await useCIDefaults('latest-project');
  await ng('generate', 'component', 'my-comp');
  await ng('test', '--watch=false');
  await ng('lint');
  await ng('build', '--prod');
  await ng('e2e');
}
