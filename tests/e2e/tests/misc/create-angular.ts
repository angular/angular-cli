import { equal } from 'node:assert';
import { join, resolve } from 'node:path';
import { expectFileToExist, readFile, rimraf } from '../../utils/fs';
import { getActivePackageManager } from '../../utils/packages';
import { silentBun, silentNpm, silentPnpm, silentYarn } from '../../utils/process';

export default async function () {
  const currentDirectory = process.cwd();
  const newDirectory = resolve('../');
  const projectName = 'test-project-create';

  try {
    process.chdir(newDirectory);
    const packageManager = getActivePackageManager();

    switch (packageManager) {
      case 'npm':
        await silentNpm('init', '@angular', projectName, '--', '--style=scss');

        break;
      case 'yarn':
        await silentYarn('create', '@angular', projectName, '--style=scss');

        break;
      case 'bun':
        await silentBun('create', '@angular', projectName, '--style=scss');

        break;
      case 'pnpm':
        await silentPnpm('create', '@angular', projectName, '--style=scss');

        break;
      default:
        throw new Error(`This test is not configured to use ${packageManager}.`);
    }

    // Check that package manager has been configured based on the package manager used to invoke the create command.
    const workspace = JSON.parse(await readFile(join(projectName, 'angular.json')));
    equal(
      workspace.cli?.packageManager,
      packageManager,
      `Expected 'packageManager' option to be configured to ${packageManager}.`,
    );

    // Verify styles was create with correct extension.
    await expectFileToExist(join(projectName, 'src/styles.scss'));
  } finally {
    await rimraf(projectName);
    // Change directory back
    process.chdir(currentDirectory);
  }
}
