import { createProjectFromAsset } from '../../utils/assets';
import { ng, silentYarn } from '../../utils/process';
import { isPrereleaseCli, useBuiltPackages, useCIChrome, useCIDefaults } from '../../utils/project';
import { expectToFail } from '../../utils/utils';

export default async function() {
  process.env['NPM_CONFIG_REGISTRY'] = 'http://localhost:4873';

  const extraUpdateArgs = (await isPrereleaseCli()) ? ['--next', '--force'] : [];

  const dir = await createProjectFromAsset('1.0-yarn-workspace-project', false, true);
  process.chdir(`${dir}/packages/app`);
  await useBuiltPackages();

  process.chdir(dir);
  await silentYarn('install');
  process.chdir(`${dir}/packages/app`);

  await useCIChrome('.');
  await expectToFail(() => ng('build'));
  await ng('update', '@angular/cli');
  await useBuiltPackages();

  process.chdir(dir);
  await silentYarn('install');
  process.chdir(`${dir}/packages/app`);

  await ng('update', '@angular/core', ...extraUpdateArgs);
  await useCIDefaults('one-oh-project');
  await ng('generate', 'component', 'my-comp');
  await ng('test', '--watch=false');
  await ng('lint');
  await ng('build');
  await ng('build', '--prod');
  await ng('e2e');
}
