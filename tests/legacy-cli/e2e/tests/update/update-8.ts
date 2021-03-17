import { createProjectFromAsset } from '../../utils/assets';
import { getGlobalVariable } from '../../utils/env';
import { expectFileMatchToExist, rimraf, writeFile } from '../../utils/fs';
import { installWorkspacePackages, setRegistry } from '../../utils/packages';
import { ng, noSilentNg } from '../../utils/process';
import { isPrereleaseCli, useBuiltPackages, useCIChrome, useCIDefaults } from '../../utils/project';

export default async function () {
  await createProjectFromAsset('8.0-project', true, true);

  // We need to use the public registry because in the local NPM server we don't have
  // older versions @angular/cli packages which would cause `npm install` during `ng update` to fail.
  try {
    await setRegistry(false);

    await useBuiltPackages();
    await installWorkspacePackages();

    // Update Angular CLI.
    await ng('update', '@angular/cli', '--migrate-only', '--from=8');
  } finally {
    await setRegistry(true);
  }

  if (!getGlobalVariable('ci')) {
    const testRegistry = getGlobalVariable('package-registry');
    await writeFile('.npmrc', `registry=${testRegistry}`);
  }

  // Update Angular.
  const extraUpdateArgs = await isPrereleaseCli() ? ['--next', '--force'] : [];
  await ng('update', '@angular/core', ...extraUpdateArgs);

  // Use the packages we are building in this commit, and CI Chrome.
  await useBuiltPackages();
  await useCIChrome('./');
  await useCIChrome('./e2e/');
  await useCIDefaults('eight-project');

  // This is needed as otherwise causes local modules not to override already present modules
  await rimraf('node_modules/@angular-devkit');
  await rimraf('node_modules/@angular/cli');

  await installWorkspacePackages();

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
