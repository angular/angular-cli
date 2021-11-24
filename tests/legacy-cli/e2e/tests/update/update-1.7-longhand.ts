import { createProjectFromAsset } from '../../utils/assets';
import { ng, silentNpm } from '../../utils/process';
import { isPrereleaseCli, useBuiltPackages } from '../../utils/project';
import { expectToFail } from '../../utils/utils';

export default async function() {
  return;

  const extraUpdateArgs = (await isPrereleaseCli()) ? ['--next', '--force'] : [];

  await createProjectFromAsset('1.7-project', true);

  await expectToFail(() => ng('build'));
  await ng('update', '@angular/cli@8', '--migrate-only', '--from=1.7.1');
  await useBuiltPackages();
  await silentNpm('install');
  await ng('update', '@angular/core@10', ...extraUpdateArgs);
  await ng('build');
}
