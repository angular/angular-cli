import { createProjectFromAsset } from '../../utils/assets';
import { setRegistry } from '../../utils/packages';
import { ng } from '../../utils/process';
import { isPrereleaseCli } from '../../utils/project';
import { expectToFail } from '../../utils/utils';

export default async function () {
  let restoreRegistry: (() => Promise<void>) | undefined;
  try {
    restoreRegistry = await createProjectFromAsset('12.0-project', true);
    await setRegistry(true);

    const extraArgs = ['--force'];
    if (isPrereleaseCli()) {
      extraArgs.push('--next');
    }

    // Update Angular from v12 to 13
    const { stdout } = await ng('update', ...extraArgs);
    if (!/@angular\/core\s+12\.\d\.\d+ -> 13\.\d\.\d+\s+ng update @angular\/core@13/.test(stdout)) {
      // @angular/core                      12.x.x -> 13.x.x         ng update @angular/core@13
      throw new Error(
        `Output didn't match "@angular/core                      12.x.x -> 13.x.x         ng update @angular/core@13". OUTPUT: \n` +
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
    await restoreRegistry?.();
  }
}
