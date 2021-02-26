import { createProjectFromAsset } from '../../utils/assets';
import { expectFileMatchToExist } from '../../utils/fs';
import { installWorkspacePackages } from '../../utils/packages';
import { ng, noSilentNg, silentNpm } from '../../utils/process';
import { isPrereleaseCli, useBuiltPackages, useCIChrome, useCIDefaults } from '../../utils/project';

export default async function() {
  await createProjectFromAsset('8.0-project');
  await ng('update', '@angular/cli', '--migrate-only', '--from=8');

  // Use the packages we are building in this commit, and CI Chrome.
  await useBuiltPackages();
  await useCIChrome('./');
  await useCIChrome('./e2e/');
  await useCIDefaults('eight-project');
  await installWorkspacePackages();

  // Update Angular.
  const extraUpdateArgs = await isPrereleaseCli() ? ['--next', '--force'] : [];
  await ng('update', '@angular/core', ...extraUpdateArgs);

  // Run CLI commands.
  await ng('generate', 'component', 'my-comp');
  await ng('test', '--watch=false');
  await ng('lint');
  await ng('e2e');
  await ng('e2e', '--prod');

  // Verify project now creates bundles for differential loading.
  await noSilentNg('build', '--prod');
  await expectFileMatchToExist('dist/eight-project/', /main-es5\.[0-9a-f]{20}\.js/);
  await expectFileMatchToExist('dist/eight-project/', /main-es2015\.[0-9a-f]{20}\.js/);
}
