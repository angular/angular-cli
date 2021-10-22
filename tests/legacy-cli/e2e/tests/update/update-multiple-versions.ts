import { createProjectFromAsset } from '../../utils/assets';
import { installWorkspacePackages, setRegistry } from '../../utils/packages';
import { ng } from '../../utils/process';
import { isPrereleaseCli } from '../../utils/project';
import { expectToFail } from '../../utils/utils';

export default async function () {
  try {
    await createProjectFromAsset('8.0-project', true, true);
    await setRegistry(false);
    await installWorkspacePackages();

    await setRegistry(true);
    const extraArgs = ['--force'];
    if (isPrereleaseCli()) {
      extraArgs.push('--next');
    }

    const { message } = await expectToFail(() =>
      ng('update', '@angular/cli', '--force', ...extraArgs),
    );
    if (
      !message.includes(
        `Updating multiple major versions of '@angular/cli' at once is not supported`,
      )
    ) {
      console.error(message);
      throw new Error(
        `Expected error message to include "Updating multiple major versions of '@angular/cli' at once is not supported" but didn't.`,
      );
    }
  } finally {
    await setRegistry(true);
  }
}
