import { createProjectFromAsset } from '../../utils/assets';
import { readFile, writeFile } from '../../utils/fs';
import { getActivePackageManager } from '../../utils/packages';
import { ng } from '../../utils/process';

export default async function () {
  if (getActivePackageManager() !== 'pnpm') {
    return;
  }

  let restoreRegistry: (() => Promise<void>) | undefined;

  try {
    // Setup project from older asset using the public registry
    restoreRegistry = await createProjectFromAsset('20.0-project', true);

    // Create pnpm-workspace.yaml inside the project directory
    await writeFile('pnpm-workspace.yaml', "packages:\n  - '.'\n");

    // Run ng update on @angular/cli to trigger the update from version 20 to the next major version
    await ng('update', '@angular/cli@21', '@angular/core@21');

    // Verify that the pnpm lockfile does not contain references to the temporary package directory
    const lockfileContent = await readFile('pnpm-lock.yaml');
    if (lockfileContent.includes('angular-cli-tmp-packages-')) {
      throw new Error(
        'pnpm-lock.yaml contains reference to temporary package directory, isolation failed!',
      );
    }
  } finally {
    await restoreRegistry?.();
  }
}
