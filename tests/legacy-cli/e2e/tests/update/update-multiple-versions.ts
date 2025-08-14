import { createProjectFromAsset } from '../../utils/assets';
import { setRegistry } from '../../utils/packages';
import { ng } from '../../utils/process';
import { isPrereleaseCli } from '../../utils/project';
import { expectToFail } from '../../utils/utils';

export default async function () {
  let restoreRegistry: (() => Promise<void>) | undefined;
  try {
    restoreRegistry = await createProjectFromAsset('18.0-project', true);
    await setRegistry(true);

    const extraArgs = ['--force'];
    if (isPrereleaseCli()) {
      extraArgs.push('--next');
    }

    // TODO(alanagius): investigate how to re-enable this. This is failing but it's correct since we are using the public registry.
    // Update Angular from v13 to 14
    // const { stdout } = await ng('update', ...extraArgs);
    // if (!/@angular\/core\s+13\.\d\.\d+ -> 14\.\d\.\d+\s+ng update @angular\/core@14/.test(stdout)) {
    //   // @angular/core                      13.x.x -> 14.x.x         ng update @angular/core@14
    //   throw new Error(
    //     `Output didn't match "@angular/core                      13.x.x -> 14.x.x         ng update @angular/core@14". OUTPUT: \n` +
    //       stdout,
    //   );
    // }

    const { message } = await expectToFail(() => ng('update', '@angular/core', ...extraArgs));
    if (
      !message.includes(
        `Updating multiple major versions of '@angular/core' at once is not supported`,
      )
    ) {
      throw new Error(
        `Expected error message to include "Updating multiple major versions of '@angular/core' at once is not supported" but didn't. OUTPUT: \n` +
          message,
      );
    }
  } finally {
    await restoreRegistry?.();
  }
}
