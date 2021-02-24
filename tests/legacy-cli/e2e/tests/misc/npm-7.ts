import { rimraf } from '../../utils/fs';
import { ng, npm } from '../../utils/process';
import { expectToFail } from '../../utils/utils';

const warningText = 'npm version 7.5.6 or higher is recommended';

export default async function() {
  // Windows CI fails with permission errors when trying to replace npm
  if (process.platform.startsWith('win')) {
    return;
  }

  const currentDirectory = process.cwd();
  try {
    // Install version >=7.5.6
    await npm('install', '--global', 'npm@>=7.5.6');

    // Ensure `ng update` does not show npm warning
    const { stderr: stderrUpdate1 } = await ng('update');
    if (stderrUpdate1.includes(warningText)) {
      throw new Error('ng update expected to not show npm version warning.');
    }

    // Install version <7.5.6
    await npm('install', '--global', 'npm@7.4.0');

    // Ensure `ng add` shows npm warning
    const { message: stderrAdd } = await expectToFail(() => ng('add'));
    if (!stderrAdd.includes(warningText)) {
      throw new Error('ng add expected to show npm version warning.');
    }

    // Ensure `ng update` shows npm warning
    const { stderr: stderrUpdate2 } = await ng('update');
    if (!stderrUpdate2.includes(warningText)) {
      throw new Error('ng update expected to show npm version warning.');
    }

    // Ensure `ng build` executes successfully
    const { stderr: stderrBuild } = await ng('build');
    if (stderrBuild.includes(warningText)) {
      throw new Error('ng build expected to not show npm version warning.');
    }

    // Ensure `ng new` shows npm warning
    // Must be outside the project for `ng new`
    process.chdir('..');
    const { message: stderrNew } = await expectToFail(() => ng('new'));
    if (!stderrNew.includes(warningText)) {
      throw new Error('ng new expected to show npm version warning.');
    }

    // Ensure `ng new --package-manager=npm` shows npm warning
    const { message: stderrNewNpm } = await expectToFail(() => ng('new', '--package-manager=npm'));
    if (!stderrNewNpm.includes(warningText)) {
      throw new Error('ng new expected to show npm version warning.');
    }

    // Ensure `ng new --skip-install` executes successfully
    const { stderr: stderrNewSkipInstall } = await ng('new', 'npm-seven-skip', '--skip-install');
    if (stderrNewSkipInstall.includes(warningText)) {
      throw new Error('ng new --skip-install expected to not show npm version warning.');
    }

    // Ensure `ng new --package-manager=yarn` executes successfully
    const { stderr: stderrNewYarn } = await ng('new', 'npm-seven-yarn', '--package-manager=yarn');
    if (stderrNewYarn.includes(warningText)) {
      throw new Error('ng new --package-manager=yarn expected to not show npm version warning.');
    }
  } finally {
    // Cleanup extra test projects
    await rimraf('npm-seven-skip');
    await rimraf('npm-seven-yarn');

    // Change directory back
    process.chdir(currentDirectory);

    // Reset version back to 6.x
    await npm('install', '--global', 'npm@6');
  }

}
