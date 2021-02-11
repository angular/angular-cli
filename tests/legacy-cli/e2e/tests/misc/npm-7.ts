import { rimraf, writeFile } from '../../utils/fs';
import { getActivePackageManager } from '../../utils/packages';
import { ng, npm } from '../../utils/process';
import { expectToFail } from '../../utils/utils';

const errorText = 'The Angular CLI temporarily requires npm version 6';

export default async function() {
  // Only relevant with npm as a package manager
  if (getActivePackageManager() !== 'npm') {
    return;
  }

  // Windows CI fails with permission errors when trying to replace npm
  if (process.platform.startsWith('win')) {
    return;
  }

  const currentDirectory = process.cwd();
  try {
    // Install version 7.x
    await npm('install', '--global', 'npm@7');

    // Ensure `ng add` exits and shows npm error
    const { message: stderrAdd } = await expectToFail(() => ng('add'));
    if (!stderrAdd.includes(errorText)) {
      throw new Error('ng add expected to show npm version error.');
    }

    // Ensure `ng update` exits and shows npm error
    const { message: stderrUpdate } = await expectToFail(() => ng('update'));
    if (!stderrUpdate.includes(errorText)) {
      throw new Error('ng update expected to show npm version error.');
    }

    // Ensure `ng build` executes successfully
    const { stderr: stderrBuild } = await ng('build');
    if (stderrBuild.includes(errorText)) {
      throw new Error('ng build expected to not show npm version error.');
    }

    // Ensure `ng new` exits and shows npm error
    // Must be outside the project for `ng new`
    process.chdir('..');
    const { message: stderrNew } = await expectToFail(() => ng('new'));
    if (!stderrNew.includes(errorText)) {
      throw new Error('ng new expected to show npm version error.');
    }

    // Ensure `ng new --package-manager=npm` exits and shows npm error
    const { message: stderrNewNpm } = await expectToFail(() => ng('new', '--package-manager=npm'));
    if (!stderrNewNpm.includes(errorText)) {
      throw new Error('ng new expected to show npm version error.');
    }

    // Ensure `ng new --skip-install` executes successfully
    const { stderr: stderrNewSkipInstall } = await ng('new', 'npm-seven-skip', '--skip-install');
    if (stderrNewSkipInstall.includes(errorText)) {
      throw new Error('ng new --skip-install expected to not show npm version error.');
    }

    // Ensure `ng new --package-manager=yarn` executes successfully
    // Need an additional npmrc file since yarn does not use the NPM registry environment variable
    await writeFile('.npmrc', 'registry=http://localhost:4873')
    const { stderr: stderrNewYarn } = await ng('new', 'npm-seven-yarn', '--package-manager=yarn');
    if (stderrNewYarn.includes(errorText)) {
      throw new Error('ng new --package-manager=yarn expected to not show npm version error.');
    }
  } finally {
    // Cleanup extra test projects
    await rimraf('npm-seven-skip');
    await rimraf('npm-seven-yarn');
    await rimraf('.npmrc');

    // Change directory back
    process.chdir(currentDirectory);

    // Reset version back to 6.x
    await npm('install', '--global', 'npm@6');
  }

}
