import { createProjectFromAsset } from '../../utils/assets';
import { installWorkspacePackages, setRegistry } from '../../utils/packages';
import { ng } from '../../utils/process';
import { isPrereleaseCli } from '../../utils/project';
import { expectToFail } from '../../utils/utils';

export default async function () {
  try {
    await createProjectFromAsset('9.0-project', true, true);
    await setRegistry(false);
    await installWorkspacePackages();
    await setRegistry(true);

    const extraArgs = ['--force'];
    if (isPrereleaseCli()) {
      extraArgs.push('--next');
    }

    // Update Angular from v9 to 10
    const { stdout } = await ng('update', ...extraArgs);
    if (!/@angular\/core\s+9\.\d\.\d+ -> 10\.\d\.\d+\s+ng update @angular\/core@10/.test(stdout)) {
      // @angular/core                      9.x.x -> 10.x.x         ng update @angular/core@11
      throw new Error(
        `Output didn't match "@angular/core                      9.x.x -> 10.x.x         ng update @angular/core@10". OUTPUT: \n` +
          stdout,
      );
    }

    const { message } = await expectToFail(() => ng('update', '@angular/cli', ...extraArgs));
    if (
      !message.includes(
        `Updating multiple major versions of '@angular/cli' at once is not supported`,
      )
    ) {
      throw new Error(
        `Expected error message to include "Updating multiple major versions of '@angular/cli' at once is not supported" but didn't. OUTPUT: \n` +
          message,
      );
    }
  } finally {
    await setRegistry(true);
  }
}
